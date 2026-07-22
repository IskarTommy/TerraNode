import apiClient from './client';
import type { TelemetryRecord, TelemetrySubmission, TelemetryHistoryResponse, LatestTelemetryResponse } from '../types/telemetry';

export const telemetryApi = {
  /** Submit a new telemetry reading */
  submit: async (data: TelemetrySubmission): Promise<TelemetryRecord> => {
    const response = await apiClient.post<TelemetryRecord>('/telemetry/submit/', data);
    return response.data;
  },

  /** Get paginated telemetry history */
  getHistory: async (params?: {
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<TelemetryHistoryResponse> => {
    const response = await apiClient.get<TelemetryHistoryResponse>('/telemetry/history/', { params });
    return response.data;
  },

  /** Get latest telemetry reading for dashboard */
  getLatest: async (): Promise<LatestTelemetryResponse> => {
    const response = await apiClient.get<LatestTelemetryResponse>('/telemetry/latest/');
    return response.data;
  },
};