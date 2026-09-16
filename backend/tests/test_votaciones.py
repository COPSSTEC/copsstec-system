from datetime import date

from app.modules.votaciones.application.use_cases import (
    CastVoteUseCase,
    CloseElectionUseCase,
    StartElectionUseCase,
    build_guide,
)
from app.modules.votaciones.domain.entities import (
    CALENDAR_KEYS,
    DEFAULT_POSITIONS,
    MESSAGE_KEYS,
    SINGLE_DATE_CALENDAR_KEYS,
    CalendarEvent,
    Election,
    ElectionCandidate,
    ElectionList,
    ElectionPosition,
    ElectionReport,
    ElectionSummary,
    ElectionVoter,
    MessageTemplate,
    ReportListRow,
    VoterListResult,
)
from app.modules.votaciones.domain.exceptions import ElectionConflictError, ElectionForbiddenError
from app.modules.votaciones.domain.rules import is_voting_open, validate_list_activation


def _election(**overrides) -> Election:
    data = dict(
        id=1,
        title="Eleccion 2027",
        subtitle="Participa",
        tagline="Colegio mas fuerte",
        status="en_votacion",
        voting_starts_on=date(2026, 1, 1),
        voting_ends_on=date(2026, 12, 31),
        term_starts_on=date(2027, 1, 1),
        term_ends_on=date(2031, 12, 31),
        calendar_public=False,
        work_plan_required=True,
        photo_required=True,
        accept_position_required=False,
        list_logo_enabled=True,
        list_color_required=True,
        backing_document_required=False,
        registration_deadline=None,
        max_file_mb=5,
        show_work_plan=True,
        show_all_photos=True,
        show_process_status=True,
        members_only=True,
        auto_publish_on_vote_start=False,
        publish_from=None,
        publish_until=None,
        logo_url=None,
        banner_url=None,
        primary_color="#0D47A1",
        secondary_color="#1976D2",
        election_type="lista_completa",
        one_vote_per_member=True,
        secret_vote=True,
        confirm_vote=True,
        allow_blank_vote=True,
        positions=[
            ElectionPosition(1, 1, "Presidente", 1, True, True, True, False, True, True),
        ],
        calendar=[
            CalendarEvent(1, 1, "votacion", "Periodo de votacion", date(2026, 1, 1), date(2026, 12, 31), 6),
        ],
        templates=[
            MessageTemplate(1, 1, "confirmacion_voto", "Confirmacion", "Recibido", "Gracias {nombre}", True, True, False),
        ],
    )
    data.update(overrides)
    return Election(**data)


def test_list_activation_requires_configured_fields() -> None:
    election = _election()
    lista = ElectionList(
        id=1,
        election_id=1,
        name="Lista 1",
        slogan="Fuerte",
        color=None,
        logo_url=None,
        description="",
        work_plan_url=None,
        work_plan_summary="",
        backing_document_url=None,
        status="borrador",
        sort_order=1,
        candidates=[],
    )
    try:
        validate_list_activation(election, lista)
        raise AssertionError("debio fallar")
    except Exception as exc:
        assert "plan de trabajo" in str(exc)


def test_voting_window() -> None:
    election = _election(status="en_votacion")
    assert is_voting_open(election, date(2026, 6, 15)) is True
    assert is_voting_open(election, date(2025, 12, 31)) is False
    closed = _election(status="en_preparacion")
    assert is_voting_open(closed, date(2026, 11, 15)) is False


class FakeRepo:
    def __init__(self) -> None:
        self.election = _election(status="en_preparacion")
        self.summaries = [
            ElectionSummary(1, self.election.title, self.election.status, None, None, None, None, True),
        ]
        self.voters = [
            ElectionVoter(10, "Ana", "Perez", "1100", "S-001", "SST", "ana@test.com", None, None, "al_dia", True, False, "Pichincha", "Quito"),
        ]
        self.ballots: dict[tuple[int, int], bool] = {}
        self.votes = 0
        self.notices: list[tuple] = []

    def list_summaries(self):
        return self.summaries

    def get_open_election(self):
        return self.election if self.election.status in {"en_preparacion", "publicada", "en_votacion"} else None

    def get_election(self, election_id: int):
        return self.election if election_id == self.election.id else None

    def create_election(self, title: str):
        self.election = _election(id=2, title=title, status="en_preparacion")
        self.summaries.insert(0, ElectionSummary(2, title, "en_preparacion", None, None, None, None, True))
        return self.election

    def close_election(self, election_id: int, status: str):
        self.election.status = status
        return self.election

    def count_votes(self, election_id: int):
        return self.votes

    def get_voter(self, election_id: int, user_id: int, today):
        return next((item for item in self.voters if item.user_id == user_id), None)

    def has_voted(self, election_id: int, user_id: int):
        return self.ballots.get((election_id, user_id), False)

    def create_ballot(self, election_id: int, user_id: int, receipt_hash: str, votes: list[dict]):
        self.ballots[(election_id, user_id)] = True
        self.votes += 1
        return 1

    def add_notice(self, *args, **kwargs):
        self.notices.append(args)

    def add_message_log(self, *args, **kwargs):
        return None

    def list_lists(self, election_id: int):
        return []

    def list_all_voters(self, election_id: int, today):
        return self.voters

    def list_notices(self, election_id: int, user_id: int):
        return []

    def build_report(self, election, today):
        return ElectionReport(
            election_id=election.id,
            title=election.title,
            status=election.status,
            eligible=1,
            votes_cast=self.votes,
            participation=100.0 if self.votes else 0.0,
            blank_votes=0,
            blank_percentage=0.0,
            lists_count=0,
            updated_at=None,
            rows=[ReportListRow(None, "Voto en blanco", "", None, None, "—", 0, 0.0, "N/A")],
            timeline=[],
        )


