from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.blogs.domain.entities import Blog, make_excerpt


class PublicBlogListItem(BaseModel):
    id: int
    state_id: int
    title: str
    excerpt: str
    image: str
    link: str
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(cls, blog: Blog) -> "PublicBlogListItem":
        return cls(
            id=blog.id,
            state_id=blog.state_id,
            title=blog.title,
            excerpt=make_excerpt(blog.description),
            image=blog.image,
            link=blog.link,
            created_at=blog.created_at,
            updated_at=blog.updated_at,
        )


class PublicBlogResponse(BaseModel):
    id: int
    state_id: int
    title: str
    description: str
    image: str
    link: str
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(cls, blog: Blog) -> "PublicBlogResponse":
        return cls(
            id=blog.id,
            state_id=blog.state_id,
            title=blog.title,
            description=blog.description,
            image=blog.image,
            link=blog.link,
            created_at=blog.created_at,
            updated_at=blog.updated_at,
        )


class AdminBlogResponse(BaseModel):
    id: int
    state_id: int
    created_by: int
    title: str
    description: str
    excerpt: str
    image: str
    link: str
    deleted_at: str | None
    deleted_by: str | None
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(cls, blog: Blog) -> "AdminBlogResponse":
        return cls(
            id=blog.id,
            state_id=blog.state_id,
            created_by=blog.created_by,
            title=blog.title,
            description=blog.description,
            excerpt=make_excerpt(blog.description),
            image=blog.image,
            link=blog.link,
            deleted_at=blog.deleted_at,
            deleted_by=blog.deleted_by,
            created_at=blog.created_at,
            updated_at=blog.updated_at,
        )


class BlogVisibilityRequest(BaseModel):
    state_id: int = Field(...)
