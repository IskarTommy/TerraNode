import apiClient from './client';
import type { PredictionResult, TelemetrySummary, SystemHealth, AdminStats } from '../types/analytics';

export const analyticsApi = {
  /** Get the transparent rule-based WMA yield estimate. */
  predictYield: async (cropType = 'MAIZE'): Promise<PredictionResult> => {
    const response = await apiClient.get<PredictionResult>('/analytics/predict/', {
      params: { crop_type: cropType },
    });
    return response.data;
  },

  /** Get telemetry summary stats */
  getTelemetrySummary: async (): Promise<TelemetrySummary> => {
    const response = await apiClient.get<TelemetrySummary>('/analytics/summary/');
    return response.data;
  },

  /** Get system health status */
  getSystemHealth: async (): Promise<SystemHealth> => {
    const response = await apiClient.get<SystemHealth>('/analytics/health/');
    return response.data;
  },

  /** Get admin dashboard statistics */
  getAdminStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get<AdminStats>('/analytics/admin-stats/');
    return response.data;
  },
};
