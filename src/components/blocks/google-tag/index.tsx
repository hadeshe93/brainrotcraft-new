import { GA4_ID, ADS_PAGE_VISIT_ID } from '@/constants/config';

interface Props {
  gid?: string;
  adsPageVisitId?: string;
}

export default function GoogleTag(props: Props) {
  const { gid = GA4_ID, adsPageVisitId = ADS_PAGE_VISIT_ID } = props;
  if (!gid) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${gid}`}></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', "${gid}");
            `,
        }}
      ></script>
      {adsPageVisitId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
            if (window.location.search.includes('utm_source=google')) {
              gtag && gtag('event', 'conversion', {
                  'send_to': '${adsPageVisitId}',
                  'value': 1.0,
                  'currency': 'CNY'
              });
            }
            `,
          }}
        ></script>
      )}
    </>
  );
}
