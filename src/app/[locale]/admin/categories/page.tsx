import TaxonomyManagement from '@/components/admin/taxonomy-management';

export default function CategoriesPage() {
  return (
    <TaxonomyManagement
      type="category"
      title="Category Management"
      description="Manage game categories"
      apiEndpoint="/api/admin/categories"
    />
  );
}
