import apiClient from './client';

export interface UserRecord {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  full_name: string;
  sui_public_key: string | null;
}

export interface Stakeholder {
  id: string;
  full_name: string;
  role: 'FARMER' | 'LOGISTICS';
  sui_public_key: string;
}

export interface UserListResponse {
  results: UserRecord[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const usersApi = {
  getStakeholders: async (): Promise<Stakeholder[]> => {
    const response = await apiClient.get<Stakeholder[]>('/auth/stakeholders/');
    return response.data;
  },
  /** Get paginated user list */
  getList: async (params?: {
    page?: number;
    page_size?: number;
    role?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>('/auth/users/', { params });
    return response.data;
  },

  /** Get a single user by ID */
  getById: async (userId: string): Promise<UserRecord> => {
    const response = await apiClient.get<UserRecord>(`/auth/users/${userId}/`);
    return response.data;
  },

  /** Update user (e.g. toggle active, change role) */
  update: async (userId: string, data: Partial<Pick<UserRecord, 'role' | 'is_active'>>): Promise<UserRecord> => {
    const response = await apiClient.patch<UserRecord>(`/auth/users/${userId}/`, data);
    return response.data;
  },
};
