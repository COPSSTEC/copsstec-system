from pathlib import Path

from fastapi import HTTPException, status
from fastapi.responses import Response

from app.core.object_storage import download_remote

_SUFFIX_TYPES = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def remote_file_response(
    url: str,
    filename: str,
    *,
    inline: bool = True,
    missing_detail: str = "Documento no encontrado.",
) -> Response:
    downloaded = download_remote(url)
    if downloaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=missing_detail)
    content, remote_type = downloaded
    media_type = _SUFFIX_TYPES.get(Path(filename).suffix.lower()) or remote_type or "application/octet-stream"
    disposition = "inline" if inline else "attachment"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'},
    )
