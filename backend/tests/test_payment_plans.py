from dataclasses import replace
from datetime import date
from decimal import Decimal

import pytest

from app.modules.members.domain.entities import MemberCobrosRow
from app.modules.members.infrastructure.cobros_excel import map_cobros_row
from app.modules.payments.application.use_cases import (
    CancelPaymentPlanUseCase,
    ConfirmPlanInstallmentsUseCase,
    CreatePaymentPlanUseCase,
    PaymentPlanCommand,
    PreviewPaymentPlanUseCase,
    payment_plan_email_context,
)
from app.modules.payments.domain.entities import (
    AgreementMemberContext,
    NewPaymentPlan,
    Payment,
    PaymentPlan,
    PeriodInstallmentRow,
    PlanBankDetails,
    PlanInstallment,
)
from app.modules.payments.domain.exceptions import PaymentConflictError, PaymentValidationError
from app.modules.payments.domain.subscription import (
    GATE_NONE,
    GATE_SUBSCRIPTION_DUE,
    INSTALLMENT_DEBITED,
    INSTALLMENT_FAILED,
    INSTALLMENT_PENDING,
    PLAN_ACTIVE,
    PLAN_CANCELLED,
    PLAN_COMPLETED,
    apply_subscription_gate,
    build_plan_schedule,
    default_debit_period,
    parse_register_date,
    pending_membership_balance,
)
from app.shared.infrastructure.email.templates import payment_plan_paragraphs, render_email

PAVEL_ENROLLED = date(2024, 10, 5)
TODAY = date(2026, 10, 21)


