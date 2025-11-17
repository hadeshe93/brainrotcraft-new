import { Metadata } from 'next';
import TranslationDashboard from '@/components/admin/translation-dashboard';

export const metadata: Metadata = {
  title: 'Translation Audit - Admin',
  description: 'Audit and review multi-language translations for all content',
};

export default function TranslationAuditPage() {
  return (
    <div className="container mx-auto py-8">
      <TranslationDashboard />
    </div>
  );
}
