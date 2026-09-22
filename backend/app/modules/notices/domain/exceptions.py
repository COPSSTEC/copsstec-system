class NoticeNotFoundError(Exception):
    pass


class NoticeValidationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidNoticeImageError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
