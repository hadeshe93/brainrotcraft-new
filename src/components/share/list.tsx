'use client';
import { useCallback } from 'react';
import {
  TwitterShareButton,
  FacebookShareButton,
  TelegramShareButton,
  LineShareButton,
  LinkedinShareButton,
  TumblrShareButton,
  RedditShareButton,
  XIcon,
  FacebookIcon,
  TelegramIcon,
  LineIcon,
  LinkedinIcon,
  TumblrIcon,
  RedditIcon,
} from 'react-share';
import { cn } from '@/lib/utils';
import ShareLinkButton from './link-button';
import { gaReportEvent, GA_EVENT_MAP } from '@/lib/ga/report';

export interface ShareListProps {
  className?: string;
  url?: string;
  iconClassName?: string;
  title: string;
}

const ICON_CLASS_NAME = 'size-8';
const HOVER_CLASS_NAME = 'hover:scale-110 transition-all duration-300';
export default function ShareList(props: ShareListProps) {
  const { className, title, url, iconClassName: iconClassNameRaw } = props;
  const iconClassName = iconClassNameRaw || ICON_CLASS_NAME;
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const beforeOnlick = useCallback((evtName: string) => {
    gaReportEvent(evtName);
  }, []);
  return (
    <div className={`flex flex-wrap md:flex-nowrap justify-center items-center gap-4 ${className || ''}`}>
      <ShareLinkButton url={shareUrl} className={cn(HOVER_CLASS_NAME)} iconClassName={iconClassName} beforeOnClick={() => beforeOnlick(GA_EVENT_MAP.ACTION_SHARE_LINK)} />
      <TwitterShareButton url={shareUrl} title={title} className={cn(HOVER_CLASS_NAME)} beforeOnClick={() => beforeOnlick(GA_EVENT_MAP.ACTION_SHARE_TWITTER)}>
        <XIcon round className={iconClassName} />
      </TwitterShareButton>
      <FacebookShareButton url={shareUrl} title={title} className={cn(HOVER_CLASS_NAME)} beforeOnClick={() => beforeOnlick(GA_EVENT_MAP.ACTION_SHARE_FACEBOOK)}>
        <FacebookIcon round className={iconClassName} />
      </FacebookShareButton>
      <TelegramShareButton url={shareUrl} title={title} className={cn(HOVER_CLASS_NAME)} beforeOnClick={() => beforeOnlick(GA_EVENT_MAP.ACTION_SHARE_TELEGRAM)}>
        <TelegramIcon round className={iconClassName} />
      </TelegramShareButton>
      <LinkedinShareButton url={shareUrl} title={title} className={cn(HOVER_CLASS_NAME)} beforeOnClick={() => beforeOnlick(GA_EVENT_MAP.ACTION_SHARE_LINKEDIN)}>
        <LinkedinIcon round className={iconClassName} />
      </LinkedinShareButton>
      <TumblrShareButton url={shareUrl} title={title} className={cn(HOVER_CLASS_NAME)} beforeOnClick={() => beforeOnlick(GA_EVENT_MAP.ACTION_SHARE_TUMBLR)}>
        <TumblrIcon round className={iconClassName} />
      </TumblrShareButton>
      <RedditShareButton url={shareUrl} title={title} className={cn(HOVER_CLASS_NAME)} beforeOnClick={() => beforeOnlick(GA_EVENT_MAP.ACTION_SHARE_REDDIT)}>
        <RedditIcon round className={iconClassName} />
      </RedditShareButton>
      <LineShareButton url={shareUrl} title={title} className={cn(HOVER_CLASS_NAME)} beforeOnClick={() => beforeOnlick(GA_EVENT_MAP.ACTION_SHARE_LINE)}>
        <LineIcon round className={iconClassName} />
      </LineShareButton>
    </div>
  );
}
