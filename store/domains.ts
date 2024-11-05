import { create } from 'zustand';
import { Domain } from '@/interfaces/domain';

interface DomainsState {
  domains: Domain[];
  isLoading: boolean;
  error: string | null;
  fetchDomains: () => Promise<void>;
  addDomain: (domain: Partial<Domain>) => Promise<{ success: boolean; error?: string }>;
}

export const useDomainsStore = create<DomainsState>((set, get) => ({
  domains: [],
  isLoading: false,
  error: null,

  fetchDomains: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_DOMAIN}/api/seo/domains/`);
      const data = await response.json();
      set({ domains: data.domains, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch domains', isLoading: false });
    }
  },

  addDomain: async (domain: Partial<Domain>) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_DOMAIN}/api/seo/domains/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(domain),
      });

      const result = await response.json();

      if (result.error) {
        return {
          success: false,
          error: result.error === 'domain_already_exists'
            ? 'This domain already exists'
            : 'Unknown error occurred'
        };
      }

      await get().fetchDomains();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to add domain' };
    }
  },
}));