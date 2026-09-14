from app.modules.membership.domain.corporate_email import suggest_corporate_email
from app.modules.membership.domain.entities import (
    ENABLED_STATE_ID,
    GATE_NONE,
    GATE_PAYMENT,
    GATE_PENDING_APPROVAL,
    PAYMENT_APPROVED,
    PAYMENT_PENDING,
    PAYMENT_REVIEW,
    PENDING_ENABLE_STATE_ID,
    membership_gate_from_payment,
)


def test_suggest_corporate_email_strips_accents() -> None:
    assert suggest_corporate_email("José María", "Ñúñez Pérez") == "jose.nunez@copsstec.com"


def test_membership_gate_payment_and_review() -> None:
    assert membership_gate_from_payment(PENDING_ENABLE_STATE_ID, PAYMENT_PENDING, False) == GATE_PAYMENT
    assert membership_gate_from_payment(PENDING_ENABLE_STATE_ID, PAYMENT_REVIEW, False) == GATE_PENDING_APPROVAL
    assert membership_gate_from_payment(ENABLED_STATE_ID, PAYMENT_APPROVED, True) == GATE_NONE
