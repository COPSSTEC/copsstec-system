from typing import Literal

from pydantic import BaseModel

from app.modules.sst_calculator.domain.entities import CiiuActivity, SstCalculatorAccess


class SstCalculatorAccessResponse(BaseModel):
    allowed: bool
    balance_status: Literal["al_dia", "saldo_pendiente"]
    pending_balance: str
    reason: str | None

    @classmethod
    def from_domain(cls, access: SstCalculatorAccess) -> "SstCalculatorAccessResponse":
        return cls(
            allowed=access.allowed,
            balance_status=access.balance_status,
            pending_balance=f"{access.pending_balance:.2f}",
            reason=access.reason,
        )


class CiiuActivityResponse(BaseModel):
    code: str
    description: str
    risk: Literal["Bajo", "Medio", "Alto"]

    @classmethod
    def from_domain(cls, activity: CiiuActivity) -> "CiiuActivityResponse":
        return cls(
            code=activity.code,
            description=activity.description,
            risk=activity.risk,
        )
