import { LocalePageProps } from '@/types/page';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { getPageContent } from '@/i18n/utils';
import UserProfileClient from '@/components/blocks/user-profile/client';

export default async function UserProfilePage(props: LocalePageProps<{ userId: string }>) {
  const { userId } = await props.params;

  // 获取当前登录用户信息
  const session = await auth();

  // 只允许查看自己的资料
  if (!session?.user?.uuid || session.user.uuid !== userId) {
    notFound();
  }

  return (
    <div className="bg-background block-section min-h-screen py-0">
      <UserProfileClient userId={userId} />
    </div>
  );
}

export async function generateMetadata(props: LocalePageProps<{ userId: string }>) {
  const { userId, locale } = await props.params;

  try {
    // 获取多语言页面内容
    const userProfileContent = await getPageContent<'userProfile'>({ key: 'userProfile', locale });

    // 获取当前登录用户信息
    const session = await auth();

    // 只为登录用户且是自己的资料页面生成metadata
    if (session?.user?.uuid === userId && userProfileContent) {
      const user = session.user;
      const username = user.nickname || user.email;

      return {
        title: userProfileContent.metadata.title.replace('{username}', username || 'User'),
        description: userProfileContent.metadata.description,
      };
    }
  } catch (error) {
    console.log('Failed to get user session or i18n content for metadata:', error);
  }

  // 默认获取多语言内容，如果失败则使用硬编码
  try {
    const { locale } = await props.params;
    const userProfileContent = await getPageContent<'userProfile'>({ key: 'userProfile', locale });

    if (userProfileContent) {
      return {
        title: userProfileContent.metadata.defaultTitle,
        description: userProfileContent.metadata.defaultDescription,
      };
    }
  } catch (error) {
    console.log('Failed to get default i18n content for metadata:', error);
  }

  return {
    title: 'User Profile - GamesRamp',
    description: 'User profile on GamesRamp',
  };
}
