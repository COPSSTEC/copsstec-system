from app.shared.infrastructure.email import MailtrapEmailSender


class LogMemberNotifier:
    def __init__(self) -> None:
        self._sender = MailtrapEmailSender()

    def notify_credentials(self, email: str, password: str, full_name: str) -> None:
        if not email:
            return
        self._sender.send_template(
            email,
            "access_credentials",
            {"nombres": full_name, "email": email, "password": password},
        )
