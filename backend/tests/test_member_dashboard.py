from datetime import datetime

from app.modules.dashboard.application.use_cases import GetMemberDashboardUseCase
from app.modules.dashboard.domain.entities import (
    FeedBlog,
    FeedCourse,
    FeedDocument,
    FeedJob,
    FeedNotice,
)


class FakeMemberFeedRepository:
    def __init__(self, notices: list[FeedNotice]) -> None:
        self.notices = notices

    def list_roster(self):
        return []

    def list_income_charges(self):
        return []

    def list_pending_approvals(self):
        return []

    def list_published_notices(self, now: datetime, limit: int) -> list[FeedNotice]:
        return list(self.notices)[:limit]

    def list_recent_blogs(self, limit: int) -> list[FeedBlog]:
        return []

    def list_open_courses(self, limit: int) -> list[FeedCourse]:
        return []

    def list_open_jobs(self, limit: int) -> list[FeedJob]:
        return []

    def list_member_documents(self) -> list[FeedDocument]:
        return [
            FeedDocument(
                document_key="member_guide",
                title="Manual de miembros",
                file_path=None,
                available=False,
            )
        ]


def test_member_dashboard_groups_notices_by_importance() -> None:
    notices = [
        FeedNotice(1, "Alta", "e", "<p>a</p>", "/img/a.webp", "alta", None),
        FeedNotice(2, "Media", "e", "<p>m</p>", "/img/m.webp", "media", None),
        FeedNotice(3, "Baja", "e", "<p>b</p>", "/img/b.webp", "baja", None),
    ]
    snapshot = GetMemberDashboardUseCase(FakeMemberFeedRepository(notices)).execute()

    assert [item.title for item in snapshot.notices_high] == ["Alta"]
    assert [item.title for item in snapshot.notices_medium] == ["Media"]
    assert [item.title for item in snapshot.notices_low] == ["Baja"]
    assert snapshot.documents[0].document_key == "member_guide"
