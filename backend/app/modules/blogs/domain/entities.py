from dataclasses import dataclass
from datetime import datetime
from html import unescape
from re import sub
from unicodedata import normalize


VISIBLE_STATE_ID = 4
HIDDEN_STATE_ID = 5
TITLE_MAX_LENGTH = 255
EXCERPT_MAX_LENGTH = 220


@dataclass(frozen=True)
class Blog:
    id: int
    state_id: int
    created_by: int
    title: str
    description: str
    link: str
    image: str
    deleted_at: str | None
    deleted_by: str | None
    created_at: datetime | None
    updated_at: datetime | None

    @property
    def is_visible(self) -> bool:
        return self.state_id == VISIBLE_STATE_ID and self.deleted_at is None


def plain_text_from_html(html: str) -> str:
    text = sub(r"<[^>]+>", " ", html or "")
    text = unescape(text).replace("\xa0", " ")
    return sub(r"\s+", " ", text).strip()


def make_excerpt(html: str, max_length: int = EXCERPT_MAX_LENGTH) -> str:
    text = plain_text_from_html(html)
    if len(text) <= max_length:
        return text

    clipped = text[:max_length].rsplit(" ", 1)[0].strip()
    return f"{clipped}…"


def slugify(title: str) -> str:
    normalized = normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    slug = sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "blog"
