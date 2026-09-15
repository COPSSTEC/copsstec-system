class PaymentValidationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class PaymentConflictError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class PaymentNotFoundError(Exception):
    pass


class PaymentForbiddenError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
