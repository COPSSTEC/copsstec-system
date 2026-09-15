from dataclasses import dataclass, replace
from datetime import date, datetime
from decimal import Decimal

from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user
from app.modules.membership.application.use_cases import GetMembershipStatusUseCase
from app.modules.membership.domain.entities import (
    ENABLED_STATE_ID,
    GATE_NONE,
    GATE_PAYMENT,
    GATE_SUBSCRIPTION_DUE,
    PAYMENT_PENDING,
    PENDING_ENABLE_STATE_ID,
    MembershipStatus,
    membership_gate_from_payment,
)
from app.modules.payments.application.use_cases import (
    ApprovePaymentUseCase,
    CreateAdminPaymentUseCase,
    CreatePaymentCommand,
    CreateRenewalUseCase,
    DeleteAdminPaymentUseCase,
    GetMyPaymentsUseCase,
    RejectPaymentUseCase,
)
from app.modules.payments.domain.entities import (
    AdminPaymentQuery,
    AffiliationRow,
    MemberHeader,
    MemberSubscription,
    Payment,
    PaymentListResult,
    SubscriptionListQuery,
    SubscriptionListResult,
)
from app.modules.payments.domain.exceptions import PaymentConflictError, PaymentValidationError
from app.modules.payments.domain.subscription import (
    GATE_SUBSCRIPTION_DUE as PAYMENTS_GATE_SUBSCRIPTION_DUE,
    MONTHLY_FEE,
    STATUS_APPROVED,
    STATUS_PENDING_PAYMENT,
    STATUS_PENDING_REVIEW,
    STATUS_REJECTED,
    YEARLY_FEE,
    apply_payment,
    apply_subscription_gate,
    cents_from_dollars,
    dollars_from_cents,
    format_register_date,
    is_membership_type,
    parse_register_date,
    replay,
)
from app.modules.payments.presentation.api.dependencies import get_payments_repository


def _payment(
    *,
    payment_id: int,
    user_id: int = 1,
    amount: Decimal = MONTHLY_FEE,
    status: str = STATUS_APPROVED,
    date_register: str = "17/02/2026",
    payment_type: str = "membresía",
    description: str = "Pago de membresía",
    voucher_path: str | None = None,
    admin_observation: str | None = None,
) -> Payment:
    return Payment(
        id=payment_id,
        user_id=user_id,
        member_name="Ana Pérez",
        identifier="1100",
        type=payment_type,
        description=description,
        amount=amount,
        currency="USD",
        date_register=date_register,
        last_digits="any",
        status=status,
        voucher_path=voucher_path,
        created_at=datetime(2026, 2, 17, 10, 0, 0),
        total_cents=cents_from_dollars(amount),
        admin_observation=admin_observation,
    )


