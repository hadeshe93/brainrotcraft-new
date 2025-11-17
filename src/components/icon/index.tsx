// MDI
import MdiDollar from '~icons/mdi/dollar';
import MdiGithub from '~icons/mdi/github';
import MdiGoogle from '~icons/mdi/google';
import MdiTwitter from '~icons/mdi/twitter';
import MdiStarsOutline from '~icons/mdi/stars-outline';
import MdiQuestionBoxOutline from '~icons/mdi/question-box-outline';
import MdiEnvelopeOutline from '~icons/mdi/envelope-outline';
import MdiInstagram from '~icons/mdi/instagram';
import MdiPinterest from '~icons/mdi/pinterest';
import MdiClose from '~icons/mdi/close';
import MdiCheck from '~icons/mdi/check';
import MdiImageOutline from '~icons/mdi/image-outline';
import MdiSpeedometer from '~icons/mdi/speedometer';
import MdiEye from '~icons/mdi/eye';
import MdiCog from '~icons/mdi/cog';
import MdiAccountGroup from '~icons/mdi/account-group';
import MdiTrendingUp from '~icons/mdi/trending-up';
import MdiBallot from '~icons/mdi/ballot';
import MdiPalette from '~icons/mdi/palette';
import MdiTshirtCrew from '~icons/mdi/tshirt-crew';
import MdiSparkles from '~icons/mdi/sparkles';
import MdiCheckCircle from '~icons/mdi/check-circle';
import MdiDownload from '~icons/mdi/download';
import MdiRefresh from '~icons/mdi/refresh';
import MdiAccountMultiple from '~icons/mdi/account-multiple';
import MdiCubeOutline from '~icons/mdi/cube-outline';
import MdiLinkVariant from '~icons/mdi/link-variant';
import MdiHome from '~icons/mdi/home';
import MdiArrowRight from '~icons/mdi/arrow-right';
import MdiCloseCircle from '~icons/mdi/close-circle';
import MdiPackageVariantClosed from '~icons/mdi/package-variant-closed';
import MdiClockOutline from '~icons/mdi/clock-outline';
import MdiUndo from '~icons/mdi/undo';
import MdiCancel from '~icons/mdi/cancel';
import MdiHelpCircle from '~icons/mdi/help-circle';
import MdiLoading from '~icons/mdi/loading';
import MdiAlert from '~icons/mdi/alert';
import MdiPackageVariant from '~icons/mdi/package-variant';
import MdiCreditCard from '~icons/mdi/credit-card';
import MdiCalendarCheck from '~icons/mdi/calendar-check';
import MdiTimeline from '~icons/mdi/timeline';
import MdiPlus from '~icons/mdi/plus';
import MdiUpdate from '~icons/mdi/update';
import MdiNoteText from '~icons/mdi/note-text';
import MdiReceiptText from '~icons/mdi/receipt-text';
import MdiTrendingDown from '~icons/mdi/trending-down';
import MdiCoin from '~icons/mdi/coin';
import MdiArrowTopRight from '~icons/mdi/arrow-top-right';
import MdiCrownOutline from '~icons/mdi/crown-outline';
import MdiImageOffOutline from '~icons/mdi/image-off-outline';
import MdiInformationOutline from '~icons/mdi/information-outline';
import MdiCompare from '~icons/mdi/compare';
import MdiTrashCan from '~icons/mdi/trash-can';
import MdiCrossCircleOutline from '~icons/mdi/cross-circle-outline';
import MdiChevronUpCircleOutline from '~icons/mdi/chevron-up-circle-outline';
import MdiShareVariantOutline from '~icons/mdi/share-variant-outline';
import MdiCalendarClock from '~icons/mdi/calendar-clock';
import MdiInfinity from '~icons/mdi/infinity';
// Sports Icons
import MdiVolleyball from '~icons/mdi/volleyball';
import MdiBasketball from '~icons/mdi/basketball';
import MdiSoccer from '~icons/mdi/soccer';
import MdiBeach from '~icons/mdi/beach';
import MdiTimer from '~icons/mdi/timer';
import MdiShield from '~icons/mdi/shield';
import MdiPrinter from '~icons/mdi/printer';
import MdiCity from '~icons/mdi/city';
import MdiSwapHorizontal from '~icons/mdi/swap-horizontal';
import MdiNumeric from '~icons/mdi/numeric';
import MdiSchool from '~icons/mdi/school';
import MdiEarth from '~icons/mdi/earth';
import MdiStar from '~icons/mdi/star';
import MdiTrophy from '~icons/mdi/trophy';
import MdiDomain from '~icons/mdi/domain';
import MdiAccountChild from '~icons/mdi/account-child';
import MdiHeart from '~icons/mdi/heart';
import MdiHeartOutline from '~icons/mdi/heart-outline';
import MdiCommentOutline from '~icons/mdi/comment-outline';
import MdiShareOutline from '~icons/mdi/share-outline';
import MdiBookmarkOutline from '~icons/mdi/bookmark-outline';
import MdiDotsVertical from '~icons/mdi/dots-vertical';
import MdiDotsHorizontal from '~icons/mdi/dots-horizontal';
import MdiFacebook from '~icons/mdi/facebook';
import MdiRepost from '~icons/mdi/repeat';
import MdiThumbUpOutline from '~icons/mdi/thumb-up-outline';
import MdiEmoticonOutline from '~icons/mdi/emoticon-outline';
import MdiSend from '~icons/mdi/send';
import MdiSendVariantOutline from '~icons/mdi/send-variant-outline';
import MdiImagePlusOutline from '~icons/mdi/image-plus-outline';
import MdiImagePlus from '~icons/mdi/image-plus';
// Tabler
import TablerBrandBluesky from '~icons/tabler/brand-bluesky';
import TablerBrandDiscord from '~icons/tabler/brand-discord';
// PH
import PhLinktreeLogo from '~icons/ph/linktree-logo';
// EOS
import EosIconsLoading from '~icons/eos-icons/loading';
// EP
import EpCoin from '~icons/ep/coin';
// Hugeicons
import HugeiconsKoFi from '~icons/hugeicons/ko-fi';

