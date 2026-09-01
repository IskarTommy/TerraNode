import apiClient from './client';
import type {
  ProduceBatch,
  BatchPrepareRequest,
  BatchPrepareResponse,
  BatchConfirmRequest,
  BatchTransferRequest,
  BatchListResponse,
  BatchStatus,
  PublicBatchVerification,
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
    const response = await apiClient.get<BatchListResponse>('/ledger/list/', {
      params: params
        ? {
            page: params.page,
            page_size: params.page_size,
            status: params.status,
            farmer: params.farmer_id,
            current_custodian: params.custodian_id,
          }
        : undefined,
    });
    return response.data;
  },

  /** Get a single batch by ID */
  getById: async (batchId: string): Promise<ProduceBatch> => {
    const response = await apiClient.get<ProduceBatch>(`/ledger/${batchId}/`);
    return response.data;
  },

  lookup: async (identifier: string): Promise<ProduceBatch> => {
    const response = await apiClient.get<ProduceBatch>(`/ledger/lookup/${encodeURIComponent(identifier)}/`);
    return response.data;
  },

  /** Get transfer history for a batch */
  getTransferHistory: async (batchId: string): Promise<ProduceBatch['transfers']> => {
    const response = await apiClient.get(`/ledger/${batchId}/transfers/`);
    return response.data;
  },

  /** Public, fail-closed verification by TerraNode UUID or Sui object ID. */
  verifyPublic: async (identifier: string): Promise<PublicBatchVerification> => {
    const response = await apiClient.get<PublicBatchVerification>(
      '/ledger/verify/' + encodeURIComponent(identifier) + '/',
    );
    return response.data;
  },
};
