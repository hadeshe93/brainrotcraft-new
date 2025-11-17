import { ReactNode } from 'react';
import { LanguageCode } from './lang';

export type LocaleLayoutProps = Readonly<{
  children: ReactNode;
} & LocaleProps>;

export type LocalePageProps<TPageProps = any> = Readonly<LocaleProps<TPageProps>>;

export type LocaleProps<TPageProps = any> = {
  params: Promise<{ locale: LanguageCode } & TPageProps>;
};