class SilentNotifier:
    def send(self, to_email: str, subject: str, body: str) -> None:
        return None


def test_cannot_start_second_open_period() -> None:
    repo = FakeRepo()
    try:
        StartElectionUseCase(repo).execute()
        raise AssertionError("debio fallar")
    except ElectionConflictError:
        pass


def test_close_then_start_new_period() -> None:
    repo = FakeRepo()
    repo.votes = 3
    closed = CloseElectionUseCase(repo).execute(1)
    assert closed.status == "finalizada"
    created = StartElectionUseCase(repo).execute("Nuevo periodo")
    assert created.id == 2
    assert created.status == "en_preparacion"


def test_vote_happy_path_and_double_vote() -> None:
    repo = FakeRepo()
    repo.election.status = "en_votacion"
    use_case = CastVoteUseCase(repo, SilentNotifier())
    use_case.execute(10, {"list_id": 7, "is_blank": False, "choices": []})
    assert repo.has_voted(1, 10)
    try:
        use_case.execute(10, {"list_id": 7, "is_blank": False, "choices": []})
        raise AssertionError("no debe votar dos veces")
    except ElectionConflictError:
        pass


def test_vote_rejected_when_disabled() -> None:
    repo = FakeRepo()
    repo.election.status = "en_votacion"
    repo.voters[0].voting_enabled = False
    try:
        CastVoteUseCase(repo, SilentNotifier()).execute(10, {"list_id": 7})
        raise AssertionError("debio fallar")
    except ElectionForbiddenError:
        pass


def test_guide_marks_lists_and_reports() -> None:
    election = _election(status="en_preparacion")
    steps = build_guide(election, lists_count=1, voters_count=0, votes_count=0)
    assert any(step.key == "lists" and step.done for step in steps)
    assert any(step.key == "voters" and not step.done for step in steps)
    hrefs = {step.key: step.href for step in steps}
    assert hrefs["lists"] == "/admin/votaciones/listas"
    assert hrefs["calendar"] == "/admin/votaciones/calendario"
    assert hrefs["positions"].startswith("/admin/votaciones/configuracion")
    assert hrefs["voters"] == "/admin/votaciones/votantes"
    assert hrefs["reports"] == "/admin/votaciones/reportes"


def test_admin_navigation_nests_votaciones() -> None:
    from app.modules.auth.application.rbac import resolve_access_policy

    policy = resolve_access_policy(["admin"])
    votaciones = next(item for item in policy.navigation if item["href"] == "/admin/votaciones")
    assert [child["href"] for child in votaciones["children"]] == [
        "/admin/votaciones/listas",
        "/admin/votaciones/calendario",
        "/admin/votaciones/configuracion",
        "/admin/votaciones/votantes",
        "/admin/votaciones/reportes",
    ]
    assert "/admin/votaciones/reportes" in policy.allowed_routes


def test_defaults_cover_positions_calendar_and_messages() -> None:
    assert len(DEFAULT_POSITIONS) == 7
    assert len(CALENDAR_KEYS) == 9
    assert len(MESSAGE_KEYS) == 6
    assert SINGLE_DATE_CALENDAR_KEYS == {
        "convocatoria",
        "publicacion_listas",
        "inicio_gestion",
        "fin_gestion",
    }


def test_candidate_uses_configured_position() -> None:
    election = _election()
    lista = ElectionList(
        id=1,
        election_id=1,
        name="Lista 1",
        slogan="Fuerte",
        color="#0D47A1",
        logo_url=None,
        description="",
        work_plan_url="/media/plan.pdf",
        work_plan_summary="Punto 1",
        backing_document_url=None,
        status="borrador",
        sort_order=1,
        candidates=[
            ElectionCandidate(1, 1, 1, "Presidente", "Carlos Perez", "Ing. SST", "Lider", "/foto.jpg", 1),
        ],
    )
    validate_list_activation(election, lista)
