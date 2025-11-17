'use client';
import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SHARE_LIST } from './constant';
import { gaReportEvent } from '@/lib/ga/report';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const beforeOnlick = (evtName: string) => {
  if (!evtName) return;
  gaReportEvent(evtName);
};

export interface ShareSelectorProps {
  url?: string;
  title?: string;
}
export default function ShareSelector(props: ShareSelectorProps) {
  const { url: urlRaw = '', title: titleRaw = '' } = props;
  const tShareText = useTranslations('share.text');
  const tBizShare = useTranslations('biz.share');
  const url = urlRaw || (typeof window !== 'undefined' ? window.location.href : '');
  const title = titleRaw || tBizShare('title_home');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <Icon config={{name: 'MdiShareVariantOutline'}} className='size-5 text-muted-foreground' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32" align="end">
        {/* <DropdownMenuLabel>My Account</DropdownMenuLabel> */}
        <DropdownMenuGroup>
          {SHARE_LIST.map((item, index) => {
            const Button = item.button;
            const Icon = item.icon;
            return (
              <DropdownMenuItem className="">
                <Button
                  url={url}
                  title={title}
                  beforeOnClick={() => beforeOnlick(item.clickEvtName || '')}
                  iconClassName={index === 0 ? item.iconClassName : ''}
                  className='w-full justify-start border-none'
                >
                  <div className="flex items-center gap-2">
                    {Icon ? <Icon round className={cn(item.iconClassName, 'shrink-0 grow-0')} /> : null}
                    <span className='grow-0 text-sm text-foreground'>{tShareText(item.type)}</span>
                  </div>
                </Button>
              </DropdownMenuItem>
            );
          })}
          {/* <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem> */}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
