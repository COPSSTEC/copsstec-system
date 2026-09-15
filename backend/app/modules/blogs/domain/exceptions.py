class BlogNotFoundError(Exception):
    pass


class BlogUnavailableError(Exception):
    pass


class BlogValidationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidBlogImageError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
