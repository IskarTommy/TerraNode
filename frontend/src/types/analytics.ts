/* Analytics Types */
export interface PredictionResult {
  is_simulation: boolean;
  crop_type: string;
  model_type: string;
  confidence_score: number;
  predicted_yield_metric_tons: number;
  data_points_analyzed: {
    temperature: number;
    soil_moisture: number;
    soil_ph: number;
  };
  contributing_observations: string[];
  recommendation: string;
  averages: {
    temp: number;
    moisture: number;
    ph: number | null;
  };
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
  celery_workers: 'healthy' | 'degraded' | 'down';
  blockchain: 'healthy' | 'degraded' | 'down';
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
  flagged_anomalies: number;
  telemetry_records: number;
}

export interface AuditLogEntry {
  id: string;
  event_type: string;
  user_email: string | null;
  wallet_address: string;
  description: string;
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
