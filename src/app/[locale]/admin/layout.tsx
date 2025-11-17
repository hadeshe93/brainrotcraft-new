import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/auth-helpers';
import AdminSidebar from '@/components/admin/sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const isDev = process.env.NODE_ENV === 'development';
  const bypassAuth = isDev && process.env.BYPASS_ADMIN_AUTH === 'true';

  if (!bypassAuth) {
    const session = await auth();

    // Redirect to login if not authenticated
    if (!session) {
      redirect('/auth/signin');
    }

    // Check if user is admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      redirect('/');
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="bg-background flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {bypassAuth && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Development Mode: Authentication bypassed (BYPASS_ADMIN_AUTH=true)
              </p>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

export const dynamicParams = false;
