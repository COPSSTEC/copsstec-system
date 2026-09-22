from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.notices.domain.entities import Notice, make_excerpt


class AdminNoticeResponse(BaseModel):
    id: int
    state_id: int
    created_by: int
    title: str
    description: str
    excerpt: str
    image: str
    importance: str
    published_at: datetime | None
    deleted_at: str | None
    deleted_by: str | None
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(cls, notice: Notice) -> "AdminNoticeResponse":
        return cls(
            id=notice.id,
            state_id=notice.state_id,
            created_by=notice.created_by,
            title=notice.title,
            description=notice.description,
            excerpt=make_excerpt(notice.description),
            image=notice.image,
            importance=notice.importance,
            published_at=notice.published_at,
            deleted_at=notice.deleted_at,
            deleted_by=notice.deleted_by,
            created_at=notice.created_at,
            updated_at=notice.updated_at,
        )


class NoticeVisibilityRequest(BaseModel):
    state_id: int = Field(...)
