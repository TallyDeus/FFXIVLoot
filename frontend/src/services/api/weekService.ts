import { apiRequest } from './apiClient';
import { Week } from '../../types/member';

const WEEK_ENDPOINT = '/api/weeks';

/**
 * Service for managing raid weeks
 */
export const weekService = {
  /**
   * Gets the current active week
   */
  async getCurrentWeek(): Promise<Week> {
    return apiRequest<Week>(`${WEEK_ENDPOINT}/current`);
  },

  /**
   * Gets all weeks
   */
  async getAllWeeks(): Promise<Week[]> {
    return apiRequest<Week[]>(WEEK_ENDPOINT);
  },

  /**
   * Starts a new week
   */
  async startNewWeek(): Promise<Week> {
    return apiRequest<Week>(`${WEEK_ENDPOINT}/new`, {
      method: 'POST',
    });
  },

  /**
   * Sets a specific week as the current week
   */
  async setCurrentWeek(weekNumber: number): Promise<void> {
    return apiRequest<void>(`${WEEK_ENDPOINT}/${weekNumber}/set-current`, {
      method: 'POST',
    });
  },

  /**
   * Creates a week with a specific week number
   */
  async createWeekWithNumber(weekNumber: number): Promise<Week> {
    return apiRequest<Week>(`${WEEK_ENDPOINT}/create/${weekNumber}`, {
      method: 'POST',
    });
  },

  /**
   * Deletes a week and reverts all BiS tracker changes
   */
  async deleteWeek(weekNumber: number): Promise<void> {
    return apiRequest<void>(`${WEEK_ENDPOINT}/${weekNumber}`, {
      method: 'DELETE',
    });
  },
};

