from datetime import datetime
from typing import Protocol

from app.modules.dashboard.domain.entities import (
    FeedBlog,
    FeedCourse,
    FeedDocument,
    FeedJob,
    FeedNotice,
    IncomeCharge,
    PendingApproval,
    RosterMember,
)


class DashboardRepository(Protocol):
    def list_roster(self) -> list[RosterMember]:
        ...

    def list_income_charges(self) -> list[IncomeCharge]:
        ...

    def list_pending_approvals(self) -> list[PendingApproval]:
        ...

    def list_published_notices(self, now: datetime, limit: int) -> list[FeedNotice]:
        ...

    def list_recent_blogs(self, limit: int) -> list[FeedBlog]:
        ...

    def list_open_courses(self, limit: int) -> list[FeedCourse]:
        ...

    def list_open_jobs(self, limit: int) -> list[FeedJob]:
        ...

    def list_member_documents(self) -> list[FeedDocument]:
        ...