class FakePaymentsRepository:
    def __init__(self) -> None:
        self.payments: dict[int, Payment] = {}
        self.subscriptions: dict[int, MemberSubscription] = {}
        self.members: dict[int, MemberHeader] = {
            1: MemberHeader(user_id=1, names="Ana", lastname="Pérez", identifier="1100"),
            2: MemberHeader(user_id=2, names="Luis", lastname="Mora", identifier="2200"),
        }
        self.next_id = 1
        self.legacy_totals: dict[int, str] = {}

    def list_admin_payments(self, query: AdminPaymentQuery) -> PaymentListResult:
        items = list(self.payments.values())
        return PaymentListResult(items=items, page=query.page, page_size=query.page_size, total=len(items))

    def get_payment(self, payment_id: int) -> Payment | None:
        return self.payments.get(payment_id)

    def member_exists(self, user_id: int) -> bool:
        return user_id in self.members

    def get_member_header(self, user_id: int) -> MemberHeader | None:
        return self.members.get(user_id)

    def list_payments_for_user(self, user_id: int) -> list[Payment]:
        return [item for item in self.payments.values() if item.user_id == user_id]

    def get_subscription(self, user_id: int) -> MemberSubscription | None:
        return self.subscriptions.get(
            user_id,
            MemberSubscription(user_id=user_id, coverage_until=None, credit_balance=Decimal("0.00")),
        )

    def get_open_membership_payment(self, user_id: int) -> Payment | None:
        opens = [
            item
            for item in self.payments.values()
            if item.user_id == user_id
            and is_membership_type(item.type)
            and item.status in {STATUS_PENDING_PAYMENT, STATUS_PENDING_REVIEW}
        ]
        return max(opens, key=lambda item: item.id) if opens else None

    def cancel_unused_pending_renewal(self, user_id: int) -> None:
        stale_ids = [
            item.id
            for item in self.payments.values()
            if item.user_id == user_id
            and is_membership_type(item.type)
            and item.status == STATUS_PENDING_PAYMENT
            and not item.voucher_path
        ]
        for payment_id in stale_ids:
            self.payments.pop(payment_id, None)

    def create_payment(
        self,
        *,
        user_id: int,
        payment_type: str,
        description: str,
        amount: Decimal,
        date_register: str,
        status: str,
        last_digits: str = "any",
        trans_id: str = "NA",
        client_id: str = "NA",
        voucher_path: str | None = None,
        admin_observation: str | None = None,
        reviewed_by: int | None = None,
        recalculate: bool = True,
    ) -> Payment:
        payment_id = self.next_id
        self.next_id += 1
        payment = _payment(
            payment_id=payment_id,
            user_id=user_id,
            amount=amount,
            status=status,
            date_register=date_register,
            payment_type=payment_type,
            description=description,
            voucher_path=voucher_path,
            admin_observation=admin_observation,
        )
        self.payments[payment_id] = payment
        self.legacy_totals[payment_id] = cents_from_dollars(amount)
        if recalculate and is_membership_type(payment_type) and status == STATUS_APPROVED:
            self.recalculate_subscription(user_id)
        return payment

    def update_payment(
        self,
        payment_id: int,
        *,
        payment_type: str,
        description: str,
        amount: Decimal,
        date_register: str,
    ) -> Payment:
        current = self.payments[payment_id]
        updated = replace(
            current,
            type=payment_type,
            description=description,
            amount=amount,
            date_register=date_register,
            total_cents=cents_from_dollars(amount),
        )
        self.payments[payment_id] = updated
        self.legacy_totals[payment_id] = cents_from_dollars(amount)
        if is_membership_type(current.type) or is_membership_type(payment_type):
            self.recalculate_subscription(current.user_id)
        return updated

    def delete_payment(self, payment_id: int) -> Payment:
        current = self.payments.pop(payment_id)
        if is_membership_type(current.type):
            self.recalculate_subscription(current.user_id)
        return current

    def approve_payment(self, payment_id: int, reviewed_by: int, date_register: str) -> Payment:
        current = self.payments[payment_id]
        updated = replace(current, status=STATUS_APPROVED, date_register=date_register, reviewed_by=reviewed_by)
        self.payments[payment_id] = updated
        if is_membership_type(updated.type):
            self.recalculate_subscription(updated.user_id)
        return updated

    def reject_payment(self, payment_id: int, reviewed_by: int, observation: str) -> tuple[Payment, Payment]:
        current = self.payments[payment_id]
        rejected = replace(current, status=STATUS_REJECTED, admin_observation=observation, reviewed_by=reviewed_by)
        self.payments[payment_id] = rejected
        pending = self.create_payment(
            user_id=current.user_id,
            payment_type=current.type,
            description=current.description,
            amount=current.amount,
            date_register=current.date_register,
            status=STATUS_PENDING_PAYMENT,
            recalculate=False,
        )
        return rejected, pending

    def save_voucher(self, payment_id: int, voucher_path: str) -> Payment:
        current = self.payments[payment_id]
        updated = replace(current, voucher_path=voucher_path, status=STATUS_PENDING_REVIEW)
        self.payments[payment_id] = updated
        return updated

    def ensure_pending_renewal(
        self,
        user_id: int,
        amount: Decimal,
        date_register: str,
        reference: str,
    ) -> Payment:
        existing = self.get_open_membership_payment(user_id)
        if existing is not None and existing.status == STATUS_PENDING_REVIEW:
            raise PaymentConflictError("Ya hay un comprobante en revisión.")
        if existing is not None and existing.status == STATUS_PENDING_PAYMENT:
            return self.update_pending_renewal(existing.id, amount, date_register)
        return self.create_payment(
            user_id=user_id,
            payment_type="membresía",
            description=reference,
            amount=amount,
            date_register=date_register,
            status=STATUS_PENDING_PAYMENT,
            recalculate=False,
        )

    def update_pending_renewal(self, payment_id: int, amount: Decimal, date_register: str | None = None) -> Payment:
        current = self.payments[payment_id]
        updated = replace(
            current,
            amount=amount,
            date_register=date_register or current.date_register,
            total_cents=cents_from_dollars(amount),
        )
        self.payments[payment_id] = updated
        self.legacy_totals[payment_id] = cents_from_dollars(amount)
        return updated

    def recalculate_subscription(self, user_id: int) -> MemberSubscription:
        approved = [
            item
            for item in self.payments.values()
            if item.user_id == user_id and is_membership_type(item.type) and item.status == STATUS_APPROVED
        ]
        approved.sort(key=lambda item: (parse_register_date(item.date_register), item.id))
        state = replay([(item.amount, parse_register_date(item.date_register)) for item in approved])
        last = parse_register_date(approved[-1].date_register) if approved else None
        subscription = MemberSubscription(
            user_id=user_id,
            coverage_until=state.coverage_until,
            credit_balance=state.credit_balance,
            last_payment_at=last,
            payments_count=len(approved),
        )
        self.subscriptions[user_id] = subscription
        return subscription

    def record_affiliation_payment(self, user_id: int, amount: Decimal, payment_date: date) -> None:
        date_register = format_register_date(payment_date)
        cents = cents_from_dollars(amount)
        for item in self.payments.values():
            if (
                item.user_id == user_id
                and is_membership_type(item.type)
                and item.total_cents == cents
                and item.date_register == date_register
                and item.status == STATUS_APPROVED
            ):
                return
        self.create_payment(
            user_id=user_id,
            payment_type="membresía",
            description="Afiliación de membresía",
            amount=amount,
            date_register=date_register,
            status=STATUS_APPROVED,
        )

    def list_pending_vouchers(self) -> list[Payment]:
        return [item for item in self.payments.values() if item.status == STATUS_PENDING_REVIEW]

    def list_subscriptions(self, query: SubscriptionListQuery) -> SubscriptionListResult:
        items = list(self.subscriptions.values())
        return SubscriptionListResult(items=items, page=query.page, page_size=query.page_size, total=len(items))

    def list_affiliations(self) -> list[AffiliationRow]:
        return []


