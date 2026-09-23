class MembershipValidationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class MembershipConflictError(Exception):
    def __init__(self, message: str, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class MembershipNotFoundError(Exception):
    pass


class MembershipForbiddenError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class MailboxError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
