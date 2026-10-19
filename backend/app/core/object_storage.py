"""Subida a Firebase Storage con URL de descarga que no caduca.

La ruta del objeto siempre incluye el id de la base y un timestamp UTC:

    {prefix}/{modulo}/{db_id}/{tipo}/{timestamp}_{uuid}.ext

La URL guardada en la base es la de descarga de Firebase, con un token fijo
en los metadatos del objeto. No es una URL firmada: no lleva fecha de
vencimiento y se abre directo, sin volver a pedirle nada al API.
"""

from datetime import UTC, datetime
from json import loads
from os import getenv
from pathlib import Path
from urllib.parse import quote, unquote, urlparse
from uuid import uuid4

import httpx

from app.core import config  # noqa: F401  carga backend/.env antes de leer FIREBASE_*


MEDIA_ROOTS: tuple[tuple[str, str], ...] = (
    ("/media/notices/", "storage/notices"),
    ("/media/member-documents/", "storage/member-documents"),
    ("/media/members/", "storage/members"),
    ("/media/membership/", "storage/membership"),
    ("/media/blogs/", "storage/blogs"),
    ("/media/payments/", "storage/payments"),
    ("/media/votaciones/", "storage/votaciones"),
    ("/media/agreements/", "storage/agreements"),
)

_USER_AGENT = "COPSSTEC"


def firebase_bucket() -> str:
    return getenv("FIREBASE_STORAGE_BUCKET", "").strip()


def firebase_enabled() -> bool:
    return bool(firebase_bucket())


def firebase_prefix() -> str:
    explicit = getenv("FIREBASE_STORAGE_PREFIX", "").strip().strip("/")
    if explicit:
        return explicit
    app_env = getenv("APP_ENV", "local").strip().lower()
    if app_env in {"production", "prod"}:
        return "prod"
    return "dev"


def is_remote_url(value: str | None) -> bool:
    text = (value or "").strip()
    return text.startswith("https://") or text.startswith("http://")


def build_object_name(
    *,
    module: str,
    db_id: object,
    kind: str,
    filename: str,
    prefix: str | None = None,
    uploaded_at: datetime | None = None,
    object_id: str | None = None,
) -> tuple[str, str]:
    moment = uploaded_at or datetime.now(UTC)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    stamp = moment.astimezone(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    suffix = _suffix(filename)
    token = object_id or uuid4().hex
    root = (prefix if prefix is not None else firebase_prefix()).strip("/")
    object_name = (
        f"{root}/{_segment(module)}/{_segment(db_id)}/{_segment(kind)}/{stamp}_{token}{suffix}"
    )
    return object_name, stamp


def permanent_download_url(bucket: str, object_name: str, token: str) -> str:
    encoded = quote(object_name, safe="")
    return (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded}"
        f"?alt=media&token={token}"
    )


