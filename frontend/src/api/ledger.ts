import apiClient from './client';
import type {
  ProduceBatch,
  BatchPrepareRequest,
  BatchPrepareResponse,
  BatchConfirmRequest,
  BatchTransferRequest,
  BatchListResponse,
  BatchStatus,
  TransferLogEntry,
} from '../types/ledger';

export const ledgerApi = {
  /** Prepare a new batch (submit telemetry reference for minting) */
  prepare: async (data: BatchPrepareRequest): Promise<BatchPrepareResponse> => {
    const response = await apiClient.post<BatchPrepareResponse>('/ledger/prepare/', data);
    return response.data;
  },

  /** Confirm a batch on-chain (submit Sui transaction details) */
  confirm: async (batchId: string, data: BatchConfirmRequest): Promise<ProduceBatch> => {
    const response = await apiClient.post(`/ledger/${batchId}/confirm/`, data);
    return response.data;
  },

  /** Transfer batch custody to another logistics user */
  transfer: async (batchId: string, data: BatchTransferRequest): Promise<ProduceBatch> => {
    const response = await apiClient.post(`/ledger/${batchId}/transfer/`, data);
    return response.data;
  },

  /** Get paginated list of batches (with optional filters) */
  getList: async (params?: {
    page?: number;
    page_size?: number;
    status?: BatchStatus;
    farmer_id?: string;
    custodian_id?: string;
  }): Promise<BatchListResponse> => {
    const response = await apiClient.get<BatchListResponse>('/ledger/list/', { params });
    return response.data;
  },

  /** Get a single batch by ID */
  getById: async (batchId: string): Promise<ProduceBatch> => {
    const response = await apiClient.get<ProduceBatch>(`/ledger/${batchId}/`);
    return response.data;
  },

  /** Get transfer history for a batch */
  getTransferHistory: async (batchId: string): Promise<TransferLogEntry[]> => {
    const response = await apiClient.get(`/ledger/${batchId}/transfers/`);
    return response.data;
  },
};
