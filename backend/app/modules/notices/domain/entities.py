from dataclasses import dataclass
from datetime import datetime
from html import unescape
from re import sub


VISIBLE_STATE_ID = 4
HIDDEN_STATE_ID = 5
TITLE_MAX_LENGTH = 255
EXCERPT_MAX_LENGTH = 220
IMPORTANCE_LOW = "baja"
IMPORTANCE_MEDIUM = "media"
IMPORTANCE_HIGH = "alta"
ALLOWED_IMPORTANCE = {IMPORTANCE_LOW, IMPORTANCE_MEDIUM, IMPORTANCE_HIGH}


@dataclass(frozen=True)
class Notice:
    id: int
    state_id: int
    created_by: int
    title: str
    description: str
    image: str
    importance: str
    published_at: datetime | None
    deleted_at: str | None
    deleted_by: str | None
    created_at: datetime | None
    updated_at: datetime | None

    def is_published(self, now: datetime) -> bool:
        if self.state_id != VISIBLE_STATE_ID or self.deleted_at is not None:
            return False
        if self.published_at is None:
            return True
        return self.published_at <= now

    def is_scheduled(self, now: datetime) -> bool:
        return (
            self.state_id == VISIBLE_STATE_ID
            and self.deleted_at is None
            and self.published_at is not None
            and self.published_at > now
        )


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
