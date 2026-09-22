from app.modules.auth.domain.entities import AccessPolicy


ROLE_ACCESS_LEVELS: dict[str, str] = {
    "admin": "admin",
    "miembro": "member",
    "bibliotecario": "operations",
    "congreso-consejo": "operations",
    "congreso-admin": "operations",
}

ACCESS_PRIORITY: dict[str, int] = {
    "restricted": 0,
    "member": 1,
    "operations": 2,
    "admin": 3,
}

NAVIGATION_BY_ACCESS: dict[str, list[dict]] = {
    "member": [
        {"label": "Dashboard", "href": "/dashboard"},
        {"label": "Mis cursos", "href": "/mi-espacio/cursos"},
        {"label": "Mis pagos", "href": "/mi-espacio/pagos"},
        {"label": "Mi espacio", "href": "/mi-espacio"},
        {"label": "Mi perfil", "href": "/profile"},
        {"label": "Votaciones", "href": "/mi-espacio/votaciones"},
    ],
    "operations": [
        {"label": "Dashboard", "href": "/dashboard"},
    ],
    "admin": [
        {"label": "Dashboard", "href": "/dashboard"},
        {"label": "Miembros", "href": "/admin/miembros"},
        {"label": "Pagos", "href": "/admin/pagos"},
        {"label": "Cursos", "href": "/admin/cursos"},
        {"label": "Blogs", "href": "/admin/blogs"},
        {"label": "Avisos", "href": "/admin/avisos"},
        {"label": "Documentos", "href": "/admin/documentos"},
        {
            "label": "Votaciones",
            "href": "/admin/votaciones",
            "children": [
                {"label": "Listas de candidatos", "href": "/admin/votaciones/listas"},
                {"label": "Calendario electoral", "href": "/admin/votaciones/calendario"},
                {"label": "Configuración", "href": "/admin/votaciones/configuracion"},
                {"label": "Votantes habilitados", "href": "/admin/votaciones/votantes"},
                {"label": "Reportes de votación", "href": "/admin/votaciones/reportes"},
            ],
        },
    ],
    "restricted": [
        {"label": "Dashboard", "href": "/dashboard"},
    ],
}


def flatten_navigation_hrefs(items: list[dict]) -> list[str]:
    hrefs: list[str] = []
    for item in items:
        href = item.get("href")
        if href:
            hrefs.append(str(href))
        hrefs.extend(flatten_navigation_hrefs(item.get("children") or []))
    return hrefs


def resolve_access_level(roles: list[str]) -> str:
    resolved_access_level = "restricted"

    for role in roles:
        access_level = ROLE_ACCESS_LEVELS.get(role, "restricted")

        if ACCESS_PRIORITY[access_level] > ACCESS_PRIORITY[resolved_access_level]:
            resolved_access_level = access_level

    return resolved_access_level


def resolve_access_policy(roles: list[str]) -> AccessPolicy:
    access_level = resolve_access_level(roles)
    navigation = NAVIGATION_BY_ACCESS[access_level]

    return AccessPolicy(
        access_level=access_level,
        roles=roles,
        allowed_routes=flatten_navigation_hrefs(navigation),
        navigation=navigation,
    )


def can_access(current_access_level: str, required_access: str) -> bool:
    if current_access_level == "admin":
        return True

    if required_access == "authenticated":
        return current_access_level != "restricted"

    return current_access_level == required_access