def save_object(
    *,
    module: str,
    db_id: object,
    kind: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> str:
    bucket_name = firebase_bucket()
    if not bucket_name:
        raise RuntimeError("FIREBASE_STORAGE_BUCKET no está configurado.")

    object_name, stamp = build_object_name(
        module=module,
        db_id=db_id,
        kind=kind,
        filename=filename,
    )
    download_token = uuid4().hex
    blob = _storage_client().bucket(bucket_name).blob(object_name)
    blob.metadata = {
        "firebaseStorageDownloadTokens": download_token,
        "dbId": str(db_id),
        "uploadedAt": stamp,
    }
    blob.upload_from_string(content, content_type=content_type or "application/octet-stream")
    return permanent_download_url(bucket_name, object_name, download_token)


def read_bytes(stored: str | None) -> bytes | None:
    value = (stored or "").strip()
    if not value:
        return None
    if is_remote_url(value):
        return _download_url(value)
    path = locate_local_file(value)
    if path is None:
        return None
    return path.read_bytes()


def open_download(stored: str | None) -> str | Path | None:
    """URL permanente o ruta local existente. None si el archivo local no está."""
    value = (stored or "").strip()
    if not value:
        return None
    if is_remote_url(value):
        return value
    return locate_local_file(value)


def read_latest_text(*, module: str, db_id: object, kind: str) -> str | None:
    blob = _latest_blob(module=module, db_id=db_id, kind=kind)
    if blob is None:
        return None
    return blob.download_as_bytes().decode("utf-8")


def read_latest_json(*, module: str, db_id: object, kind: str) -> dict | None:
    raw = read_latest_text(module=module, db_id=db_id, kind=kind)
    if not raw:
        return None
    try:
        data = loads(raw)
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def has_objects(*, module: str, db_id: object, kind: str) -> bool:
    bucket_name = firebase_bucket()
    if not bucket_name:
        return False
    prefix = _kind_prefix(module=module, db_id=db_id, kind=kind)
    blobs = _storage_client().bucket(bucket_name).list_blobs(prefix=prefix, max_results=1)
    return next(iter(blobs), None) is not None


def remote_content_length(url: str) -> int | None:
    try:
        response = httpx.head(url, headers={"User-Agent": _USER_AGENT}, timeout=8, follow_redirects=True)
    except httpx.HTTPError:
        return None
    if response.status_code != 200:
        return None
    raw = response.headers.get("Content-Length")
    if raw is None:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def stored_filename(stored: str, fallback: str) -> str:
    value = (stored or "").strip()
    if is_remote_url(value):
        path = unquote(urlparse(value).path)
        name = Path(path).name
        if name and name not in {"o", "alt"}:
            return name
        return fallback
    name = Path(value).name
    return name or fallback


def locate_local_file(stored: str) -> Path | None:
    value = (stored or "").strip()
    if not value or is_remote_url(value) or ".." in Path(value).parts:
        return None

    direct = Path(value)
    if direct.is_file():
        return direct

    for prefix, root in MEDIA_ROOTS:
        if not value.startswith(prefix):
            continue
        relative = value[len(prefix) :]
        if not relative or ".." in Path(relative).parts:
            return None
        candidate = Path(root) / relative
        return candidate if candidate.is_file() else None
    return None


def _latest_blob(*, module: str, db_id: object, kind: str):
    bucket_name = firebase_bucket()
    if not bucket_name:
        return None
    prefix = _kind_prefix(module=module, db_id=db_id, kind=kind)
    blobs = list(_storage_client().bucket(bucket_name).list_blobs(prefix=prefix))
    if not blobs:
        return None
    return max(blobs, key=lambda item: item.name)


def _kind_prefix(*, module: str, db_id: object, kind: str) -> str:
    return f"{firebase_prefix()}/{_segment(module)}/{_segment(db_id)}/{_segment(kind)}/"


def _storage_client():
    from google.cloud import storage
    from google.oauth2 import service_account

    raw = getenv("FIREBASE_CREDENTIALS_JSON", "").strip()
    if raw:
        info = loads(raw)
        credentials = service_account.Credentials.from_service_account_info(info)
        return storage.Client(project=info.get("project_id"), credentials=credentials)

    path = getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if path:
        return storage.Client.from_service_account_json(path)
    return storage.Client()


def download_remote(url: str) -> tuple[bytes, str] | None:
    try:
        response = httpx.get(url, headers={"User-Agent": _USER_AGENT}, timeout=20, follow_redirects=True)
    except httpx.HTTPError:
        return None
    if response.status_code != 200:
        return None
    content_type = (response.headers.get("Content-Type") or "").split(";")[0].strip()
    return response.content, content_type


def _download_url(url: str) -> bytes | None:
    downloaded = download_remote(url)
    return downloaded[0] if downloaded else None


def _segment(value: object) -> str:
    cleaned = "".join(
        character if character.isalnum() or character in "-_" else "-"
        for character in str(value).strip()
    )
    cleaned = cleaned.strip("-") or "item"
    return cleaned[:120]


def _suffix(filename: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    body = suffix[1:]
    if suffix and len(suffix) <= 8 and body.isalnum():
        return suffix
    return ""
