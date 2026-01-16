import { apiRequest } from './apiClient';
import { Member } from '../../types/member';

const API_ENDPOINT = '/api/auth';

export interface LoginRequest {
  memberName: string;
  pin: string;
}

export interface LoginResponse {
  member: Member;
  token: string;
}

/**
 * Service for authentication
 */
export const authService = {
  /**
   * Logs in a user with member name and PIN
   */
  async login(memberName: string, pin: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>(`${API_ENDPOINT}/login`, {
      method: 'POST',
      body: JSON.stringify({ memberName, pin }),
    });
  },

  /**
   * Logs out the current user
   */
  async logout(token: string): Promise<void> {
    return apiRequest<void>(`${API_ENDPOINT}/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Validates the current session token
   */
  async validate(token: string): Promise<Member | null> {
    try {
      return await apiRequest<Member>(`${API_ENDPOINT}/validate`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      return null;
    }
  },

  /**
   * Updates a member's PIN
   */
  async updatePin(memberId: string, currentPin: string, newPin: string): Promise<void> {
    return apiRequest<void>(`/api/members/${memberId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ currentPin, newPin }),
    });
  },
};

