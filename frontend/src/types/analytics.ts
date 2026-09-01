/* Analytics Types */
export interface PredictionResult {
  confidence_score: number;
  predicted_yield_metric_tons: number;
  historical_variance_index: number;
  data_points_analyzed: number;
  recommendation: string;
}

export interface TelemetrySummary {
  avg_temperature: number;
  avg_moisture: number;
  avg_ph: number;
  total_readings: number;
  date_range: {
    start: string;
    end: string;
  };
}

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  blockchain: 'configured' | 'not_configured';
  api: 'healthy' | 'degraded' | 'down';
}

export interface AdminStats {
  total_users: number;
  total_farmers: number;
  total_logistics: number;
  total_admins: number;
  total_batches: number;
  pending_batches: number;
  minted_batches: number;
  in_transit_batches: number;
  delivered_batches: number;
  telemetry_records: number;
  flagged_anomalies: number;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user: string | null;
  description: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

export interface IntegrityCheckResult {
  batch_id: string;
  is_valid: boolean;
  expected_hash: string;
  actual_hash: string;
  checked_at: string;
}
