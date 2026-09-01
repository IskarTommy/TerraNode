export interface TelemetryRecord {
  id: string;
  farmer: string;
  recorded_at: string;
  temperature_celsius: number | null;
  soil_moisture_percentage: number | null;
  soil_ph: number | null;
  payload_sha256: string;
  schema_version: number;
  key_version: number;
  source_type: 'MANUAL' | 'DATASET_IMPORT' | 'SENSOR' | 'SYNTHETIC' | null;
  created_at: string;
}

export interface TelemetrySubmission {
  recorded_at?: string;
  temperature_celsius?: number | null;
  soil_moisture_percentage?: number | null;
  soil_ph?: number | null;
}

export interface TelemetryHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TelemetryRecord[];
}

export type LatestTelemetryResponse = TelemetryRecord;
