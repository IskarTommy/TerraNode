export interface TelemetryRecord {
  id: string;
  farmer: string;
  recorded_at: string;
  temperature_celsius: number;
  soil_moisture_percentage: number;
  soil_ph: number;
  payload_sha256: string;
}

export interface TelemetrySubmission {
  temperature_celsius: number;
  soil_moisture_percentage: number;
  soil_ph: number;
}

export interface TelemetryHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TelemetryRecord[];
}

export interface LatestTelemetryResponse {
  temperature_celsius: number | null;
  soil_moisture_percentage: number | null;
  soil_ph: number | null;
  recorded_at: string | null;
}

export interface TelemetryChartDataPoint {
  timestamp: string;
  temperature: number;
  moisture: number;
  ph: number;
}
