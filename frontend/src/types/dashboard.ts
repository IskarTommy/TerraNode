/* Shared dashboard view-model types used across role dashboards */

import type { TelemetryDataPoint } from '../components/Dashboard/FarmerDashboard/TelemetryChart';
import type { YieldPredictionDataPoint } from '../components/Dashboard/FarmerDashboard/YieldPredictionChart';

export type { TelemetryDataPoint, YieldPredictionDataPoint };

export type BatchLifecycleStatus = 'growing' | 'harvested' | 'minted' | 'shipped';

export interface BatchSummary {
  id: string;
  cropType: string;
  variety: string;
  plantedDate: string;
  estimatedHarvest: string;
  status: BatchLifecycleStatus;
  yieldEstimate?: number;
  qualityScore?: number;
  suiTxDigest?: string;
}

export type ActivityKind =
  | 'alert'
  | 'batch_minted'
  | 'batch_status'
  | 'transfer'
  | 'telemetry'
  | 'prediction';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  timestamp: string;
}

export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered';

export type CustodyStage = 'Harvest' | 'Storage' | 'Processing' | 'Transport' | 'Retail';

export interface CustodyStep {
  stage: CustodyStage;
  actor: string;
  timestamp?: string;
  txHash?: string;
  done: boolean;
}

export interface Shipment {
  id: string;
  batchId: string;
  from: string;
  to: string;
  status: ShipmentStatus;
  pickup: string;
  delivery: string;
  temperatureC: number | null;
  /** Temperature readings along the journey, for the cold-chain monitor */
  tempLog: Array<{ label: string; temp: number }>;
  custody: CustodyStep[];
}

export interface SystemMetricPoint {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}
