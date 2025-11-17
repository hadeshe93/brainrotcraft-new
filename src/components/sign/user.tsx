'use client';
import { useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import Link from 'next/link';
import { User, EUserType } from '@/types/user';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useUserCredits } from '@/hooks/use-user-credits';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/icon';
import { NEED_PAID_SYSTEM } from '@/constants/config';

export default function ({ user }: { user: User }) {
  const t = useTranslations();
  const tCredits = useTranslations('credits');

  // 查询用户积分信息
  const { credits, userType, isLoading, isError } = useUserCredits(NEED_PAID_SYSTEM);

  console.log('isLoading:', isLoading);

  // 渲染积分区域的函数
  const renderCreditsSection = () => {
    const Title = useCallback(() => (
      <span className="inline-flex items-center gap-1 text-sm">
        <Icon className="size-4" config={{ name: 'EpCoin' }} /> {tCredits('title')}:
      </span>
    ), []);
    switch (userType) {
      case EUserType.PAID:
        if (isLoading) {
          return (
            <DropdownMenuLabel className="flex items-center justify-center gap-2">
              <Title />
              <span className="text-muted-foreground text-sm">{tCredits('loading')}</span>
            </DropdownMenuLabel>
          );
        }
        if (isError || !credits) {
          return (
            <DropdownMenuLabel className="flex items-center justify-center gap-2">
              <Title />
              <span className="text-destructive text-sm">{tCredits('error')}</span>
            </DropdownMenuLabel>
          );
        }
        // 积分状态样式
        const creditsClassName = (() => {
          if (credits.availableCredits <= 0) return 'text-destructive';
          if (credits.availableCredits < credits.totalCreditsInCurrentCycle * 0.2) return 'text-orange-500';
          return 'text-emerald-600';
        })();

        return (
          <>
            <DropdownMenuLabel className="flex items-center justify-center gap-1">
              <Title />
              <span className={`text-sm font-medium ${creditsClassName}`}>
                {tCredits('available_format', {
                  available: credits.availableCredits,
                  total: credits.totalCreditsInCurrentCycle,
                })}
              </span>
            </DropdownMenuLabel>
            {credits.pendingCredits > 0 && (
              <DropdownMenuLabel className="text-muted-foreground text-center text-xs">
                {tCredits('pending_format', { count: credits.pendingCredits })}
              </DropdownMenuLabel>
            )}
          </>
        );

      case EUserType.FREE:
        return (
          <DropdownMenuLabel className="flex flex-col items-center gap-2 py-3">
            <div className="flex w-full items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('subscription.current_plan')}</span>
              <Badge variant="outline">{t('subscription.free')}</Badge>
            </div>
            <Button size="sm" className="w-full" asChild>
              <Link href="/pricing">{t('subscription.upgrade_to_pro')}</Link>
            </Button>
          </DropdownMenuLabel>
        );

      default:
        return (
          <DropdownMenuLabel className="text-muted-foreground text-center text-sm">
            {t('common.loading')}
          </DropdownMenuLabel>
        );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src={user.avatar} alt={user.nickname} />
          <AvatarFallback>{user.nickname}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mx-4 min-w-[200px]">
        <DropdownMenuLabel className="truncate text-center">{user.nickname}</DropdownMenuLabel>
        <DropdownMenuLabel className="text-muted-foreground truncate text-center">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* 根据用户类型渲染不同内容 */}
        {/* {renderCreditsSection()} */}
        {/* <DropdownMenuSeparator /> */}

        <DropdownMenuItem className="flex cursor-pointer justify-center">
          <Link className="h-full w-full text-center" href={`/user/${user.uuid}`}>
            {t('user.dashboard')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="flex cursor-pointer justify-center" onClick={() => signOut({ redirectTo: '/' })}>
          {t('user.sign_out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
