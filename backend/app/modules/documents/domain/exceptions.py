class DocumentNotFoundError(Exception):
    pass


class DocumentValidationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidDocumentFileError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
