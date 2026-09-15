import Script from "next/script";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export function AnalyticsScripts() {
  return (
    <>
      {GTM_ID ? (
        <Script id="gtm" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
(function(w,d,s,l,i){w[l]=w[l]||[];var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      ) : null}
      {GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: true });`}
          </Script>
        </>
      ) : null}
    </>
  );
}

export function AnalyticsNoscript() {
  if (!GTM_ID) {
    return null;
  }

  return (
    <noscript>
      <iframe
        height="0"
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
        width="0"
      />
    </noscript>
  );
}
