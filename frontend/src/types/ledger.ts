/* Ledger Types */
export type BatchStatus = 'PENDING' | 'MINTED' | 'IN_TRANSIT' | 'DELIVERED';

export interface ProduceBatch {
  batch_id: string;
  farmer_id: string;
  farmer_name?: string;
  crop_type: string;
  weight_kg: number;
  data_integrity_hash: string;
  status: BatchStatus;
  sui_object_id?: string;
  sui_tx_digest?: string;
  current_custodian_id?: string;
  current_custodian_name?: string;
  origin_telemetry_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchPrepareRequest {
  crop_type: string;
  weight_kg: number;
  origin_telemetry_id: string;
}

export interface BatchPrepareResponse {
  batch_id: string;
  batch: ProduceBatch;
}

export interface BatchConfirmRequest {
  batch_id: string;
  sui_object_id: string;
  sui_tx_digest: string;
}

export interface BatchTransferRequest {
  batch_id: string;
  new_custodian_id: string;
}

export interface BatchListResponse {
  results: ProduceBatch[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface TransferLogEntry {
  transfer_id: string;
  batch_id: string;
  from_custodian_id: string;
  from_custodian_name: string;
  to_custodian_id: string;
  to_custodian_name: string;
  sui_tx_digest: string;
  transferred_at: string;
}

export const BATCH_STATUS_CONFIG: Record<BatchStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: 'var(--color-warning-fg)', bg: 'var(--color-warning-bg)' },
  MINTED: { label: 'Minted', color: 'var(--color-success-fg)', bg: 'var(--color-success-bg)' },
  IN_TRANSIT: { label: 'In Transit', color: 'var(--color-info-fg)', bg: 'var(--color-info-bg)' },
  DELIVERED: { label: 'Delivered', color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
};