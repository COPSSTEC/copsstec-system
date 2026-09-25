from dataclasses import dataclass
from datetime import datetime


DOCUMENT_CATALOG: dict[str, str] = {
    "member_guide": "Manual de miembros",
    "statutes": "Estatutos",
    "safety_talks": "Charlas de seguridad",
    "brand_manual": "Manual de marca",
    "board_resolutions": "Resoluciones del directorio",
}

DOCUMENT_KEYS = tuple(DOCUMENT_CATALOG.keys())


@dataclass(frozen=True)
class MemberDocument:
    id: int
    document_key: str
    title: str
    file_path: str | None
    original_filename: str | None
    cover_path: str | None
    updated_by: int | None
    created_at: datetime | None
    updated_at: datetime | None

    @property
    def available(self) -> bool:
        return bool(self.file_path)
