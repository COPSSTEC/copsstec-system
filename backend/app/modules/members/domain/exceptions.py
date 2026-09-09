class MemberNotFoundError(Exception):
    pass


class MemberConflictError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class MemberValidationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
