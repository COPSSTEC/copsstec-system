from html import escape
from urllib.parse import quote

from app.core.config import get_settings

LOGO_FALLBACK = "https://www.copsstec.com/assets/logos/coppstec.png"


def _settings():
    return get_settings()


def _logo_url() -> str:
    return getattr(_settings(), "mail_logo_url", None) or LOGO_FALLBACK


def _support_email() -> str:
    return getattr(_settings(), "mail_support_email", None) or "soporte@copsstec.com"


def _mailbox_url() -> str:
    return getattr(_settings(), "mailbox_web_url", None) or "https://box.copsstec.com/mail/"


def _login_url() -> str:
    return f"{_settings().frontend_origin.rstrip('/')}/login"


def _members_url() -> str:
    return f"{_settings().frontend_origin.rstrip('/')}/miembros"


def _site_url() -> str:
    return _settings().frontend_origin.rstrip("/")


def _esc(value: object) -> str:
    return escape(str(value or ""), quote=True)


def _nl2br(value: object) -> str:
    return _esc(value).replace("\n", "<br />")


def branded_layout(
    *,
    preview: str,
    heading: str,
    inner_html: str,
    cta_label: str | None = None,
    cta_href: str | None = None,
    heading_center: bool = True,
) -> str:
    align = "center" if heading_center else "left"
    button = ""
    if cta_label and cta_href:
        button = f"""
        <tr>
          <td align="center" style="padding:32px 0;">
            <a href="{_esc(cta_href)}" style="background:#000000;border-radius:4px;color:#ffffff;display:inline-block;font-size:12px;font-weight:600;padding:12px 20px;text-decoration:none;">
              {_esc(cta_label)}
            </a>
          </td>
        </tr>
        """
    support = _support_email()
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_esc(preview)}</title>
</head>
<body style="background:#ffffff;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{_esc(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:24px 8px;">
        <table class="copsstec-email-root" role="presentation" width="465" cellpadding="0" cellspacing="0" style="border:1px solid #eaeaea;border-radius:8px;max-width:465px;padding:20px;width:100%;">
          <tr>
            <td align="center" style="padding:32px 0 0;">
              <img src="{_esc(_logo_url())}" width="200" height="50" alt="Copsstec" style="display:block;margin:0 auto;border:0;" />
            </td>
          </tr>
          {f'''<tr>
            <td align="{align}" style="color:#000000;font-size:24px;font-weight:400;padding:30px 0;">{heading}</td>
          </tr>''' if heading else ""}
          <tr>
            <td style="color:#000000;font-size:14px;line-height:24px;">{inner_html}</td>
          </tr>
          {button}
          <tr>
            <td style="border-top:1px solid #eaeaea;padding-top:26px;color:#666666;font-size:12px;line-height:24px;">
              Este mensaje fue realizado por la plataforma <span style="color:#000000;">COPSSTEC WEB</span>.
              Este mensaje fue enviado desde <span style="color:#000000;">Quito, Ecuador</span>.
              Si no esperabas este mensaje, puedes ignorarlo. Si tienes alguna preocupación,
              responde a este correo o escribe a
              <a href="mailto:{_esc(support)}" style="color:#2563eb;">{_esc(support)}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def render_access_credentials(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "miembro"
    email = context.get("email") or ""
    password = context.get("password") or ""
    subject = f"{nombres}, estas son tus credenciales"
    text = (
        f"Hola {nombres},\n\n"
        f"Para ingresar al portal usa el correo {email}.\n"
        f"Contraseña temporal: {password}\n\n"
        f"Entra aquí: {_login_url()}\n"
    )
    inner = f"""
      <p style="margin:0 0 16px;">Hola ! {_esc(nombres)},</p>
      <p style="margin:0;">
        <strong>Para ingresar en el portal web debes usar el siguiente correo:</strong>
        (<a href="mailto:{_esc(email)}" style="color:#2563eb;text-decoration:none;">{_esc(email)}</a>),
        la contraseña temporal es: <strong>{_esc(password)}</strong>
      </p>
    """
    html = branded_layout(
        preview=f"! {nombres}, estas son tus credenciales",
        heading='Credenciales de<strong> acceso</strong> de <strong>usuario</strong> !',
        inner_html=inner,
        cta_label="Ingresar al portal",
        cta_href=_login_url(),
    )
    return subject, text, html


def render_corporate_mailbox(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "miembro"
    email = context.get("email") or ""
    password = context.get("password") or ""
    subject = "Tu correo corporativo COPSSTEC"
    text = (
        f"Estimado/a {nombres},\n\n"
        "Bienvenido al Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador (COPSSTEC).\n\n"
        f"Correo corporativo: {email}\n"
        f"Contraseña temporal: {password}\n\n"
        "1. Inicie sesión en su cuenta de correo corporativo.\n"
        "2. Cambie su contraseña en la opción Cambiar Contraseña.\n\n"
        f"Ir al correo: {_mailbox_url()}\n"
    )
    inner = f"""
      <p style="margin:0 0 8px;font-size:16px;text-align:center;">Estimado/a <strong>{_esc(nombres)}</strong></p>
      <p style="margin:0 0 24px;font-size:16px;text-align:center;">
        🎉 ¡BIENVENIDO al Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador
        <strong>(COPSSTEC)</strong>!
      </p>
      <p style="margin:0 0 16px;">
        A continuación, le proporcionamos los datos de acceso a su correo corporativo:<br />
        <a href="mailto:{_esc(email)}" style="color:#2563eb;text-decoration:none;">{_esc(email)}</a><br />
        🔑 Contraseña temporal: <strong style="color:#2563eb;">{_esc(password)}</strong>
      </p>
      <p style="margin:24px 0 16px;">
        <strong>Primeros pasos:</strong><br />
        1️⃣ Inicie sesión en su cuenta de correo corporativo.<br />
        2️⃣ Recomendado: Cambie su contraseña en la opción "Cambiar Contraseña" dentro del menú.
      </p>
      <p style="margin:0 0 16px;">
        📌 <strong>Importante:</strong><br />
        - En su correo corporativo encontrará un mensaje de bienvenida con las instrucciones para acceder al portal web de COPSSTEC.<br />
        - Es fundamental mantener activo su correo corporativo, ya que toda la información oficial de COPSSTEC será enviada a esta cuenta.
      </p>
      <p style="margin:0;">Bienvenido(a) a COPSSTEC. ¡Estamos felices de contar con su participación en el colegio!</p>
    """
    html = branded_layout(
        preview=f"! {nombres}, estas son tus credenciales",
        heading="",
        inner_html=inner,
        cta_label="Ir a mi correo",
        cta_href=_mailbox_url(),
        heading_center=True,
    )
    return subject, text, html


def _resume_url() -> str:
    return f"{_settings().frontend_origin.rstrip('/')}/continuar-afiliacion"


def render_affiliation_resume(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "aspirante"
    code = context.get("code") or ""
    minutes = context.get("expire_minutes") or 15
    resume_url = context.get("resume_url") or _resume_url()
    subject = "Continúa tu afiliación a COPSSTEC"
    text = (
        f"Hola {nombres},\n\n"
        "Usa este código para continuar tu afiliación a COPSSTEC:\n"
        f"{code}\n\n"
        f"El código vence en {minutes} minutos y solo se puede usar una vez.\n"
        f"Continúa aquí: {resume_url}\n"
    )
    inner = f"""
      <p style="margin:0 0 16px;">Hola {_esc(nombres)},</p>
      <p style="margin:0 0 16px;">
        Recibimos una solicitud para continuar tu afiliación a COPSSTEC.
        Ingresa el siguiente código. Vence en {_esc(minutes)} minutos y es de un solo uso.
      </p>
      <p style="margin:0 0 8px;">Código para continuar:</p>
      <p style="background:#e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;letter-spacing:6px;line-height:32px;margin:0 0 24px;padding:24px;text-align:center;">
        {_esc(code)}
      </p>
      <p style="margin:0;">Si no solicitaste este código, ignora el mensaje o responde a este correo.</p>
    """
    html = branded_layout(
        preview=f"{nombres}, continúa tu afiliación a COPSSTEC",
        heading="<strong>Continúa tu afiliación</strong>",
        inner_html=inner,
        cta_label="Continuar afiliación",
        cta_href=resume_url,
    )
    return subject, text, html


def render_password_reset(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "usuario"
    token = context.get("token") or ""
    reset_url = context.get("reset_url") or _login_url()
    subject = "Recupera tu acceso a COPSSTEC"
    text = (
        f"Hola {nombres},\n\n"
        "Recibimos una solicitud para restablecer tu contraseña.\n"
        f"Enlace: {reset_url}\n"
        f"Si el enlace no funciona, usa este código: {token}\n"
    )
    inner = f"""
      <p style="margin:0 0 16px;">Hola {_esc(nombres)},</p>
      <p style="margin:0 0 16px;">
        Hemos recibido una solicitud para restablecer tu contraseña.
        Usa el botón o el código siguiente. El código vence en poco tiempo.
      </p>
      <p style="margin:0 0 8px;">Código de recuperación:</p>
      <p style="background:#e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;line-height:24px;margin:0 0 24px;padding:24px;text-align:center;">
        {_esc(token)}
      </p>
      <p style="margin:0;">Si no solicitaste este cambio, ignora el mensaje o responde a este correo.</p>
    """
    html = branded_layout(
        preview=f"! {nombres}, te enviamos tu código de verificación",
        heading="<strong>Código de verificación reenviado</strong>",
        inner_html=inner,
        cta_label="Restablecer contraseña",
        cta_href=reset_url,
    )
    return subject, text, html


def render_new_member_admin(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "Nuevo miembro"
    email = context.get("email") or ""
    photo = context.get("user_image") or _logo_url()
    subject = f"{nombres} es nuevo miembro"
    text = (
        f"Hola administrador,\n\n"
        f"{nombres} ({email}) acaba de afiliarse a COPSSTEC. "
        "Puedes habilitarlo desde el panel de miembros.\n"
        f"{_members_url()}\n"
    )
    inner = f"""
      <p style="margin:0 0 16px;">Hola usuario administrador,</p>
      <p style="margin:0 0 24px;">
        <strong>{_esc(nombres)}</strong>
        (<a href="mailto:{_esc(email)}" style="color:#2563eb;text-decoration:none;">{_esc(email)}</a>)
        acaba de afiliarse al <strong>COPSSTEC</strong>.
        Puedes habilitar el usuario desde el administrador.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="right" width="45%">
            <img src="{_esc(photo)}" width="64" height="64" alt="" style="border-radius:32px;display:block;" />
          </td>
          <td align="center" width="10%" style="font-size:24px;">→</td>
          <td align="left" width="45%">
            <img src="{_esc(_logo_url())}" width="64" height="64" alt="COPSSTEC" style="border-radius:32px;display:block;" />
          </td>
        </tr>
      </table>
    """
    html = branded_layout(
        preview=f"! {nombres} es nuevo Miembro",
        heading="Tenemos un<strong> Miembro</strong> <strong>Afiliado</strong> !",
        inner_html=inner,
        cta_label="Visualízalo en el panel",
        cta_href=_members_url(),
    )
    return subject, text, html


def render_course_inscription(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "participante"
    title = context.get("course_title") or "curso COPSSTEC"
    description = context.get("course_description") or ""
    capacitator = context.get("capacitator") or "—"
    modality = context.get("modality") or "—"
    date_course = context.get("date_course") or "—"
    hour_init = context.get("hour_init") or ""
    hour_final = context.get("hour_final") or ""
    course_link = (context.get("course_link") or "").strip()
    detail_url = context.get("detail_url") or ""
    pending = bool(context.get("pending_payment"))
    subject = (
        f"Inscripción recibida: {title}" if pending else f"Confirmación de Inscripción - {title}"
    )
    heading = "Inscripción recibida" if pending else "Confirmación de Inscripción"
    intro = (
        "Tu inscripción fue recibida. Si el curso requiere pago, administración validará el comprobante."
        if pending
        else "Nos complace confirmarte que tu inscripción ha sido procesada exitosamente. A continuación, encontrarás los detalles del curso:"
    )
    text = (
        f"Hola {nombres},\n\n{intro}\n\n"
        f"Curso: {title}\nCapacitador: {capacitator}\nModalidad: {modality}\n"
        f"Fechas: {date_course}\nHorario: {hour_init} - {hour_final}\n"
    )
    cta_label = None
    cta_href = None
    if course_link:
        cta_href = course_link
        cta_label = "Unirse a Zoom" if str(modality).lower() == "online" else "Enlace de conexión / aula virtual"
    elif not pending and detail_url:
        cta_href = detail_url
        cta_label = "Ver detalles del curso"
    description_html = ""
    if description:
        description_html = f"""
        <p style="margin:0 0 24px;"><strong>Descripción del curso:</strong><br />{_nl2br(description)}</p>
        """
    inner = f"""
      <p style="margin:0 0 16px;font-size:16px;">Hola <strong>{_esc(nombres)}</strong>,</p>
      <p style="margin:0 0 16px;">{_esc(intro)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin:16px 0;">
        <tr>
          <td align="center" style="padding:16px;">
            <p style="color:#1e40af;font-size:18px;font-weight:700;margin:0 0 8px;">{_esc(title)}</p>
            <p style="color:#374151;font-size:14px;margin:0;">
              <strong>Capacitador:</strong> {_esc(capacitator)}<br />
              <strong>Modalidad:</strong> {_esc(modality)}<br />
              <strong>Fechas:</strong> {_esc(date_course)}<br />
              <strong>Horario:</strong> {_esc(hour_init)} - {_esc(hour_final)}
            </p>
          </td>
        </tr>
      </table>
      {description_html}
      <p style="margin:16px 0 0;">¿Necesitas ayuda adicional? Estamos aquí para asistirte.</p>
    """
    html = branded_layout(
        preview=f"{heading} - {nombres} - {title}",
        heading=f"<strong>{_esc(heading)}</strong>",
        inner_html=inner,
        cta_label=cta_label,
        cta_href=cta_href,
    )
    return subject, text, html


def render_course_payment_rejected(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "participante"
    title = context.get("course_title") or "curso"
    observation = context.get("observation") or ""
    subject = "Pago no validado"
    text = f"Hola {nombres},\n\nNo fue posible validar tu pago del curso {title}.\nObservación: {observation}\n"
    inner = f"""
      <p style="margin:0 0 16px;">Hola <strong>{_esc(nombres)}</strong>,</p>
      <p style="margin:0 0 16px;">No fue posible validar tu pago para el curso <strong>{_esc(title)}</strong>.</p>
      <table role="presentation" width="100%" style="background:#f9fafb;border-radius:8px;">
        <tr><td style="padding:16px;"><strong>Observación:</strong><br />{_nl2br(observation)}</td></tr>
      </table>
    """
    html = branded_layout(
        preview=subject,
        heading=f"<strong>{_esc(subject)}</strong>",
        inner_html=inner,
    )
    return subject, text, html


def render_course_certificate(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "participante"
    title = context.get("course_title") or "curso"
    subject = "Certificado de curso COPSSTEC"
    text = (
        f"Hola {nombres},\n\n"
        f"Felicitaciones por completar el curso {title}. "
        "Adjuntamos tu certificado oficial.\n"
    )
    inner = f"""
      <p style="margin:0 0 16px;font-size:16px;">Hola <strong>{_esc(nombres)}</strong>,</p>
      <p style="margin:0 0 16px;">Felicitaciones por haber completado exitosamente y asistido al curso:</p>
      <table role="presentation" width="100%" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
        <tr>
          <td align="center" style="padding:16px;">
            <p style="color:#1e40af;font-size:18px;font-weight:700;margin:0;">{_esc(title)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0;">Adjunto a este correo encontrarás tu certificado oficial. ¡Puedes guardarlo y compartirlo!</p>
      <p style="margin:0;">Sigue capacitándote con nosotros y construyendo tu futuro profesional en COPSSTEC.</p>
    """
    html = branded_layout(
        preview=f"Tu certificado del curso {title} está listo",
        heading="<strong>Certificado de Curso</strong>",
        inner_html=inner,
    )
    return subject, text, html


def render_course_feedback(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "participante"
    url = context.get("url") or _site_url()
    title = context.get("course_title") or "curso"
    subject = "Califica tu experiencia en el curso"
    text = f"Hola {nombres},\n\nGracias por asistir a {title}. Califica tu experiencia aquí: {url}\n"
    inner = f"""
      <p style="margin:0 0 16px;">Hola <strong>{_esc(nombres)}</strong>,</p>
      <p style="margin:0;">Gracias por asistir a <strong>{_esc(title)}</strong>. Tu opinión nos ayuda a mejorar. Califica tu experiencia con el botón.</p>
    """
    html = branded_layout(
        preview=subject,
        heading=f"<strong>{_esc(subject)}</strong>",
        inner_html=inner,
        cta_label="Calificar experiencia",
        cta_href=url,
    )
    return subject, text, html


def render_branded_content(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or ""
    subject = context.get("subject") or "Mensaje COPSSTEC"
    content = context.get("content") or context.get("body") or ""
    text = context.get("text") or _strip_html(content)
    greeting = f"Estimado miembro del Colegio, {nombres}," if nombres else subject
    heading = f"<strong>{_esc(greeting)}</strong>" if nombres else f"<strong>{_esc(subject)}</strong>"
    inner = f"""
      <div style="color:#000000;font-size:14px;line-height:24px;">{content}</div>
    """
    cta_label = context.get("cta_label")
    cta_href = context.get("cta_href")
    html = branded_layout(
        preview=greeting if nombres else subject,
        heading=heading,
        inner_html=inner,
        cta_label=cta_label,
        cta_href=cta_href,
        heading_center=False,
    )
    return subject, text, html


def render_debit_agreement(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "miembro"
    amount = context.get("pending_balance") or "0.00"
    url = context.get("url") or f"{_site_url()}/acuerdo-debito"
    subject = f"Autorización de débito pendiente - {nombres}"
    text = (
        f"Hola {nombres},\n\n"
        f"Tienes un saldo pendiente de membresía por USD {amount}.\n"
        "Descarga la autorización de débito, fírmala y súbela junto con tu cédula. "
        "El enlace vence en 30 días.\n"
        f"{url}\n"
    )
    inner = f"""
      <p style="margin:0 0 16px;font-size:16px;">Hola <strong>{_esc(nombres)}</strong>,</p>
      <p style="margin:0 0 16px;">
        Tienes un saldo pendiente de membresía. Para regularizar el débito, descarga
        la autorización ADV, fírmala y súbela junto con la copia de tu cédula.
      </p>
      <table role="presentation" width="100%" style="background:#f3f4f6;border-radius:8px;margin:16px 0;">
        <tr><td align="center" style="padding:16px;font-size:24px;font-weight:700;">USD ${_esc(amount)}</td></tr>
      </table>
      <p style="margin:0 0 16px;">
        El enlace es personal y vence en 30 días. No necesitas iniciar sesión.
      </p>
      <p style="margin:0;">Si ya enviaste los documentos, puedes ignorar este mensaje.</p>
    """
    html = branded_layout(
        preview=subject,
        heading="<strong>Autorización de débito pendiente</strong>",
        inner_html=inner,
        cta_label="Completar autorización",
        cta_href=url,
    )
    return subject, text, html


def render_payment_reminder(context: dict) -> tuple[str, str, str]:
    nombres = context.get("nombres") or "miembro"
    amount = context.get("valor_pendiente") or "0.00"
    url = context.get("url_pago") or f"{_site_url()}/afiliacion/pago"
    subject = f"Recordatorio de pago pendiente - {nombres}"
    text = (
        f"Hola {nombres},\n\nTienes un pago pendiente por ${amount}.\n"
        f"Completa el pago aquí: {url}\n"
    )
    inner = f"""
      <p style="margin:0 0 16px;font-size:16px;">Hola <strong>{_esc(nombres)}</strong>,</p>
      <p style="margin:0 0 16px;">Te recordamos que tienes un pago pendiente por valor de:</p>
      <table role="presentation" width="100%" style="background:#f3f4f6;border-radius:8px;margin:16px 0;">
        <tr><td align="center" style="padding:16px;font-size:24px;font-weight:700;">${_esc(amount)}</td></tr>
      </table>
      <p style="margin:0 0 16px;">Para completar tu pago y evitar interrupciones, usa el botón siguiente.</p>
      <p style="margin:0;">Si ya realizaste el pago, ignora este mensaje. La verificación puede tomar hasta 24 horas.</p>
    """
    html = branded_layout(
        preview=subject,
        heading="<strong>Recordatorio de pago pendiente</strong>",
        inner_html=inner,
        cta_label="Realizar pago ahora",
        cta_href=url,
    )
    return subject, text, html


RENDERERS = {
    "access_credentials": render_access_credentials,
    "corporate_mailbox": render_corporate_mailbox,
    "password_reset": render_password_reset,
    "affiliation_resume": render_affiliation_resume,
    "new_member_admin": render_new_member_admin,
    "course_inscription_received": lambda ctx: render_course_inscription({**ctx, "pending_payment": True}),
    "course_inscription_confirmed": render_course_inscription,
    "course_payment_rejected": render_course_payment_rejected,
    "course_certificate": render_course_certificate,
    "course_feedback": render_course_feedback,
    "branded_content": render_branded_content,
    "payment_reminder": render_payment_reminder,
    "debit_agreement": render_debit_agreement,
}


def render_email(template_key: str, context: dict | None = None) -> tuple[str, str, str]:
    data = dict(context or {})
    renderer = RENDERERS.get(template_key)
    if renderer is None:
        return render_branded_content(data)
    return renderer(data)


def reset_url_for(email: str, token: str) -> str:
    origin = _settings().frontend_origin.rstrip("/")
    return f"{origin}/reset-password?email={quote(email)}&token={quote(token)}"


def _strip_html(value: str) -> str:
    import re
    from html import unescape

    text = re.sub(r"(?i)<br\s*/?>", "\n", value or "")
    text = re.sub(r"(?i)</p>", "\n\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return unescape(re.sub(r"\n{3,}", "\n\n", text)).strip()
