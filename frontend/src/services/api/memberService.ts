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

  /**
   * Uploads a profile image for a member
   */
  async uploadProfileImage(memberId: string, file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}/${memberId}/profile-image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: headers,
      // Don't set Content-Type - browser will set it with boundary for FormData
    });

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        if (!window.location.pathname.includes('/login')) {
          setTimeout(() => {
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
      
      const error = await response.json().catch(() => ({ detail: 'Failed to upload image' }));
      throw new Error(error.detail || 'Failed to upload image');
    }

    return response.json();
  },

  /**
   * Deletes a member's profile image
   */
  async deleteProfileImage(memberId: string): Promise<void> {
    return apiRequest<void>(`${API_ENDPOINT}/${memberId}/profile-image`, {
      method: 'DELETE',
    });
  },
};