@dataclass
class FakeMembershipRepository:
    status: MembershipStatus | None

    def get_status(self, user_id: int) -> MembershipStatus | None:
        return self.status


def test_subscription_monthly_extends_one_month() -> None:
    state = apply_payment(Decimal("10.00"), None, Decimal("0"), date(2026, 2, 17))
    assert state.coverage_until == date(2026, 3, 17)
    assert state.credit_balance == Decimal("0.00")


def test_subscription_yearly_extends_one_year() -> None:
    state = apply_payment(Decimal("120.00"), None, Decimal("0"), date(2026, 2, 17))
    assert state.coverage_until == date(2027, 2, 17)
    assert state.credit_balance == Decimal("0.00")


def test_subscription_credit_uses_only_full_months() -> None:
    state = apply_payment(Decimal("60.00"), None, Decimal("0"), date(2026, 1, 10))
    assert state.coverage_until == date(2026, 7, 10)
    assert state.credit_balance == Decimal("0.00")

    remainder = apply_payment(Decimal("5.00"), date(2026, 6, 1), Decimal("0"), date(2026, 3, 1))
    assert remainder.coverage_until == date(2026, 6, 1)
    assert remainder.credit_balance == Decimal("5.00")


def test_subscription_mixed_150_is_year_plus_three_months() -> None:
    state = apply_payment(Decimal("150.00"), None, Decimal("0"), date(2026, 1, 10))
    assert state.coverage_until == date(2027, 4, 10)
    assert state.credit_balance == Decimal("0.00")