class FakePlanRepository:
    def __init__(self, enrolled_on: date | None = PAVEL_ENROLLED, state_id: int = 1) -> None:
        self.context = AgreementMemberContext(
            user_id=7,
            names="Pavel",
            lastname="Ríos",
            identifier="1700000007",
            email="pavel@example.com",
            city="Quito",
            state_id=state_id,
            enrolled_on=enrolled_on,
        )
        self.renewals: list[tuple[Decimal, date]] = []
        self.plans: dict[int, PaymentPlan] = {}
        self.payments: list[dict] = []
        self.next_installment_id = 1

    def member_exists(self, user_id: int) -> bool:
        return user_id == self.context.user_id

    def get_agreement_member_context(self, user_id: int) -> AgreementMemberContext | None:
        return self.context if user_id == self.context.user_id else None

    def list_approved_membership_payments(self, user_ids: list[int]) -> dict[int, list[tuple[Decimal, date]]]:
        return {user_id: list(self.renewals) for user_id in user_ids}

    def get_payment_plan_bank_defaults(self, user_id: int) -> PlanBankDetails:
        return PlanBankDetails(bank_name="Banco Pichincha", account_type="Ahorros", account_number="2200123456")

    def get_current_agreement(self, user_id: int) -> None:
        return None

    def get_current_payment_plan(self, user_id: int) -> PaymentPlan | None:
        plans = [plan for plan in self.plans.values() if plan.user_id == user_id and plan.status != PLAN_CANCELLED]
        return max(plans, key=lambda plan: plan.id) if plans else None

    def get_payment_plan(self, plan_id: int) -> PaymentPlan | None:
        return self.plans.get(plan_id)

    def create_payment_plan(self, data: NewPaymentPlan) -> PaymentPlan:
        plan_id = len(self.plans) + 1
        installments = tuple(self._installment(plan_id, item) for item in data.schedule)
        plan = PaymentPlan(
            id=plan_id,
            user_id=data.user_id,
            debt_total=data.debt_total,
            monthly_fee=data.monthly_fee,
            installment_amount=data.installment_amount,
            start_period=data.start_period,
            end_period=data.end_period,
            status=PLAN_ACTIVE,
            debt_from_period=data.debt_from_period,
            debt_to_period=data.debt_to_period,
            bank_name=data.bank.bank_name,
            account_type=data.bank.account_type,
            account_number=data.bank.account_number,
            member_name=self.context.member_name,
            installments=installments,
        )
        self.plans[plan_id] = plan
        return plan

    def cancel_payment_plan(self, plan_id: int) -> PaymentPlan:
        plan = self.plans[plan_id]
        kept = tuple(item for item in plan.installments if item.status != INSTALLMENT_PENDING)
        self.plans[plan_id] = replace(plan, status=PLAN_CANCELLED, installments=kept)
        return self.plans[plan_id]

    def complete_payment_plan(self, plan_id: int) -> None:
        self.plans[plan_id] = replace(self.plans[plan_id], status=PLAN_COMPLETED)

    def get_installment_rows(self, installment_ids: list[int]) -> list[PeriodInstallmentRow]:
        rows = []
        for plan in self.plans.values():
            for item in plan.installments:
                if item.id in installment_ids:
                    rows.append(
                        PeriodInstallmentRow(
                            installment=item,
                            user_id=plan.user_id,
                            member_name=plan.member_name,
                            identifier="1700000007",
                            plan_status=plan.status,
                            bank_name=plan.bank_name,
                            account_type=plan.account_type,
                            account_number=plan.account_number,
                        ),
                    )
        return sorted(rows, key=lambda row: row.installment.period)

    def create_payment(self, **kwargs) -> Payment:
        payment_id = len(self.payments) + 1
        self.payments.append({"id": payment_id, **kwargs})
        if kwargs["status"] == "approved":
            self.renewals.append((kwargs["amount"], parse_register_date(kwargs["date_register"])))
        return Payment(
            id=payment_id,
            user_id=kwargs["user_id"],
            member_name="",
            identifier="",
            type=kwargs["payment_type"],
            description=kwargs["description"],
            amount=kwargs["amount"],
            currency="USD",
            date_register=kwargs["date_register"],
            last_digits="any",
            status=kwargs["status"],
            voucher_path=None,
            created_at=None,
            applies_to_debt=kwargs.get("applies_to_debt", False),
        )

    def mark_installment(self, installment_id: int, *, status: str, confirmed_by: int, **kwargs) -> None:
        for plan_id, plan in self.plans.items():
            items = tuple(
                replace(item, status=status) if item.id == installment_id else item for item in plan.installments
            )
            self.plans[plan_id] = replace(plan, installments=items)

    def replace_pending_installments(self, plan_id: int, after_period: date, schedule) -> None:
        plan = self.plans[plan_id]
        kept = [
            item
            for item in plan.installments
            if not (item.status == INSTALLMENT_PENDING and item.period > after_period)
        ]
        kept.extend(self._installment(plan_id, item) for item in schedule)
        debt_periods = [item.period for item in kept if item.debt_amount > 0]
        self.plans[plan_id] = replace(
            plan,
            installments=tuple(sorted(kept, key=lambda item: item.period)),
            end_period=max(debt_periods) if debt_periods else plan.end_period,
        )

    def _installment(self, plan_id: int, item) -> PlanInstallment:
        installment = PlanInstallment(
            id=self.next_installment_id,
            plan_id=plan_id,
            period=item.period,
            fee_amount=item.fee_amount,
            debt_amount=item.debt_amount,
            total_amount=item.total_amount,
        )
        self.next_installment_id += 1
        return installment


class FakeSender:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.sent: list[tuple[str, str, dict]] = []

    def send_template(self, to_email: str, template_key: str, context: dict | None = None) -> None:
        if self.fail:
            raise RuntimeError("smtp down")
        self.sent.append((to_email, template_key, dict(context or {})))


def _command(**overrides) -> PaymentPlanCommand:
    data = dict(member_id=7, installment_amount="20.00", start_period="2026-11", created_by=1)
    data.update(overrides)
    return PaymentPlanCommand(**data)


def _create_pavel_plan(repository: FakePlanRepository) -> PaymentPlan:
    result = CreatePaymentPlanUseCase(repository, FakeSender()).execute(_command(), today=TODAY)
    return result.plan


def test_pending_balance_counts_current_month() -> None:
    assert pending_membership_balance(PAVEL_ENROLLED, TODAY, []) == Decimal("130.00")
    assert pending_membership_balance(date(2023, 1, 5), date(2026, 1, 6), []) == Decimal("250.00")
    assert pending_membership_balance(date(2023, 1, 5), date(2024, 1, 5), []) == Decimal("0.00")


def test_pavel_schedule_six_by_thirty_and_twenty() -> None:
    schedule = build_plan_schedule(Decimal("130.00"), Decimal("20.00"), date(2026, 11, 1))
    assert [item.total_amount for item in schedule] == [Decimal("30.00")] * 6 + [Decimal("20.00")]
    assert schedule[0].period == date(2026, 11, 1)
    assert schedule[-1].period == date(2027, 5, 1)
    assert schedule[-1].debt_amount == Decimal("10.00")
    assert sum(item.debt_amount for item in schedule) == Decimal("130.00")


