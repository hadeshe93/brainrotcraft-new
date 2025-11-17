'use client';

import { cn } from '@/lib/utils';
import { Footer as FooterType } from '@/types/blocks/footer';
import Icon from '@/components/icon';
import { Link } from '@/i18n/navigation';
import StripeClimate from '@/components/strip-climate';
import BrandImage from '@/components/brand-image';
import MarkdownRenderer from '@/components/markdown-renderer';
import { LanguageCode } from '@/types/lang';
import { usePathname } from 'next/navigation';

interface FooterProps {
  locale: LanguageCode;
  config: FooterType;
  className?: string;
}

export default function Footer({ locale, className, config }: FooterProps) {
  const pathname = usePathname();
  const isCMSPage = pathname?.startsWith('/admin') || pathname?.includes('/admin/');
  if (isCMSPage) return null;

  const { brand, copyright, nav, social, badge, agreement } = config;
  // 社交图标映射
  const getSocialIcon = (type: string) => {
    const iconNameMap: { [key: string]: string } = {
      twitter: 'MdiTwitter', // X (Twitter)
      github: 'MdiGithub', // GitHub
      bluesky: 'TablerBrandBluesky', // Bluesky
      discord: 'TablerBrandDiscord', // Discord
      linktree: 'PhLinktreeLogo', // Discord
      pinterest: 'MdiPinterest', // Pinterest
      email: 'MdiEnvelopeOutline', // Email
      'ko-fi': 'HugeiconsKoFi', // Ko-fi
    };
    return iconNameMap[type] || '';
  };

  return (
    <footer className={cn('bg-muted/20', className)}>
      <div className="block-section max-w-7xl">
        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
          {/* 品牌信息 - 移动端全宽，桌面端占两列 */}
          <div className="space-y-4 md:col-span-2">
            {/* Logo 和标题 */}
            <Link className="flex items-center gap-3" href={brand.link.url} target={brand.link.target || '_self'}>
              <BrandImage src={config.brand.logo.url} alt={config.brand.title} />
              <div className="text-foreground text-xl font-semibold md:text-2xl">{brand.title}</div>
            </Link>

            {/* 品牌描述 */}
            {brand.description && (
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{brand.description}</p>
            )}

            {brand.extraDescriptions && (
              <div className="text-muted-foreground max-w-sm text-xs leading-relaxed">
                {brand.extraDescriptions.map((item, index) => (
                  <MarkdownRenderer key={index} locale={locale} content={item} />
                ))}
              </div>
            )}

            {/* 社交媒体图标 */}
            <div className="flex items-center gap-1 pt-2">
              {social.items.map((item, index) => (
                <a
                  key={index}
                  href={item.link.url}
                  target={item.link.target || '_blank'}
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center rounded-md p-1 transition-colors"
                  title={item.title}
                >
                  <Icon config={{ name: getSocialIcon(item.type) }} className="size-6" />
                </a>
              ))}
            </div>

            {/* 其他徽章 */}
            <div className="flex items-center gap-2">
              {badge.items.map((item, index) => {
                if (item.type === 'stripe_climate') {
                  return <StripeClimate key={index} percentage={item.percentage} url={item.url} />;
                }
                return null;
              })}
            </div>
          </div>

          {/* 导航链接 - 移动端垂直堆叠，桌面端水平分布 */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 md:col-span-2 md:gap-8">
            {nav.map((section, index) => (
              <div key={index} className="space-y-3">
                {/* 导航标题 */}
                <div className="text-foreground text-base font-semibold">{section.title}</div>

                {/* 导航链接列表 */}
                {section.children && (
                  <ul className="space-y-2">
                    {section.children.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <Link
                          href={item.link?.url || './'}
                          target={item.link?.target}
                          rel={item.link?.rel}
                          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部版权和协议区域 */}
        <div className="border-border mt-8 flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center md:mt-12">
          {/* 版权信息 */}
          <p className="text-muted-foreground text-sm">{copyright}</p>

          {/* 协议链接 */}
          {agreement.items.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              {agreement.items.map((item, index) => (
                <Link
                  key={index}
                  href={item.link.url}
                  target={item.link.target}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
