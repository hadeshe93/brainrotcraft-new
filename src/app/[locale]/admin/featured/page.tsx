import TaxonomyManagement from '@/components/admin/taxonomy-management';

export default function FeaturedPage() {
  return (
    <TaxonomyManagement
      type="featured"
      title="Featured Management"
      description="Manage featured game collections (Hot, New, All Games, etc.)"
      apiEndpoint="/api/admin/featured"
    />
  );
}
