/**
 * Sidebar Data Hook
 * Fetches categories and tags data for sidebar navigation using SWR
 * Automatically handles caching, revalidation, and error states
 */

import useSWR from 'swr';

export interface SidebarCategory {
  uuid: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
}

export interface SidebarTag {
  uuid: string;
  name: string;
  slug: string;
}

export interface SidebarFeaturedItem {
  uuid: string;
  name: string;
  slug: string;
}

interface SidebarData {
  featuredItems: SidebarFeaturedItem[];
  categories: SidebarCategory[];
  tags: SidebarTag[];
}

const fetcher = async (url: string): Promise<SidebarData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch sidebar data');
  }
  return response.json();
};

export function useSidebarData() {
  const { data, error, isLoading } = useSWR<SidebarData>('/api/sidebar-data', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 minutes
  });

  return {
    featuredItems: data?.featuredItems || [],
    categories: data?.categories || [],
    tags: data?.tags || [],
    isLoading,
    isError: !!error,
  };
}
