'use client';

import { usePathname } from 'next/navigation';
import MdiMenu from '~icons/mdi/menu';
import { Link } from '@/i18n/navigation';
import ThemeToggle from '@/components/theme/toggle';
import { NavigationMenu } from '@/components/blocks/nav';
import LocaleSelector from '@/components/locale/selector';
import ShareSelector from '@/components/share/selector';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Image from '@/components/image';
import Sidebar from '@/components/blocks/sidebar';
import { useSidebarData } from '@/hooks/use-sidebar-data';

import type { LanguageCode } from '@/types/lang';
import type { Header as HeaderType } from '@/types/blocks/header';
import { cn } from '@/lib/utils';
import SignToggle from '@/components/sign/toggle';
import BrandImage from '@/components/brand-image';

interface HeaderProps {
  config: HeaderType;
  locale: LanguageCode;
}
export default function Header(props: HeaderProps) {
  const { config, locale } = props;
  const pathname = usePathname();
  const isCMSPage = pathname?.startsWith('/admin') || pathname?.includes('/admin/');

  // Fetch sidebar data for mobile menu
  const { featuredItems, categories, tags } = useSidebarData();

  if (isCMSPage) return null;
  return (
    <header>
      {/* Wide Screen */}
      <div className="block-section-width hidden items-center justify-between py-3 md:flex">
        {/* Left */}
        <div className="flex items-center gap-6">
          {/* Brand */}
          <div className="flex flex-shrink-0 items-center">
            <Link href={config.brand.link.url} locale={locale} className="flex cursor-pointer items-center space-x-2">
              <BrandImage src={config.brand.logo.url} alt={config.brand.title} />
              <span className="brand text-xl font-bold">{config.brand.title}</span>
            </Link>
          </div>
          {/* Navigation Menu */}
          <NavigationMenu locale={props.locale} items={config.nav} />
        </div>
        {/* Right */}
        <div className="flex shrink-0 items-center gap-x-2">
          {/* Locale Selector */}
          {config.showLocale && <LocaleSelector />}
          {/* Share Selector */}
          {config.showShare && <ShareSelector />}
          {/* Theme Toggle */}
          {config.showTheme && <ThemeToggle />}
          {/* Sign Toggle - Always show on CMS pages */}
          {config.showSign && <SignToggle />}
        </div>
      </div>

      {/* Mobile Screen */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-2 py-3 md:hidden">
        {/* Brand */}
        <div className="flex flex-shrink-0 items-center">
          <Link
            href={config.brand.link.url}
            locale={props.locale}
            className="flex cursor-pointer items-center space-x-2"
          >
            <Image
              widthSet={[64, 128]}
              widthSizes={{ default: '64px', minLg: '128px' }}
              src={config.brand.logo.url}
              alt={config.brand.title}
              className="size-8"
            />
            <span className="brand text-base font-bold">{config.brand.title}</span>
          </Link>
        </div>
        {/* Collapsed Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="default" size="icon">
              <MdiMenu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <div className="flex items-center gap-2">
                  <Image width="32" src={config.brand.logo.url} alt={config.brand.title} className="size-8" />
                  <span className="text-xl font-bold">{config.brand.title}</span>
                </div>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4">
              <Accordion type="single" collapsible className="w-full">
                {config.nav.map((item, i) => {
                  if (item.children && item.children.length > 0) {
                    return (
                      <AccordionItem key={i} value={item.title || ''} className="border-b-0">
                        <AccordionTrigger className="mb-4 py-0 text-left font-semibold hover:no-underline">
                          {item.title}
                        </AccordionTrigger>
                        <AccordionContent className="mt-2">
                          {item.children.map((iitem, ii) => (
                            <Link
                              key={ii}
                              className={cn(
                                'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex gap-4 rounded-md p-3 leading-none transition-colors outline-none select-none',
                              )}
                              locale={props.locale}
                              href={iitem.link?.url || ''}
                              target={iitem.link?.target || ''}
                            >
                              <div className="text-muted-foreground">
                                <div className="text-sm font-semibold">{iitem.title}</div>
                                <p className="text-sm leading-snug">{iitem.description}</p>
                              </div>
                            </Link>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  }
                  return (
                    <Link
                      key={i}
                      locale={props.locale}
                      href={item.link?.url || ''}
                      target={item.link?.target || ''}
                      className="text-muted-foreground hover:text-accent-foreground focus:text-accent-foreground my-4 flex items-center gap-2 font-semibold"
                    >
                      {item.title}
                    </Link>
                  );
                })}
              </Accordion>

              {/* Sidebar Content - Mobile Only */}
              <div className="border-t pt-4">
                <Sidebar featuredItems={featuredItems} categories={categories} tags={tags} />
              </div>
            </div>
            <div className="flex-1"></div>
            <div className="border-t pt-4">
              <div className="mt-4 flex items-center gap-2">
                {config.showLocale && <LocaleSelector />}
                <div className="flex-1"></div>
                {config.showTheme && <ThemeToggle />}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
