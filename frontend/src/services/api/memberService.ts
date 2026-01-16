import { apiRequest } from './apiClient';
import { Member } from '../../types/member';

const API_ENDPOINT = '/api/members';

/**
 * Service for managing raid members
 */
export const memberService = {
  /**
   * Gets all members
   */
  async getAllMembers(): Promise<Member[]> {
    return apiRequest<Member[]>(API_ENDPOINT);
  },

  /**
   * Gets a member by ID
   */
  async getMemberById(id: string): Promise<Member> {
    return apiRequest<Member>(`${API_ENDPOINT}/${id}`);
  },

  /**
   * Creates a new member
   */
  async createMember(member: Omit<Member, 'id'>): Promise<Member> {
    return apiRequest<Member>(API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  /**
   * Updates an existing member
   */
  async updateMember(member: Member): Promise<Member> {
    return apiRequest<Member>(`${API_ENDPOINT}/${member.id}`, {
      method: 'PUT',
      body: JSON.stringify(member),
    });
  },

  /**
   * Deletes a member by ID
   */
  async deleteMember(id: string): Promise<void> {
    return apiRequest<void>(`${API_ENDPOINT}/${id}`, {
      method: 'DELETE',
    });
  },
};

