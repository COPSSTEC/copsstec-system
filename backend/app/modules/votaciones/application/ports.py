from datetime import date, datetime
from pathlib import Path
from typing import Protocol

from app.modules.votaciones.domain.entities import (
    CalendarEvent,
    Election,
    ElectionCandidate,
    ElectionList,
    ElectionNotice,
    ElectionPosition,
    ElectionReport,
    ElectionSummary,
    ElectionVoter,
    MessageTemplate,
    VoterListResult,
)


class ElectionsRepository(Protocol):
    def list_summaries(self) -> list[ElectionSummary]:
        ...

    def get_open_election(self) -> Election | None:
        ...

    def get_election(self, election_id: int) -> Election | None:
        ...

    def create_election(self, title: str) -> Election:
        ...

    def update_election(self, election: Election) -> Election:
        ...

    def close_election(self, election_id: int, status: str) -> Election:
        ...

    def add_position(self, election_id: int, name: str, sort_order: int) -> ElectionPosition:
        ...

    def update_position(self, position: ElectionPosition) -> ElectionPosition:
        ...

    def reorder_positions(self, election_id: int, ids: list[int]) -> None:
        ...

    def delete_position(self, position_id: int) -> None:
        ...

    def position_in_use(self, position_id: int) -> bool:
        ...

    def replace_calendar(self, election_id: int, events: list[CalendarEvent]) -> list[CalendarEvent]:
        ...

    def set_calendar_public(self, election_id: int, is_public: bool) -> Election:
        ...

    def list_lists(self, election_id: int) -> list[ElectionList]:
        ...

    def get_list(self, list_id: int) -> ElectionList | None:
        ...

    def create_list(self, election_id: int, data: dict) -> ElectionList:
        ...

    def update_list(self, lista: ElectionList) -> ElectionList:
        ...

    def delete_list(self, list_id: int) -> None:
        ...

    def list_has_votes(self, list_id: int) -> bool:
        ...

    def upsert_candidate(self, list_id: int, data: dict) -> ElectionCandidate:
        ...

    def delete_candidate(self, candidate_id: int) -> None:
        ...

    def replace_templates(self, election_id: int, templates: list[MessageTemplate]) -> list[MessageTemplate]:
        ...

    def list_voters(
        self,
        election_id: int,
        *,
        q: str,
        payment_status: str | None,
        enabled: bool | None,
        page: int,
        page_size: int,
        today: date,
    ) -> VoterListResult:
        ...

    def get_voter(self, election_id: int, user_id: int, today: date) -> ElectionVoter | None:
        ...

    def set_voter_enabled(self, election_id: int, user_id: int, enabled: bool) -> ElectionVoter:
        ...

    def sync_voters(self, election_id: int, today: date) -> VoterListResult:
        ...

    def list_all_voters(self, election_id: int, today: date) -> list[ElectionVoter]:
        ...

    def has_voted(self, election_id: int, user_id: int) -> bool:
        ...

    def create_ballot(
        self,
        election_id: int,
        user_id: int,
        receipt_hash: str,
        votes: list[dict],
    ) -> int:
        ...

    def count_votes(self, election_id: int) -> int:
        ...

    def build_report(self, election: Election, today: date) -> ElectionReport:
        ...

    def add_notice(self, election_id: int, user_id: int | None, template_key: str, title: str, body: str) -> None:
        ...

    def list_notices(self, election_id: int, user_id: int) -> list[ElectionNotice]:
        ...

    def add_message_log(self, election_id: int, template_key: str, channel: str, recipient: str) -> None:
        ...

    def member_emails(self, election_id: int, only_enabled: bool, only_pending_vote: bool) -> list[tuple[int, str, str]]:
        ...


class ElectionFileStorage(Protocol):
    def save(
        self,
        election_id: int,
        kind: str,
        filename: str,
        content: bytes,
        content_type: str,
        max_file_mb: int,
    ) -> str:
        ...

    def resolve_path(self, url: str) -> Path | None:
        ...


class ElectionPdfGenerator(Protocol):
    def calendar_pdf(self, election: Election) -> bytes:
        ...

    def report_pdf(self, report: ElectionReport) -> bytes:
        ...

    def acta_pdf(self, report: ElectionReport) -> bytes:
        ...


class ElectionNotifier(Protocol):
    def send(self, to_email: str, subject: str, body: str) -> None:
        ...
