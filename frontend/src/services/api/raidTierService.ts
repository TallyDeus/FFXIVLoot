import { apiRequest } from './apiClient';
import { LegacyRootDataStatus, RaidTierOverview, RaidTierSummary } from '../../types/raidTier';

const API_ENDPOINT = '/api/raidtiers';

export const raidTierService = {
  async getLegacyRootStatus(): Promise<LegacyRootDataStatus> {
    return apiRequest<LegacyRootDataStatus>(`${API_ENDPOINT}/legacy-root-status`);
  },

  async importFromRoot(name: string): Promise<RaidTierSummary> {
    return apiRequest<RaidTierSummary>(`${API_ENDPOINT}/import-from-root`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async rename(tierId: string, name: string): Promise<RaidTierSummary> {
    return apiRequest<RaidTierSummary>(`${API_ENDPOINT}/${tierId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async list(): Promise<RaidTierSummary[]> {
    return apiRequest<RaidTierSummary[]>(API_ENDPOINT);
  },

  async listOverview(): Promise<RaidTierOverview[]> {
    return apiRequest<RaidTierOverview[]>(`${API_ENDPOINT}/overview`);
  },

  async getCurrent(): Promise<RaidTierSummary> {
    return apiRequest<RaidTierSummary>(`${API_ENDPOINT}/current`);
  },

  async setCurrent(tierId: string): Promise<void> {
    return apiRequest<void>(`${API_ENDPOINT}/current/${tierId}`, {
      method: 'PUT',
    });
  },

  async create(name: string): Promise<RaidTierSummary> {
    return apiRequest<RaidTierSummary>(API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async delete(tierId: string): Promise<void> {
    return apiRequest<void>(`${API_ENDPOINT}/${tierId}`, {
      method: 'DELETE',
    });
  },
};
