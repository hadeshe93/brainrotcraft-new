import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MdiGamepad from '~icons/mdi/gamepad';
import MdiTag from '~icons/mdi/tag';
import MdiLabel from '~icons/mdi/label';
import MdiStar from '~icons/mdi/star';
import MdiTranslate from '~icons/mdi/translate';
import MdiCloudDownload from '~icons/mdi/cloud-download';
import MdiDatabaseExport from '~icons/mdi/database-export';
import MdiComment from '~icons/mdi/comment';
import MdiAlertCircle from '~icons/mdi/alert-circle';

const modules = [
  {
    title: 'Games',
    description: 'Manage game listings, content, and status',
    href: '/admin/games',
    icon: MdiGamepad,
  },
  {
    title: 'Categories',
    description: 'Organize games by categories',
    href: '/admin/categories',
    icon: MdiTag,
  },
  {
    title: 'Tags',
    description: 'Add and manage game tags',
    href: '/admin/tags',
    icon: MdiLabel,
  },
  {
    title: 'Featured',
    description: 'Manage featured game collections',
    href: '/admin/featured',
    icon: MdiStar,
  },
  {
    title: 'Translations',
    description: 'Manage multi-language translations',
    href: '/admin/translations',
    icon: MdiTranslate,
  },
  {
    title: 'Data Fetch',
    description: 'Sync data from parent site',
    href: '/admin/fetch',
    icon: MdiCloudDownload,
  },
  {
    title: 'Data Export',
    description: 'Export game data to JSON files',
    href: '/admin/export',
    icon: MdiDatabaseExport,
  },
  {
    title: 'Comments',
    description: 'Review and moderate user comments',
    href: '/admin/comments',
    icon: MdiComment,
  },
  {
    title: 'Reports',
    description: 'Handle user reports and issues',
    href: '/admin/reports',
    icon: MdiAlertCircle,
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-foreground text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your game platform from here</p>
      </div>

      {/* Module Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="hover:border-primary cursor-pointer transition-colors">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-lg">
                    <Icon className="size-6" />
                  </div>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-primary text-sm font-medium">Manage {module.title.toLowerCase()} →</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats (Optional - can be implemented later) */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome to CMS</CardTitle>
          <CardDescription>
            Use the sidebar or the cards above to navigate to different management sections
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
