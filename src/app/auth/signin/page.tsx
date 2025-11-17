
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SignInCore from './core';

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/admin');
  }
  return (
    <SignInCore />
  );
}
