import { apiRequest } from './apiClient';
import type {
  RaidPlan,
  RaidPlanCategory,
  RaidPlanExtracted,
  RaidPlanLayout,
  RaidPlanReorderDto,
} from '../../types/raidPlan';

function base(tierId: string): string {
  return `/api/raid-tiers/${encodeURIComponent(tierId)}/raid-plans`;
}

export const raidPlanService = {
  async getLayout(tierId: string): Promise<RaidPlanLayout> {
    return apiRequest<RaidPlanLayout>(`${base(tierId)}/layout`);
  },

  async extract(tierId: string, url: string): Promise<RaidPlanExtracted> {
    const q = new URLSearchParams({ url });
    return apiRequest<RaidPlanExtracted>(`${base(tierId)}/extract?${q.toString()}`);
  },

  async createCategory(
    tierId: string,
    body: { name: string; parentCategoryId?: string | null }
  ): Promise<RaidPlanCategory> {
    return apiRequest<RaidPlanCategory>(`${base(tierId)}/categories`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateCategory(tierId: string, id: string, body: { name: string }): Promise<RaidPlanCategory> {
    return apiRequest<RaidPlanCategory>(`${base(tierId)}/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteCategory(tierId: string, id: string): Promise<void> {
    return apiRequest<void>(`${base(tierId)}/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async create(
    tierId: string,
    body: { title: string; raidplanUrl: string; categoryId?: string | null }
  ): Promise<RaidPlan> {
    return apiRequest<RaidPlan>(base(tierId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async update(
    tierId: string,
    id: string,
    body: { title: string; raidplanUrl: string; categoryId?: string | null }
  ): Promise<RaidPlan> {
    return apiRequest<RaidPlan>(`${base(tierId)}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async refresh(tierId: string, id: string): Promise<RaidPlan> {
    return apiRequest<RaidPlan>(`${base(tierId)}/${encodeURIComponent(id)}/refresh`, {
      method: 'POST',
    });
  },

  async reorder(tierId: string, body: RaidPlanReorderDto): Promise<void> {
    return apiRequest<void>(`${base(tierId)}/reorder`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async delete(tierId: string, id: string): Promise<void> {
    return apiRequest<void>(`${base(tierId)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
