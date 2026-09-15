from dataclasses import dataclass


@dataclass(frozen=True)
class Partner:
    id: int
    name: str
    slogan: str | None
    description: str
    logo_url: str
    link: str | None
    sort_order: int
