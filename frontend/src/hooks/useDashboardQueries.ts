import { useQuery } from '@tanstack/react-query';
import { telemetryApi } from '../api/telemetry';
import { ledgerApi } from '../api/ledger';
import { analyticsApi } from '../api/analytics';
import { usersApi } from '../api/users';
import { auditApi } from '../api/audit';
import type { BatchStatus } from '../types/ledger';

/* ============================================================================
 * Farmer Hooks
 * ============================================================================ */

/** Fetch paginated telemetry history */
export function useTelemetryHistory(params?: {
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ['telemetry', 'history', params],
    queryFn: () => telemetryApi.getHistory(params),
    staleTime: 30_000, // 30s
  });
}

/** Fetch the latest telemetry reading */
export function useLatestTelemetry() {
  return useQuery({
    queryKey: ['telemetry', 'latest'],
    queryFn: () => telemetryApi.getLatest(),
    staleTime: 15_000, // 15s — sensors update frequently
    refetchInterval: 30_000, // auto-refresh every 30s
  });
}

/** Fetch farmer batch list */
export function useBatches(params?: {
  page?: number;
  page_size?: number;
  status?: BatchStatus;
  farmer_id?: string;
}) {
  return useQuery({
    queryKey: ['batches', params],
    queryFn: () => ledgerApi.getList(params),
    staleTime: 30_000,
  });
}

/** Fetch a single batch by ID */
export function useBatchById(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batches', batchId],
    queryFn: () => ledgerApi.getById(batchId!),
    enabled: !!batchId,
    staleTime: 30_000,
  });
}

/** Fetch the rule-based WMA estimate for a crop. */
export function useYieldPrediction(cropType = 'MAIZE') {
  return useQuery({
    queryKey: ['yield-prediction', cropType],
    queryFn: () => analyticsApi.predictYield(cropType),
    staleTime: 5 * 60_000,
  });
}

/** Fetch telemetry summary */
export function useTelemetrySummary() {
  return useQuery({
    queryKey: ['telemetry-summary'],
    queryFn: () => analyticsApi.getTelemetrySummary(),
    staleTime: 60_000,
  });
}

/** Fetch transfer history for a batch */
export function useTransferHistory(batchId: string | undefined) {
  return useQuery({
    queryKey: ['transfers', batchId],
    queryFn: () => ledgerApi.getTransferHistory(batchId!),
    enabled: !!batchId,
    staleTime: 30_000,
  });
}

/* ============================================================================
 * Logistics Hooks
 * ============================================================================ */

/** Fetch shipments (uses batch list with logistics filters) */
export function useShipments(params?: {
  page?: number;
  page_size?: number;
  status?: BatchStatus;
  custodian_id?: string;
}) {
  return useQuery({
    queryKey: ['shipments', params],
    queryFn: () => ledgerApi.getList(params),
    staleTime: 30_000,
  });
}

/* ============================================================================
 * Admin Hooks
 * ============================================================================ */

/** Fetch user list */
export function useUsers(params?: {
  page?: number;
  page_size?: number;
  role?: string;
  is_active?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getList(params),
    staleTime: 60_000,
  });
}

/** Fetch audit logs */
export function useAuditLogs(params?: {
  page?: number;
  page_size?: number;
  action?: string;
  user_id?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.getList(params),
    staleTime: 60_000,
  });
}

/** Fetch system health */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => analyticsApi.getSystemHealth(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/** Fetch admin dashboard stats */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => analyticsApi.getAdminStats(),
    staleTime: 60_000,
  });
}
