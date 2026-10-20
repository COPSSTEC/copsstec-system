from app.modules.payments.public import (
    GetMembershipBalanceUseCase,
    MembershipBalanceUnavailableError,
)
from app.modules.sst_calculator.domain.entities import MembershipBalance
from app.modules.sst_calculator.domain.exceptions import SstCalculatorEvaluationError


class PaymentsMembershipBalanceAdapter:
    def __init__(self, use_case: GetMembershipBalanceUseCase) -> None:
        self.use_case = use_case

    def get_current_balance(self, user_id: int) -> MembershipBalance:
        try:
            snapshot = self.use_case.execute(user_id)
        except MembershipBalanceUnavailableError as exc:
            raise SstCalculatorEvaluationError() from exc
        return MembershipBalance(
            pending_balance=snapshot.pending_balance,
            balance_status=snapshot.balance_status,
        )