def test_pending_payment_does_not_extend_coverage() -> None:
    repo = FakePaymentsRepository()
    CreateAdminPaymentUseCase(repo).execute(
        CreatePaymentCommand(1, "membresía", "Pago de membresía", Decimal("10.00"), "17/02/2026"),
        today=date(2026, 2, 17),
    )
    repo.create_payment(
        user_id=1,
        payment_type="membresía",
        description="Renovación de membresía",
        amount=YEARLY_FEE,
        date_register="18/02/2026",
        status=STATUS_PENDING_PAYMENT,
        recalculate=True,
    )
    repo.recalculate_subscription(1)
    assert repo.subscriptions[1].coverage_until == date(2026, 3, 17)


def test_approve_voucher_extends_coverage() -> None:
    repo = FakePaymentsRepository()
    pending = repo.create_payment(
        user_id=1,
        payment_type="membresía",
        description="Renovación de membresía",
        amount=MONTHLY_FEE,
        date_register="17/02/2026",
        status=STATUS_PENDING_REVIEW,
        voucher_path="/media/payments/1/voucher.webp",
        recalculate=False,
    )
    result = ApprovePaymentUseCase(repo).execute(pending.id, reviewed_by=99, today=date(2026, 2, 17))
    assert result.payment.status == STATUS_APPROVED
    assert result.subscription is not None
    assert result.subscription.coverage_until == date(2026, 3, 17)


def test_reject_voucher_creates_new_pending() -> None:
    repo = FakePaymentsRepository()
    pending = repo.create_payment(
        user_id=1,
        payment_type="membresía",
        description="Renovación de membresía",
        amount=MONTHLY_FEE,
        date_register="17/02/2026",
        status=STATUS_PENDING_REVIEW,
        voucher_path="/media/payments/1/voucher.webp",
        recalculate=False,
    )
    result = RejectPaymentUseCase(repo).execute(pending.id, 99, "El comprobante no se lee")
    assert result.payment.status == STATUS_REJECTED
    assert result.open_payment is not None
    assert result.open_payment.status == STATUS_PENDING_PAYMENT
    assert result.open_payment.amount == MONTHLY_FEE
    assert result.open_payment.id != pending.id


def test_grace_day_5_allows_access() -> None:
    today = date(2026, 9, 15)
    coverage = date(2026, 9, 10)
    assert apply_subscription_gate(GATE_NONE, coverage, Decimal("0"), today) == GATE_NONE


def test_overdue_day_6_sets_subscription_due() -> None:
    today = date(2026, 9, 15)
    coverage = date(2026, 9, 9)
    assert apply_subscription_gate(GATE_NONE, coverage, Decimal("0"), today) == PAYMENTS_GATE_SUBSCRIPTION_DUE


def test_pending_review_does_not_clear_subscription_due() -> None:
    today = date(2026, 9, 15)
    coverage = date(2026, 9, 1)
    gate = apply_subscription_gate(GATE_NONE, coverage, Decimal("0"), today)
    assert gate == PAYMENTS_GATE_SUBSCRIPTION_DUE
    status = MembershipStatus(
        user_id=1,
        state_id=ENABLED_STATE_ID,
        personal_email="ana@test.com",
        login_email="ana@copsstec.com",
        payment_status="approved",
        gate=GATE_NONE,
        must_complete_payment=False,
        must_wait_approval=False,
        has_invoice=True,
        names="Ana",
        lastname="Pérez",
        identifier="1100",
        coverage_until=coverage,
        credit_balance=Decimal("0.00"),
        open_payment_status=STATUS_PENDING_REVIEW,
    )
    result = GetMembershipStatusUseCase(FakeMembershipRepository(status)).execute(
        1,
        ["miembro"],
        today=today,
    )
    assert result.gate == GATE_SUBSCRIPTION_DUE
    assert result.must_pay_subscription is True
    assert result.open_payment_status == STATUS_PENDING_REVIEW


