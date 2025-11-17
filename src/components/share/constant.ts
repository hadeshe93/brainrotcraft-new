import type { ReactNode, FC, ForwardRefExoticComponent } from 'react';
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
import MdiLinkVariant from '~icons/mdi/link-variant';
import { GA_EVENT_MAP } from '@/lib/ga/report';
import ShareLinkButton from './link-button';

type ShareList = {
  type: string;
  button: ForwardRefExoticComponent<any> | FC<any>;
  icon: FC<any> | null;
  url?: string;
  iconClassName?: string;
  clickEvtName?: string;
}[];

const iconClassName = 'size-6'
export const SHARE_LIST: ShareList = [
  {
    type: 'link',
    button: ShareLinkButton,
    icon: MdiLinkVariant,
    iconClassName,
    clickEvtName: GA_EVENT_MAP.ACTION_SHARE_LINK,
  },
  {
    type: 'twitter',
    button: TwitterShareButton,
    icon: XIcon,
    iconClassName,
    clickEvtName: GA_EVENT_MAP.ACTION_SHARE_TWITTER,
  },
  {
    type: 'facebook',
    button: FacebookShareButton,
    icon: FacebookIcon,
    iconClassName,
    clickEvtName: GA_EVENT_MAP.ACTION_SHARE_FACEBOOK,
  },
  {
    type: 'telegram',
    button: TelegramShareButton,
    icon: TelegramIcon,
    iconClassName,
    clickEvtName: GA_EVENT_MAP.ACTION_SHARE_TELEGRAM,
  },
  {
    type: 'line',
    button: LineShareButton,
    icon: LineIcon,
    iconClassName,
    clickEvtName: GA_EVENT_MAP.ACTION_SHARE_LINE,
  },
  {
    type: 'linkedin',
    button: LinkedinShareButton,
    icon: LinkedinIcon,
    iconClassName,
    clickEvtName: GA_EVENT_MAP.ACTION_SHARE_LINKEDIN,
  },
  {
    type: 'tumblr',
    button: TumblrShareButton,
    icon: TumblrIcon,
    iconClassName,
    clickEvtName: GA_EVENT_MAP.ACTION_SHARE_TUMBLR,
  },
  {
    type: 'reddit',
    button: RedditShareButton,
    icon: RedditIcon,
    iconClassName,
    clickEvtName: GA_EVENT_MAP.ACTION_SHARE_REDDIT,
  },
];
