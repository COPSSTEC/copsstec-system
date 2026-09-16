import re
from html import unescape

from app.modules.membership.infrastructure.email import SmtpOrLogEmailSender


class ElectionEmailNotifier:
    def __init__(self) -> None:
        self.sender = SmtpOrLogEmailSender()

    def send(self, to_email: str, subject: str, body: str) -> None:
        if not to_email:
            return
        if _looks_like_html(body):
            self.sender.send_html(to_email, subject, _html_to_text(body), body)
            return
        self.sender.send(to_email, subject, body)


def _looks_like_html(value: str) -> bool:
    return bool(re.search(r"</?[a-z][\s\S]*>", value, re.I))


def _html_to_text(value: str) -> str:
    text = re.sub(r"(?i)<br\s*/?>", "\n", value)
    text = re.sub(r"(?i)</p>", "\n\n", text)
    text = re.sub(r"(?i)</div>", "\n", text)
    text = re.sub(r"(?i)</li>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return unescape(re.sub(r"\n{3,}", "\n\n", text)).strip()
