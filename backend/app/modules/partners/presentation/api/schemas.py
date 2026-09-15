from pydantic import BaseModel

from app.modules.partners.domain.entities import Partner


class PartnerResponse(BaseModel):
    id: int
    name: str
    slogan: str | None
    description: str
    logo_url: str
    link: str | None
    sort_order: int

    @classmethod
    def from_domain(cls, partner: Partner) -> "PartnerResponse":
        return cls(
            id=partner.id,
            name=partner.name,
            slogan=partner.slogan,
            description=partner.description,
            logo_url=partner.logo_url,
            link=partner.link,
            sort_order=partner.sort_order,
        )
