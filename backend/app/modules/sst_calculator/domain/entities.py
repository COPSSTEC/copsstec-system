from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

BalanceStatus = Literal["al_dia", "saldo_pendiente"]
RiskLevel = Literal["Bajo", "Medio", "Alto"]


@dataclass(frozen=True)
class MembershipBalance:
    pending_balance: Decimal
    balance_status: BalanceStatus


@dataclass(frozen=True)
class SstCalculatorUser:
    user_id: int
    roles: tuple[str, ...]
    access_level: str
    state_id: int


@dataclass(frozen=True)
class SstCalculatorAccess:
    allowed: bool
    balance_status: BalanceStatus
    pending_balance: Decimal
    reason: str | None


@dataclass(frozen=True)
class CiiuActivity:
    code: str
    description: str
    risk: RiskLevel
