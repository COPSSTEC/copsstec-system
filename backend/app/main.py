from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.modules.auth.presentation.api.router import router as auth_router
from app.modules.blogs.presentation.api.router import router as blogs_router
from app.modules.courses.presentation.api.router import router as courses_router
from app.modules.members.presentation.api.router import router as members_router
from app.modules.membership.presentation.api.router import router as membership_router
from app.modules.partners.presentation.api.router import router as partners_router

settings = get_settings()

app = FastAPI(
    title="COPSSTEC System API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(blogs_router)
app.include_router(courses_router)
app.include_router(members_router)
app.include_router(membership_router)
app.include_router(partners_router)

member_media_dir = Path("storage/members")
member_media_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/media/members",
    StaticFiles(directory=str(member_media_dir)),
    name="member-media",
)

membership_media_dir = Path("storage/membership")
membership_media_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/media/membership",
    StaticFiles(directory=str(membership_media_dir)),
    name="membership-media",
)

blog_media_dir = Path("storage/blogs")
blog_media_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/media/blogs",
    StaticFiles(directory=str(blog_media_dir)),
    name="blog-media",
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
