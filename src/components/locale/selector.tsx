'use client';

import { useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import LucideGlobe from '~icons/lucide/globe';
import { LANGUAGES } from '@/i18n/language';

export default function LocaleSelector() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const pathname = usePathname();
  const currentLanguage = LANGUAGES.find((LANG) => LANG.lang === locale);
  const [isPending, startTransition] = useTransition();

  const handleSwitchLanguage = (value: string) => {
    if (value !== locale) {
      startTransition(() => {
        router.replace(pathname, { locale: value });
      });
    }
  };

  return (
    <Select value={locale} onValueChange={handleSwitchLanguage} disabled={isPending}>
      <SelectTrigger className="text-muted-foreground flex cursor-pointer items-center gap-x-2 border-none shadow-none outline-none hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 disabled:opacity-50">
        <LucideGlobe className="text-xl" />
        <span className="hidden md:block">{currentLanguage?.language || ''}</span>
      </SelectTrigger>
      <SelectContent className="z-50">
        {LANGUAGES.map((LANG) => {
          return (
            <SelectItem className="cursor-pointer" key={LANG.lang} value={LANG.lang}>
              {LANG.language}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