import { Icon as IconType } from '@/types/blocks/base';
import { cn } from '@/lib/utils';

interface IconProps {
  config: IconType;
  className?: string;
}

// 静态图标映射表
const ICONS_MAP = {
  // Mdi
  MdiStarsOutline,
  MdiDollar,
  MdiTwitter,
  MdiEnvelopeOutline,
  MdiInstagram,
  MdiPinterest,
  MdiGithub,
  MdiGoogle,
  MdiClose,
  MdiCheck,
  MdiImageOutline,
  MdiSpeedometer,
  MdiEye,
  MdiCog,
  MdiAccountGroup,
  MdiTrendingUp,
  MdiBallot,
  MdiPalette,
  MdiTshirtCrew,
  MdiSparkles,
  MdiCheckCircle,
  MdiDownload,
  MdiRefresh,
  MdiAccountMultiple,
  MdiCubeOutline,
  MdiLinkVariant,
  MdiHome,
  MdiArrowRight,
  MdiCloseCircle,
  MdiPackageVariantClosed,
  MdiClockOutline,
  MdiUndo,
  MdiCancel,
  MdiHelpCircle,
  MdiLoading,
  MdiAlert,
  MdiPackageVariant,
  MdiCreditCard,
  MdiCalendarCheck,
  MdiTimeline,
  MdiPlus,
  MdiUpdate,
  MdiNoteText,
  MdiReceiptText,
  MdiTrendingDown,
  MdiCoin,
  MdiArrowTopRight,
  MdiCrownOutline,
  MdiImageOffOutline,
  MdiInformationOutline,
  MdiCompare,
  MdiChevronUpCircleOutline,
  MdiShareVariantOutline,
  MdiImagePlusOutline,
  MdiImagePlus,
  MdiCalendarClock,
  MdiInfinity,
  // Sports Icons
  MdiVolleyball,
  MdiBasketball,
  MdiSoccer,
  MdiBeach,
  MdiTimer,
  MdiShield,
  MdiPrinter,
  MdiCity,
  MdiSwapHorizontal,
  MdiNumeric,
  MdiSchool,
  MdiEarth,
  MdiStar,
  MdiTrophy,
  MdiDomain,
  MdiAccountChild,
  MdiHeart,
  MdiHeartOutline,
  MdiCommentOutline,
  MdiShareOutline,
  MdiBookmarkOutline,
  MdiDotsVertical,
  MdiDotsHorizontal,
  MdiFacebook,
  MdiRepost,
  MdiThumbUpOutline,
  MdiEmoticonOutline,
  MdiSend,
  MdiSendVariantOutline,
  MdiTrashCan,
  MdiCrossCircleOutline,
  // Tabler
  TablerBrandBluesky,
  TablerBrandDiscord,
  // Ph
  PhLinktreeLogo,
  // EOS
  EosIconsLoading,
  // EP
  EpCoin,
  // Hugeicons
  HugeiconsKoFi,
};
// 兜底图标
const FallbackIcon = MdiQuestionBoxOutline;

export default function Icon({ config, className = '' }: IconProps) {
  const IconComponent = ICONS_MAP[config.name as keyof typeof ICONS_MAP];
  if (!IconComponent) {
    console.error(`Icon ${config.name} not found`);
    return <FallbackIcon className={cn('size-4', className)} />;
  }
  return <IconComponent className={cn('size-4', className)} />;
}