def test_affiliation_gate_has_priority_over_subscription() -> None:
    affiliation = membership_gate_from_payment(PENDING_ENABLE_STATE_ID, PAYMENT_PENDING, False)
    assert affiliation == GATE_PAYMENT
    gate = apply_subscription_gate(
        affiliation,
        date(2020, 1, 1),
        Decimal("0"),
        date(2026, 9, 15),
    )
    assert gate == GATE_PAYMENT

    status = MembershipStatus(
        user_id=1,
        state_id=PENDING_ENABLE_STATE_ID,
        personal_email="ana@test.com",
        login_email="ana@test.com",
        payment_status=PAYMENT_PENDING,
        gate=GATE_PAYMENT,
        must_complete_payment=True,
        must_wait_approval=False,
        has_invoice=False,
        names="Ana",
        lastname="Pérez",
        identifier="1100",
        coverage_until=date(2020, 1, 1),
        credit_balance=Decimal("0.00"),
    )
    result = GetMembershipStatusUseCase(FakeMembershipRepository(status)).execute(
        1,
        ["miembro"],
        today=date(2026, 9, 15),
    )
    assert result.gate == GATE_PAYMENT
    assert result.must_pay_subscription is False


def test_replay_after_delete_recomputes_coverage() -> None:
    repo = FakePaymentsRepository()
    create = CreateAdminPaymentUseCase(repo)
    create.execute(CreatePaymentCommand(1, "membresía", "Uno", Decimal("10.00"), "17/01/2026"))
    second = create.execute(CreatePaymentCommand(1, "membresía", "Dos", Decimal("10.00"), "17/02/2026")).payment
    assert repo.subscriptions[1].coverage_until == date(2026, 3, 17)
    DeleteAdminPaymentUseCase(repo).execute(second.id)
    assert repo.subscriptions[1].coverage_until == date(2026, 2, 17)


def test_only_one_open_membership_payment() -> None:
    repo = FakePaymentsRepository()
    use_case = CreateRenewalUseCase(repo)
    first, created = use_case.execute(1, "monthly", today=date(2026, 9, 15))
    assert created is True
    second, created = use_case.execute(1, "yearly", today=date(2026, 9, 15))
    assert created is False
    assert second.id == first.id
    assert second.amount == YEARLY_FEE
    opens = [
        item
        for item in repo.payments.values()
        if item.status in {STATUS_PENDING_PAYMENT, STATUS_PENDING_REVIEW}
    ]
    assert len(opens) == 1

    repo.payments[first.id] = replace(repo.payments[first.id], status=STATUS_PENDING_REVIEW)
    try:
        use_case.execute(1, "monthly")
        raise AssertionError("Se esperaba conflicto")
    except PaymentConflictError:
        pass


def test_create_payment_stores_legacy_cents() -> None:
    assert cents_from_dollars(Decimal("120.00")) == "12000"
    assert cents_from_dollars(Decimal("50.00")) == "5000"
    assert dollars_from_cents("12000") == Decimal("120.00")
    repo = FakePaymentsRepository()
    result = CreateAdminPaymentUseCase(repo).execute(
        CreatePaymentCommand(1, "membresía", "Pago de membresía", Decimal("120.00"), "17/02/2026"),
    )
    assert repo.legacy_totals[result.payment.id] == "12000"
    assert result.payment.amount == Decimal("120.00")


def _member_user(user_id: int = 10) -> User:
    return User(
        id=user_id,
        name="Miembro",
        email="miembro@test.com",
        password_hash="x",
        state_id=1,
        email_verified_at=None,
        last_conexion=None,
        roles=["miembro"],
        profile=None,
    )


