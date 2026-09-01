export type BatchStatus = 'PENDING' | 'MINTED' | 'IN_TRANSIT' | 'DELIVERED';

export interface CustodyTransfer {
  id: string;
  batch: string;
  from_user: string;
  to_user: string;
  from_wallet: string;
  to_wallet: string;
  tx_digest: string;
  verified_on_chain: boolean;
  transferred_at: string;
  event_metadata: Record<string, unknown>;
}

export interface ProduceBatch {
  id: string;
  farmer: string;
  current_custodian: string;
  origin_telemetry: string | null;
  crop_type: string;
  weight_kg: number;
  weight_grams: number;
  data_integrity_hash: string;
  status: BatchStatus;
  sui_object_id: string | null;
  sui_tx_digest: string | null;
  mint_verified_at: string | null;
  transfers: CustodyTransfer[];
  created_at: string;
  updated_at: string;
}

export interface BatchPrepareRequest {
  crop_type: string;
  weight_kg: number;
  origin_telemetry?: string;
}

export interface BatchPrepareResponse {
  id: string;
  crop_type: string;
  weight_kg: number;
  status: BatchStatus;
  data_integrity_hash: string;
  created_at: string;
}

export interface BatchConfirmRequest {
  sui_tx_digest: string;
}

export interface BatchTransferRequest {
  to_user_id: string;
  sui_tx_digest: string;
  status: 'IN_TRANSIT' | 'DELIVERED';
  metadata?: Record<string, unknown>;
}

export interface BatchListResponse {
  results: ProduceBatch[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface PublicBatchVerification {
  verified: boolean;
  error?: string;
  batch_id?: string;
  crop_type?: string;
  weight_kg?: number;
  weight_grams?: number;
  status?: BatchStatus;
  farmer_address?: string | null;
  current_custodian_address?: string | null;
  sui_object_id?: string | null;
  sui_tx_digest?: string | null;
  data_integrity_hash?: string;
  local_integrity: boolean;
  batch_hash_match: boolean;
  sui_tx_verified: boolean;
  custody_chain_verified?: boolean;
  overall_verification: boolean;
  sui_verification?: {
    verified?: boolean;
    reason_code?: string;
    error?: string;
  };
  transfer_verifications?: Array<{
    transfer_id: string;
    tx_digest: string;
    verified: boolean;
    reason_code: string;
  }>;
  created_at?: string;
  sui_explorer_url?: string | null;
}

export const BATCH_STATUS_CONFIG: Record<BatchStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: 'var(--color-warning-fg)', bg: 'var(--color-warning-bg)' },
  MINTED: { label: 'Minted', color: 'var(--color-success-fg)', bg: 'var(--color-success-bg)' },
  IN_TRANSIT: { label: 'In Transit', color: 'var(--color-info-fg)', bg: 'var(--color-info-bg)' },
  DELIVERED: { label: 'Delivered', color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
};
