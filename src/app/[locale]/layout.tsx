import type { Metadata, Viewport } from 'next';
import { notFound, usePathname } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import NextTopLoader from 'nextjs-toploader';
import { routing } from '@/i18n/routing';
import type { LocaleLayoutProps } from '@/types/page';
import { getPageContent, wrapForI18n } from '@/i18n/utils';
import { DOMAIN } from '@/constants/config';
import type { LocaleProps } from '@/types/page';
import Header from '@/components/blocks/header';
import Footer from '@/components/blocks/footer';
import { AppContextProvider } from '@/contexts/app';
import { NextAuthSessionProvider } from '@/contexts/auth';
import { Toaster } from '@/components/ui/sonner';
import Canonical from '@/components/canonical';
import HrefLangs from '@/components/href-langs';
import GoogleTag from '@/components/blocks/google-tag';
import { DialogProvider } from '@/contexts/dialog';
import { DEFAULT_THEME, ThemeTypes } from '@/constants/theme';

import '@/app/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// export const dynamicParams = false;
export function generateStaticParams() {
  return routing.locales.map((lang) => ({ locale: lang }));
}

export async function generateMetadata(props: LocaleProps): Promise<Metadata> {
  const { locale } = await props.params;
  const { metadata } = await getPageContent<'layout'>({ key: 'layout', locale });
  const homePageUrl = `https://${DOMAIN}`;
  return {
    title: metadata.title,
    description: metadata.description,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      type: 'website',
      url: homePageUrl,
    },
    twitter: {
      card: 'summary',
      title: metadata.title,
      description: metadata.description,
      images: [metadata.image!.url],
    },
  };
}

async function RootLayout({ children, params }: Readonly<LocaleLayoutProps>) {
  // if (!checkIsDevEnv()) {
  //   notFound();
  // }
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const { header, footer } = await getPageContent<'layout'>({ key: 'layout', locale });
  const defaultThemeProps = DEFAULT_THEME === ThemeTypes.Dark ? { className: 'dark', ['data-theme']: 'dark' } : {};
  return (
    <html lang={locale} suppressHydrationWarning {...defaultThemeProps}>
      <head>
        <Canonical locale={locale} />
        <HrefLangs locale={locale} />
        <GoogleTag />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider>
          <NextAuthSessionProvider>
            <DialogProvider>
              <AppContextProvider>
                <NextTopLoader shadow={false} showSpinner={false} color="#0073E9" />
                <Header locale={locale} config={header} />
                {children}
                <Toaster />
                <Footer locale={locale} config={footer} />
              </AppContextProvider>
            </DialogProvider>
          </NextAuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export default wrapForI18n(RootLayout);
