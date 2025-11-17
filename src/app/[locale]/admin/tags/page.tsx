import TaxonomyManagement from '@/components/admin/taxonomy-management';

export default function TagsPage() {
  return (
    <TaxonomyManagement
      type="tag"
      title="Tag Management"
      description="Manage game tags"
      apiEndpoint="/api/admin/tags"
    />
  );
}
