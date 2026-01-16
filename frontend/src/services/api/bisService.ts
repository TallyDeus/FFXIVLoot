import { apiRequest } from './apiClient';
import { Member, XivGearImportRequest, GearSlot } from '../../types/member';

const API_ENDPOINT = '/api/bis';

/**
 * Service for managing best-in-slot lists
 */
export const bisService = {
  /**
   * Imports a best-in-slot list from a xivgear link
   */
  async importBiS(request: XivGearImportRequest): Promise<Member> {
    return apiRequest<Member>(`${API_ENDPOINT}/import`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Updates item acquisition status
   */
  async updateItemAcquisition(
    memberId: string,
    slot: GearSlot,
    isAcquired: boolean,
    specType?: 'main' | 'off'
  ): Promise<void> {
    const specTypeParam = specType === 'off' ? '?specType=OffSpec' : '';
    return apiRequest<void>(`${API_ENDPOINT}/${memberId}/items/${slot}${specTypeParam}`, {
      method: 'PUT',
      body: JSON.stringify(isAcquired),
    });
  },

  /**
   * Updates upgrade material acquisition status
   */
  async updateUpgradeMaterialAcquisition(
    memberId: string,
    slot: GearSlot,
    upgradeMaterialAcquired: boolean,
    specType?: 'main' | 'off'
  ): Promise<void> {
    const specTypeParam = specType === 'off' ? '?specType=OffSpec' : '';
    return apiRequest<void>(`${API_ENDPOINT}/${memberId}/items/${slot}/upgrade${specTypeParam}`, {
      method: 'PUT',
      body: JSON.stringify(upgradeMaterialAcquired),
    });
  },
};

