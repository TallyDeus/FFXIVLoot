import { apiRequest } from './apiClient';
import { AvailableLoot, LootAssignment, UpgradeMaterialAssignment, FloorNumber } from '../../types/member';

const API_ENDPOINT = '/api/loot';

/**
 * Service for managing loot distribution
 */
export const lootService = {
  /**
   * Gets available loot for a specific floor
   */
  async getAvailableLoot(floorNumber: FloorNumber, weekNumber?: number): Promise<AvailableLoot[]> {
    const url = weekNumber 
      ? `${API_ENDPOINT}/floors/${floorNumber}/available?weekNumber=${weekNumber}`
      : `${API_ENDPOINT}/floors/${floorNumber}/available`;
    return apiRequest<AvailableLoot[]>(url);
  },

  /**
   * Assigns loot to a member
   */
  async assignLoot(assignment: LootAssignment & { floorNumber: number }): Promise<{ assignmentId: string }> {
    return apiRequest<{ assignmentId: string }>(`${API_ENDPOINT}/assign`, {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  },

  /**
   * Assigns an upgrade material to a member
   */
  async assignUpgradeMaterial(assignment: UpgradeMaterialAssignment & { floorNumber: number }): Promise<{ assignmentId: string }> {
    return apiRequest<{ assignmentId: string }>(`${API_ENDPOINT}/assign-upgrade`, {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  },

  /**
   * Undoes a loot assignment
   */
  async undoAssignment(assignmentId: string): Promise<void> {
    return apiRequest<void>(`${API_ENDPOINT}/undo/${assignmentId}`, {
      method: 'POST',
    });
  },

  /**
   * Gets acquisition counts for Extra loot (how many times each member has received this item as Extra)
   */
  async getExtraLootAcquisitionCounts(
    slot: number | null,
    isUpgradeMaterial: boolean,
    isArmorMaterial?: boolean
  ): Promise<Record<string, number>> {
    const params = new URLSearchParams();
    if (slot !== null) {
      params.append('slot', slot.toString());
    }
    params.append('isUpgradeMaterial', isUpgradeMaterial.toString());
    if (isArmorMaterial !== undefined) {
      params.append('isArmorMaterial', isArmorMaterial.toString());
    }
    return apiRequest<Record<string, number>>(`${API_ENDPOINT}/extra/counts?${params.toString()}`);
  },
};

