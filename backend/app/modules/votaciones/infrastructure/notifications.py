import re
from html import unescape

from app.shared.infrastructure.email import MailtrapEmailSender, render_email


class ElectionEmailNotifier:
    def __init__(self) -> None:
        self.sender = MailtrapEmailSender()
        self.sender.raise_on_error = True

    def send(self, to_email: str, subject: str, body: str) -> None:
        if not to_email:
            return
        text = _html_to_text(body) if _looks_like_html(body) else body
        content = body if _looks_like_html(body) else body.replace("\n", "<br />")
        if "copsstec-email-root" in content:
            self.sender.send_html(to_email, subject, text, content)
            return
        _, rendered_text, html = render_email(
            "branded_content",
            {"subject": subject, "content": content, "text": text},
        )
        self.sender.send_html(to_email, subject, rendered_text or text, html)


def _looks_like_html(value: str) -> bool:
    return bool(re.search(r"</?[a-z][\s\S]*>", value, re.I))


def _html_to_text(value: str) -> str:
    text = re.sub(r"(?i)<br\s*/?>", "\n", value)
    text = re.sub(r"(?i)</p>", "\n\n", text)
    text = re.sub(r"(?i)</div>", "\n", text)
    text = re.sub(r"(?i)</li>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return unescape(re.sub(r"\n{3,}", "\n\n", text)).strip()
