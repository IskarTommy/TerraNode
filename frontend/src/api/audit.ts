import apiClient from './client';
import type { AuditLogEntry } from '../types/analytics';

export interface AuditLogListResponse {
  results: AuditLogEntry[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const auditApi = {
  /** Get paginated audit logs */
  getList: async (params?: {
    page?: number;
    page_size?: number;
    action?: string;
    user_id?: string;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AuditLogListResponse> => {
    const response = await apiClient.get<AuditLogListResponse>('/analytics/audit-logs/', { params });
    return response.data;
  },
};
