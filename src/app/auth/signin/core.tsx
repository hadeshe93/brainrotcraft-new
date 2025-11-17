'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from 'next-auth/react';
import { AUTH_GOOGLE_ENABLED, AUTH_GITHUB_ENABLED } from '@/constants/config';
import Icon from '@/components/icon';

const ICON_GOOGLE_CONFIG = {
  name: 'MdiGoogle',
};
const ICON_GITHUB_CONFIG = {
  name: 'MdiGithub',
};

const onSignInGoogle = () => {
  signIn('google');
};
const onSignInGithub = () => {
  signIn('github');
};

export default function SignInCore() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sign In to GamesRamp</CardTitle>
          <CardDescription>Choose a provider to sign in to the admin panel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {AUTH_GOOGLE_ENABLED && (
            <Button variant="default" className="flex w-full items-center gap-2" onClick={onSignInGoogle}>
              <Icon config={ICON_GOOGLE_CONFIG} className="h-4 w-4" />
              Sign in with Google
            </Button>
          )}

          {AUTH_GITHUB_ENABLED && (
            <Button variant="outline" className="flex w-full items-center gap-2" onClick={onSignInGithub}>
              <Icon config={ICON_GITHUB_CONFIG} className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
