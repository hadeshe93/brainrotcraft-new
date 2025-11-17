import { useTranslations, useFormatter } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/icon';
import { UserProfile } from '@/services/user/profile';
import { useUserCredits } from '@/hooks/use-user-credits';
import MdiFileDocumentBoxCheckOutline from '~icons/mdi/file-document-box-check-outline';
import { NEED_USER_WORKS_SYSTEM } from '@/constants/config';

interface UserProfileHeaderProps {
  user: UserProfile;
}

export default function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const t = useTranslations('user_profile');
  const { credits } = useUserCredits();
  const format = useFormatter();
  const formatDate = (date: Date) => {
    return format.dateTime(date, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = () => {
    return user.nickname || user.email.split('@')[0] || 'User';
  };

  const getUsernameFromEmail = () => {
    return `@${user.email.split('@')[0]}`;
  };

  return (
    <div className="bg-card mb-6 rounded-lg border p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* 头像 */}
        <div className="flex justify-center md:justify-start">
          <Avatar className="h-20 w-20 md:h-24 md:w-24">
            <AvatarImage src={user.avatar} alt={getDisplayName()} />
            <AvatarFallback className="text-2xl">{getDisplayName().charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* 用户信息 */}
        <div className="flex-1 text-center md:text-left">
          <div className="mb-2">
            <h1 className="mb-1 text-2xl font-bold md:text-3xl">{getDisplayName()}</h1>
            <p className="text-muted-foreground text-sm md:text-base">{getUsernameFromEmail()}</p>
          </div>

          {/* 统计信息 */}
          <div className="mb-4 flex flex-wrap justify-center gap-4 md:justify-start md:gap-6">
            {NEED_USER_WORKS_SYSTEM && (
              <div className="flex items-center gap-2">
                <MdiFileDocumentBoxCheckOutline className="text-muted-foreground size-5" />
                <span className="text-sm md:text-base">{t('works_count', { count: user.worksCount })}</span>
              </div>
            )}

            {/* 暂时不需要 */}
            {/* <div className="flex items-center gap-2">
              <Icon 
                config={{ name: 'MdiAccountGroup' }} 
                className="size-5 text-muted-foreground" 
              />
              <span className="text-sm md:text-base">
                {t('followers_count', { count: user.followersCount })}
              </span>
            </div> */}

            <div className="flex items-center gap-2">
              <Icon config={{ name: 'EpCoin' }} className="text-muted-foreground size-5" />
              <span className="text-sm md:text-base">{credits?.availableCredits || 0}</span>
            </div>

            <div className="flex items-center gap-2">
              <Icon config={{ name: 'MdiCheckCircle' }} className="text-muted-foreground size-5" />
              <span className="text-sm md:text-base">{formatDate(new Date(user.created_at!))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
