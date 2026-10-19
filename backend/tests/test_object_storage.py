from datetime import UTC, datetime
from pathlib import Path

from app.core.object_storage import (
    build_object_name,
    firebase_enabled,
    is_remote_url,
    locate_local_file,
    open_download,
    permanent_download_url,
    stored_filename,
)
from app.modules.membership.infrastructure.files import LocalMembershipFileStorage


def test_object_name_includes_db_id_and_timestamp() -> None:
    moment = datetime(2026, 10, 19, 18, 30, 45, 123456, tzinfo=UTC)
    name, stamp = build_object_name(
        module="membership",
        db_id=42,
        kind="photos",
        filename="cara.jpg",
        prefix="dev",
        uploaded_at=moment,
        object_id="abc123",
    )

    assert stamp == "20261019T183045123456Z"
    assert name == "dev/membership/42/photos/20261019T183045123456Z_abc123.jpg"


def test_permanent_download_url_does_not_expire() -> None:
    url = permanent_download_url(
        "copsstec.appspot.com",
        "dev/membership/42/photos/20261019T183045123456Z_abc123.jpg",
        "tok-fijo",
    )

    assert url.startswith("https://firebasestorage.googleapis.com/v0/b/copsstec.appspot.com/o/")
    assert "dev%2Fmembership%2F42%2Fphotos%2F" in url
    assert "alt=media" in url
    assert "token=tok-fijo" in url
    assert "X-Goog-Expires" not in url
    assert "Expires=" not in url
    assert stored_filename(url, "adjunto") == "20261019T183045123456Z_abc123.jpg"


def test_without_bucket_uploads_stay_on_disk(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("FIREBASE_STORAGE_BUCKET", raising=False)

    assert firebase_enabled() is False
    saved = LocalMembershipFileStorage(str(tmp_path)).save_photo(
        7,
        "foto.jpg",
        b"\xff\xd8\xff" + b"x" * 20,
        "image/jpeg",
    )

    assert saved.startswith("/media/membership/7/photos/")
    assert saved.endswith(".jpg")
    assert list(tmp_path.rglob("*.jpg"))
    assert is_remote_url(saved) is False


def test_open_download_returns_remote_url_and_local_file(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    media = tmp_path / "storage" / "payments" / "9"
    media.mkdir(parents=True)
    voucher = media / "comprobante.png"
    voucher.write_bytes(b"png")
    stored = "/media/payments/9/comprobante.png"
    remote = "https://firebasestorage.googleapis.com/v0/b/bucket/o/file.png?alt=media&token=abc"

    located = locate_local_file(stored)
    assert located is not None
    assert located.resolve() == voucher.resolve()
    opened = open_download(stored)
    assert isinstance(opened, Path)
    assert opened.resolve() == voucher.resolve()
    assert open_download(remote) == remote
    assert locate_local_file(remote) is None
