class InvalidDashboardExportKeyError(Exception):
    def __init__(self, message: str = "La clave de exportación no es válida.") -> None:
        super().__init__(message)
        self.message = message
