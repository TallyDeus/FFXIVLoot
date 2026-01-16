import { apiRequest } from './apiClient';
import { WeekAssignmentHistory } from '../../types/member';

const HISTORY_ENDPOINT = '/api/loot-history';

/**
 * Service for managing loot assignment history
 */
export const lootHistoryService = {
  /**
   * Gets all assignment history grouped by week
   */
  async getAllHistory(): Promise<WeekAssignmentHistory[]> {
    return apiRequest<WeekAssignmentHistory[]>(`${HISTORY_ENDPOINT}/weeks`);
  },

  /**
   * Gets assignment history for a specific week
   */
  async getHistoryForWeek(weekNumber: number): Promise<WeekAssignmentHistory> {
    return apiRequest<WeekAssignmentHistory>(`${HISTORY_ENDPOINT}/weeks/${weekNumber}`);
  },
};

