class ElectionError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ElectionNotFoundError(ElectionError):
    pass


class ElectionValidationError(ElectionError):
    pass


class ElectionConflictError(ElectionError):
    pass


class ElectionForbiddenError(ElectionError):
    pass
