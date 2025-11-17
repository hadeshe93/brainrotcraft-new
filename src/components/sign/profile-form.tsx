'use client';

import { ComponentProps } from 'react';
import Icon from '@/components/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { AUTH_GOOGLE_ENABLED, AUTH_GITHUB_ENABLED } from '@/constants/config';


const ICON_GOOGLE_CONFIG = {
  name: 'MdiGoogle',
};
const ICON_GITHUB_CONFIG = {
  name: 'MdiGithub',
};
const onSignInGoogle = () => {
  signIn('google');
}
const onSignInGithub = () => {
  signIn('github');
}


export default function ProfileForm({ className }: ComponentProps<'form'>) {
  const t = useTranslations();

  return (
    <div className={cn('grid items-start gap-4', className)}>
      {AUTH_GOOGLE_ENABLED && (
        <Button
          variant="default"
          className="flex w-full items-center gap-2"
          onClick={onSignInGoogle}
        >
          <Icon config={ICON_GOOGLE_CONFIG} className="h-4 w-4" />
          {t('sign_modal.google_sign_in')}
        </Button>
      )}

      {AUTH_GITHUB_ENABLED && (
        <Button
          variant="outline"
          className="flex w-full items-center gap-2"
          onClick={onSignInGithub}
        >
          <Icon config={ICON_GITHUB_CONFIG} className="h-4 w-4" />
          {t('sign_modal.github_sign_in')}
        </Button>
      )}
    </div>
  );
}
