
import useSWR from 'swr';
import { Sku, LayoutData } from '@/lib/types';

// const API_BASE_URL = 'https://your-backend-api.com/api'; // Placeholder for production
const API_BASE_URL = '/api'; // For local development

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Hook to get all layouts
export function useLayouts() {
  const { data, error } = useSWR<{ layouts: { id: string; name: string }[] }>(
    `${API_BASE_URL}/layouts`,
    fetcher
  );

  return {
    layouts: data?.layouts,
    isLoading: !error && !data,
    isError: error,
  };
}

// Hook to get a specific layout
export function useLayout(layoutId: string) {
  const { data, error } = useSWR<LayoutData>(
    layoutId ? `${API_BASE_URL}/layouts/${layoutId}` : null,
    fetcher
  );

  return {
    layout: data,
    isLoading: !error && !data,
    isError: error,
  };
}

// Hook to get all SKUs
export function useSkus() {
  const { data, error } = useSWR<{ skus: Sku[] }>(`${API_BASE_URL}/skus`, fetcher);

  return {
    skus: data?.skus,
    isLoading: !error && !data,
    isError: error,
  };
}

// Hook to search for SKUs
export function useSearchSkus(query: string) {
  const { data, error } = useSWR<{ skus: Sku[] }>(
    query ? `${API_BASE_URL}/skus/search?q=${query}` : null,
    fetcher
  );

  return {
    skus: data?.skus,
    isLoading: !error && !data,
    isError: error,
  };
}
