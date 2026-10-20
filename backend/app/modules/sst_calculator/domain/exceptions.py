class SstCalculatorAccessDeniedError(Exception):
    """Raised when a user is not eligible to read protected SST data."""


class SstCalculatorEvaluationError(Exception):
    """Raised when eligibility cannot be evaluated safely."""


class CiiuCatalogUnavailableError(Exception):
    """Raised when the bundled CIIU catalog is missing or invalid."""