def test_router_admin_forbidden_for_member() -> None:
    app.dependency_overrides[get_current_user] = lambda: _member_user()
    app.dependency_overrides[get_payments_repository] = lambda: FakePaymentsRepository()
    try:
        client = TestClient(app)
        response = client.get("/api/payments/admin")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_get_my_payments_does_not_create_pending_when_current() -> None:
    repo = FakePaymentsRepository()
    CreateAdminPaymentUseCase(repo).execute(
        CreatePaymentCommand(1, "membresía", "Anual", YEARLY_FEE, "02/05/2026"),
    )
    view = GetMyPaymentsUseCase(repo).execute(1, today=date(2026, 9, 15))
    assert view.subscription is not None
    assert view.subscription.coverage_until == date(2027, 5, 2)
    assert view.open_payment is None


def test_get_my_payments_cancels_stale_pending_when_current() -> None:
    repo = FakePaymentsRepository()
    CreateAdminPaymentUseCase(repo).execute(
        CreatePaymentCommand(1, "membresía", "Anual", YEARLY_FEE, "02/05/2026"),
    )
    repo.create_payment(
        user_id=1,
        payment_type="membresía",
        description="Renovación de membresía",
        amount=YEARLY_FEE,
        date_register="03/05/2027",
        status=STATUS_PENDING_PAYMENT,
        recalculate=False,
    )
    view = GetMyPaymentsUseCase(repo).execute(1, today=date(2026, 9, 15))
    assert view.open_payment is None
    assert all(item.status != STATUS_PENDING_PAYMENT for item in view.items)


def test_create_renewal_rejected_when_al_dia() -> None:
    repo = FakePaymentsRepository()
    CreateAdminPaymentUseCase(repo).execute(
        CreatePaymentCommand(1, "membresía", "Anual", YEARLY_FEE, "02/05/2026"),
    )
    try:
        CreateRenewalUseCase(repo).execute(1, "yearly", today=date(2026, 9, 15))
        raise AssertionError("Se esperaba error de cuota al día")
    except PaymentValidationError as exc:
        assert "pendiente" in exc.message.lower()


def test_create_admin_payment_cancels_stale_pending() -> None:
    repo = FakePaymentsRepository()
    repo.create_payment(
        user_id=1,
        payment_type="membresía",
        description="Renovación de membresía",
        amount=MONTHLY_FEE,
        date_register="16/09/2026",
        status=STATUS_PENDING_PAYMENT,
        recalculate=False,
    )
    CreateAdminPaymentUseCase(repo).execute(
        CreatePaymentCommand(1, "membresía", "Pago de membresía", YEARLY_FEE, "15/09/2026"),
        today=date(2026, 9, 15),
    )
    assert repo.get_open_membership_payment(1) is None


def test_router_me_returns_only_own_payments() -> None:
    repo = FakePaymentsRepository()
    repo.create_payment(
        user_id=10,
        payment_type="membresía",
        description="Mio",
        amount=MONTHLY_FEE,
        date_register="17/02/2026",
        status=STATUS_APPROVED,
    )
    repo.create_payment(
        user_id=2,
        payment_type="membresía",
        description="Ajeno",
        amount=YEARLY_FEE,
        date_register="17/02/2026",
        status=STATUS_APPROVED,
    )
    app.dependency_overrides[get_current_user] = lambda: _member_user(10)
    app.dependency_overrides[get_payments_repository] = lambda: repo
    try:
        client = TestClient(app)
        response = client.get("/api/payments/me")
        assert response.status_code == 200
        body = response.json()
        assert all(item["user_id"] == 10 for item in body["items"])
        assert all(item["description"] != "Ajeno" for item in body["items"])
    finally:
        app.dependency_overrides.clear()


def test_get_membership_status_empty_template_has_subscription_fields() -> None:
    result = GetMembershipStatusUseCase(FakeMembershipRepository(None)).execute(99, ["admin"])
    assert result.gate == GATE_NONE
    assert result.must_pay_subscription is False
    assert result.coverage_until is None
    assert result.credit_balance == Decimal("0.00")
    assert result.days_overdue == 0
    assert result.open_payment_status is None
