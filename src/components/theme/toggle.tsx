"use client";

import LucideSun from '~icons/lucide/sun';
import LucideMoon from '~icons/lucide/moon';

import { cn } from '@/lib/utils';
import { gaReportEvent, GA_EVENT_MAP } from '@/lib/ga/report';
import { ThemeTypes } from '@/constants/theme';
import { useAppContext } from '@/contexts/app';

export default function ThemeToggle(props: { dataRole?: string; className?: string }) {
  const { className, ...restProps } = props;
  const appContext = useAppContext();
  const { theme, toggleTheme } = appContext;
  const onClick = () => {
    if (theme === ThemeTypes.Light) {
      gaReportEvent(GA_EVENT_MAP.ACTION_THEME_DARK);
    } else {
      gaReportEvent(GA_EVENT_MAP.ACTION_THEME_LIGHT);
    }
    console.log('appContext:', appContext);
    toggleTheme();
  };
  return (
    <button onClick={onClick} className={cn('cursor-pointer text-muted-foreground', className)} {...restProps}>
      {theme !== ThemeTypes.Light ? <LucideSun className="w-5 h-5" /> : <LucideMoon className="w-5 h-5" />}
    </button>
  );
}

