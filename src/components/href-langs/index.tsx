'use client';
import { LANGUAGES, DEFAULT_LOCALE } from "@/i18n/language";
import { createCanonicalLink, getPathnameWithoutLocale } from "@/i18n/utils-client";
import { usePathname } from "next/navigation";

interface HrefLangsProps {
  locale: string;
}
export default function HrefLangs(props: HrefLangsProps) {
  const { locale } = props;
  const pathnameRaw = usePathname();
  const pathname = getPathnameWithoutLocale(pathnameRaw, locale);
  const enHref = createCanonicalLink(pathname, DEFAULT_LOCALE);
  const enHrefLang = LANGUAGES.find(l => l.lang === DEFAULT_LOCALE)?.lang;
  return (
    <>
      {
        LANGUAGES.map((item, idx) => {
          const { lang } = item;
          const hrefLang = lang === DEFAULT_LOCALE ? 'x-default' : lang;
          const href = createCanonicalLink(pathname, lang);
          return <link key={`${idx}_${href}`} rel="alternate" hrefLang={hrefLang} href={href} />;
        })
      }
      <link key={enHref} rel="alternate" hrefLang={enHrefLang} href={enHref} />
    </>
  );
}