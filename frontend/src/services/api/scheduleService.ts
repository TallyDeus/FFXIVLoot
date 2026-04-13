import { apiRequest } from './apiClient';
import type { ScheduleAvailability, ScheduleView } from '../../types/schedule';

const API_ENDPOINT = '/api/schedule';

export const scheduleService = {
  async getView(viewStartMonday?: string): Promise<ScheduleView> {
    const q = viewStartMonday ? `?viewStart=${encodeURIComponent(viewStartMonday)}` : '';
    return apiRequest<ScheduleView>(`${API_ENDPOINT}${q}`);
  },

  async upsertResponse(
    viewStartMonday: string,
    body: {
      date: string;
      status: ScheduleAvailability | null;
      comment?: string;
      memberId?: string;
    }
  ): Promise<ScheduleView> {
    const q = `?viewStart=${encodeURIComponent(viewStartMonday)}`;
    return apiRequest<ScheduleView>(`${API_ENDPOINT}/response${q}`, {
      method: 'PUT',
      body: JSON.stringify({
        date: body.date,
        status: body.status === null ? 'unset' : body.status,
        comment: body.comment ?? null,
        memberId: body.memberId ?? null,
      }),
    });
  },

  async upsertWeekResponsesBulk(
    viewStartMonday: string,
    body: { weekStartMonday: string; status: ScheduleAvailability; memberId?: string }
  ): Promise<ScheduleView> {
    const q = `?viewStart=${encodeURIComponent(viewStartMonday)}`;
    return apiRequest<ScheduleView>(`${API_ENDPOINT}/week-responses${q}`, {
      method: 'PUT',
      body: JSON.stringify({
        weekStartMonday: body.weekStartMonday,
        status: body.status,
        memberId: body.memberId ?? null,
      }),
    });
  },

  async updateStandardDays(viewStartMonday: string, standardRaidDaysOfWeek: number[]): Promise<ScheduleView> {
    const q = `?viewStart=${encodeURIComponent(viewStartMonday)}`;
    return apiRequest<ScheduleView>(`${API_ENDPOINT}/settings${q}`, {
      method: 'PUT',
      body: JSON.stringify({ standardRaidDaysOfWeek }),
    });
  },

  async upsertWeekComment(
    viewStartMonday: string,
    body: { weekStartMonday: string; comment?: string | null; memberId?: string }
  ): Promise<ScheduleView> {
    const q = `?viewStart=${encodeURIComponent(viewStartMonday)}`;
    return apiRequest<ScheduleView>(`${API_ENDPOINT}/week-comment${q}`, {
      method: 'PUT',
      body: JSON.stringify({
        weekStartMonday: body.weekStartMonday,
        comment: body.comment ?? null,
        memberId: body.memberId ?? null,
      }),
    });
  },
};
