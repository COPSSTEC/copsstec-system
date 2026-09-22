interface AffiliationAmountBannerProps {
  amount: string | number;
  currency: string;
}

function toNumericAmount(amount: string | number): number {
  const numeric = typeof amount === "number" ? amount : Number.parseFloat(String(amount).replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function AffiliationAmountBanner({ amount, currency }: AffiliationAmountBannerProps) {
  const numeric = toNumericAmount(amount);
  const currencyCode = currency.trim() || "USD";
  const fullAmount = `${currencyCode} ${numeric.toFixed(2)}`;
  const compactAmount = Number.isInteger(numeric) ? `$${numeric.toFixed(0)}` : `$${numeric.toFixed(2)}`;

  return (
    <aside aria-label={`Valor de afiliación ${fullAmount}`} className="affiliation-amount-banner">
      <div className="affiliation-amount-banner-copy">
        <span>Valor de afiliación</span>
        <strong>Paga exactamente este monto</strong>
      </div>
      <div className="affiliation-amount-banner-value">
        <b>{fullAmount}</b>
        <em>{compactAmount}</em>
      </div>
    </aside>
  );
}