def test_preview_freezes_debt_before_start_month() -> None:
    repository = FakePlanRepository()
    preview = PreviewPaymentPlanUseCase(repository).execute(7, "20", "2026-11", today=TODAY)
    assert preview.debt_total == Decimal("130.00")
    assert preview.debt_from_period == date(2025, 10, 1)
    assert preview.debt_to_period == date(2026, 10, 1)
    assert preview.end_period == date(2027, 5, 1)

    same_month = PreviewPaymentPlanUseCase(repository).execute(7, "20", "2026-10", today=TODAY)
    assert same_month.debt_total == Decimal("120.00")
    assert same_month.schedule[0].fee_amount == Decimal("10.00")


def test_create_plan_sends_email_with_pavel_message() -> None:
    repository = FakePlanRepository()
    sender = FakeSender()
    result = CreatePaymentPlanUseCase(repository, sender).execute(_command(), today=TODAY)

    assert result.email_sent is True
    assert result.plan.status == PLAN_ACTIVE
    assert len(result.plan.installments) == 7
    to_email, template, context = sender.sent[0]
    assert to_email == "pavel@example.com"
    assert template == "payment_plan_agreement"
    paragraphs = payment_plan_paragraphs(context)
    assert paragraphs[0] == (
        "De acuerdo con el saldo pendiente de su membresía, correspondiente al período de "
        "octubre de 2025 a octubre de 2026, la deuda acumulada es de $130."
    )
    assert "A partir de noviembre de 2026, se realizará un débito mensual de $30" in paragraphs[1]
    assert "Este esquema se mantendrá hasta abril de 2027." in paragraphs
    assert (
        "En mayo de 2027 se debitarán $20, correspondientes a los últimos $10 de deuda "
        "y los $10 del aporte mensual."
    ) in paragraphs
    assert paragraphs[-2].startswith("A partir de junio de 2027, el débito será únicamente de $10 mensuales")
    subject, _text, html = render_email(template, context)
    assert "Pavel" in subject
    assert "abril de 2027" in html


def test_create_plan_survives_smtp_failure() -> None:
    repository = FakePlanRepository()
    result = CreatePaymentPlanUseCase(repository, FakeSender(fail=True)).execute(_command(), today=TODAY)
    assert result.email_sent is False
    assert repository.plans[result.plan.id].status == PLAN_ACTIVE


@pytest.mark.parametrize(
    ("overrides", "error"),
    [
        ({"installment_amount": "25"}, PaymentValidationError),
        ({"start_period": "2026-09"}, PaymentValidationError),
        ({"start_period": "2027-03"}, PaymentValidationError),
        ({"account_type": "Plazo fijo"}, PaymentValidationError),
        ({"account_number": ""}, PaymentValidationError),
    ],
)
def test_create_plan_validations(overrides: dict, error: type[Exception]) -> None:
    with pytest.raises(error):
        CreatePaymentPlanUseCase(FakePlanRepository(), FakeSender()).execute(_command(**overrides), today=TODAY)


def test_create_plan_requires_debt_enabled_member_and_no_active_plan() -> None:
    with pytest.raises(PaymentValidationError):
        CreatePaymentPlanUseCase(FakePlanRepository(enrolled_on=date(2026, 5, 1)), FakeSender()).execute(
            _command(),
            today=TODAY,
        )
    with pytest.raises(PaymentValidationError):
        CreatePaymentPlanUseCase(FakePlanRepository(state_id=2), FakeSender()).execute(_command(), today=TODAY)

    repository = FakePlanRepository()
    _create_pavel_plan(repository)
    with pytest.raises(PaymentConflictError):
        CreatePaymentPlanUseCase(repository, FakeSender()).execute(_command(), today=TODAY)


