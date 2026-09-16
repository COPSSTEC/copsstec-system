from app.modules.membership.infrastructure.email import SmtpOrLogEmailSender


class ElectionEmailNotifier:
    def __init__(self) -> None:
        self.sender = SmtpOrLogEmailSender()

    def send(self, to_email: str, subject: str, body: str) -> None:
        if not to_email:
            return
        self.sender.send(to_email, subject, body)
