'use client';
import { LANGUAGES } from "@/i18n/language";
import { createCanonicalLink, getPathnameWithoutLocale } from "@/i18n/utils-client";
import { usePathname } from "next/navigation";

export interface CanonicalProps {
  locale: string;
}
export default function Canonical(props: CanonicalProps) {
  const { locale } = props;
  const currentLangItem = LANGUAGES.find(l => l.lang === locale);
  if (!currentLangItem) return null;

  const pathnameRaw = usePathname();
  const pathname = getPathnameWithoutLocale(pathnameRaw, locale);
  const href = createCanonicalLink(pathname, locale);
  // console.log('[Canonical]:', JSON.stringify({pathname, pathnameRaw, locale, href}, null, 2));
  return (<link rel="canonical" href={href}/>);
}