def test_debited_installment_records_fee_and_debt_payments() -> None:
    repository = FakePlanRepository()
    plan = _create_pavel_plan(repository)
    first = plan.installments[0]

    result = ConfirmPlanInstallmentsUseCase(repository).execute([first.id], INSTALLMENT_DEBITED, confirmed_by=1)

    assert result.updated == 1
    fee, debt = repository.payments
    assert fee["amount"] == Decimal("10.00")
    assert fee["date_register"] == "01/11/2026"
    assert fee.get("applies_to_debt", False) is False
    assert debt["amount"] == Decimal("20.00")
    assert debt["applies_to_debt"] is True
    assert debt["recalculate"] is False
    balance = pending_membership_balance(PAVEL_ENROLLED, date(2026, 11, 3), repository.renewals)
    assert balance == Decimal("110.00")


def test_already_confirmed_installment_is_skipped() -> None:
    repository = FakePlanRepository()
    plan = _create_pavel_plan(repository)
    use_case = ConfirmPlanInstallmentsUseCase(repository)
    use_case.execute([plan.installments[0].id], INSTALLMENT_DEBITED, confirmed_by=1)
    again = use_case.execute([plan.installments[0].id], INSTALLMENT_FAILED, confirmed_by=1)
    assert again.updated == 0
    assert again.skipped == 1
    assert len(repository.payments) == 2


def test_all_debits_complete_the_plan() -> None:
    repository = FakePlanRepository()
    plan = _create_pavel_plan(repository)
    ConfirmPlanInstallmentsUseCase(repository).execute(
        [item.id for item in plan.installments],
        INSTALLMENT_DEBITED,
        confirmed_by=1,
    )
    assert repository.plans[plan.id].status == PLAN_COMPLETED
    assert pending_membership_balance(PAVEL_ENROLLED, date(2027, 5, 3), repository.renewals) == Decimal("0.00")


def test_failed_debit_moves_unpaid_amount_to_later_installments() -> None:
    repository = FakePlanRepository()
    plan = _create_pavel_plan(repository)

    ConfirmPlanInstallmentsUseCase(repository).execute([plan.installments[0].id], INSTALLMENT_FAILED, confirmed_by=1)

    updated = repository.plans[plan.id]
    pending = [item for item in updated.installments if item.status == INSTALLMENT_PENDING]
    assert repository.payments == []
    assert sum(item.debt_amount for item in pending) == Decimal("140.00")
    assert pending[0].period == date(2026, 12, 1)
    assert updated.end_period == date(2027, 6, 1)
    assert [item.total_amount for item in pending] == [Decimal("30.00")] * 7


def test_cancel_only_active_plans() -> None:
    repository = FakePlanRepository()
    plan = _create_pavel_plan(repository)
    cancelled = CancelPaymentPlanUseCase(repository).execute(plan.id)
    assert cancelled.status == PLAN_CANCELLED
    assert cancelled.installments == ()
    with pytest.raises(PaymentValidationError):
        CancelPaymentPlanUseCase(repository).execute(plan.id)


def test_active_plan_lifts_subscription_gate() -> None:
    expired = date(2025, 10, 4)
    assert apply_subscription_gate(GATE_NONE, expired, Decimal("0"), TODAY) == GATE_SUBSCRIPTION_DUE
    assert apply_subscription_gate(GATE_NONE, expired, Decimal("0"), TODAY, has_active_payment_plan=True) == GATE_NONE


def test_default_debit_period_uses_first_five_days() -> None:
    assert default_debit_period(date(2026, 11, 5)) == date(2026, 11, 1)
    assert default_debit_period(date(2026, 10, 21)) == date(2026, 11, 1)


@pytest.mark.parametrize("amount", [Decimal("30.00"), Decimal("20.00"), Decimal("10.00")])
def test_cobros_row_uses_plan_amount(amount: Decimal) -> None:
    row = MemberCobrosRow(
        identifier="1700000007",
        names="Pavel",
        lastname="Ríos",
        email="pavel@example.com",
        member_bank_name="Banco Pichincha",
        member_account_type="Ahorros",
        member_account_number="2200123456",
        amount=amount,
    )
    assert map_cobros_row(row)[10] == amount


def test_email_context_without_partial_last_month() -> None:
    repository = FakePlanRepository()
    repository.renewals.append((Decimal("10.00"), date(2026, 10, 1)))
    plan = CreatePaymentPlanUseCase(repository, FakeSender()).execute(_command(), today=TODAY).plan
    context = payment_plan_email_context("Pavel", plan)
    assert plan.debt_total == Decimal("120.00")
    assert context["partial_last"] is False
    assert context["full_until"] == "abril de 2027"
    assert context["regular_from"] == "mayo de 2027"
