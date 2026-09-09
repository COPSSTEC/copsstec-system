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

NAVIGATION_BY_ACCESS: dict[str, list[dict[str, str]]] = {
    "member": [
        {"label": "Dashboard", "href": "/dashboard"},
        {"label": "Mi espacio", "href": "/mi-espacio"},
        {"label": "Mi perfil", "href": "/profile"},
    ],
    "operations": [
        {"label": "Dashboard", "href": "/dashboard"},
        {"label": "Operaciones", "href": "/operaciones"},
        {"label": "Mi perfil", "href": "/profile"},
    ],
    "admin": [
        {"label": "Dashboard", "href": "/dashboard"},
        {"label": "Administración", "href": "/admin"},
        {"label": "Operaciones", "href": "/operaciones"},
        {"label": "Mi espacio", "href": "/mi-espacio"},
        {"label": "Mi perfil", "href": "/profile"},
    ],
    "restricted": [
        {"label": "Dashboard", "href": "/dashboard"},
        {"label": "Mi perfil", "href": "/profile"},
    ],
}


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
        allowed_routes=[item["href"] for item in navigation],
        navigation=navigation,
    )


def can_access(current_access_level: str, required_access: str) -> bool:
    if current_access_level == "admin":
        return True

    if required_access == "authenticated":
        return current_access_level != "restricted"

    return current_access_level == required_access
