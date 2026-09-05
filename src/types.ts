export type AlertSeverity = 'critical' | 'warning' | 'info';

export type DataClassificationTier = 'operational' | 'behavioral' | 'critical_pii';

export type InterdictionAction = 'allowed' | 'blocked' | 'sanitized' | 'poisoned';

export type TelemetryCategory =
  | 'hardware_fingerprint'
  | 'network_location'
  | 'behavioral_biometrics'
  | 'keystroke_recorder'
  | 'browsing_history'
  | 'cross_site_identity'
  | 'sensor_ambient'
  | 'financial_commercial';

export interface PoisonEngineConfig {
  enabled: boolean;
  variance: number; // 0.01 to 0.25
  fingerprintJitter: boolean;
  behavioralNoise: boolean;
  garbagePollution: boolean;
  injectDecoySignature: boolean;
}

export interface PoisonEngineMetrics {
  totalPollutedPackets: number;
  jitteredDataPointsCount: number;
  garbageMetricsInjectedCount: number;
  decoyProfilesFloodedCount: number;
  identityEntropyDisruptionPct: number;
}

export interface NoiseMutationRecord {
  id: string;
  timestamp: number;
  harvester: string;
  url: string;
  originalPayloadSnippet: string;
  mutatedPayloadSnippet: string;
  mutationsCount: number;
  types: ('jitter' | 'decoy_behavior' | 'garbage_field')[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  path: string;
  command?: string;
  cpuUsage?: number;
}

export interface TlsFingerprint {
  sni: string;
  ja3Hash: string;
  ja4String: string;
  clientType: string;
  cipherSuite?: string;
}

export interface BlocklistMatch {
  listName: 'OISD Big' | 'StevenBlack Hosts' | 'Peter Lowe' | 'EasyPrivacy' | 'AdGuard DNS';
  category: string;
  matchedRule: string;
}

export interface EntropyDetection {
  field: string;
  value: string;
  entropyBits: number;
  isHighEntropy: boolean;
  patternMatch?: 'Email Address' | 'UUIDv4' | 'MAC Address' | 'GPS Coordinates' | 'Bearer Token' | 'Hex Token' | 'Device Identifier';
}

export interface TelemetryAlert {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  category: TelemetryCategory;
  tier: DataClassificationTier;
  harvesterName: string;
  harvesterCategory: string;
  destinationHost: string;
  ipAddress?: string;
  port?: number;
  protocol?: 'HTTPS' | 'DNS' | 'WSS' | 'UDP';
  triggerEvent: string;
  harvestedFields: {
    field: string;
    value: string;
    risk: 'high' | 'medium' | 'low';
    description: string;
    entropyBits?: number;
    tier?: DataClassificationTier;
  }[];
  rawPayloadSnippet?: string;
  sanitizedPayloadSnippet?: string;
  poisonedPayloadSnippet?: string;
  isPoisoned?: boolean;
  poisonMutations?: {
    field: string;
    original: string;
    mutated: string;
    type: 'jitter' | 'decoy_behavior' | 'garbage_field';
  }[];
  originalPayload?: Record<string, unknown>;
  method: 'BEACON' | 'FETCH' | 'XHR' | 'DOM_EVENT' | 'PROBE' | 'DNS';
  isSimulated?: boolean;
  interdictionAction: InterdictionAction;
  process?: ProcessInfo;
  tls?: TlsFingerprint;
  blocklistMatches?: BlocklistMatch[];
  entropyDetections?: EntropyDetection[];
  pingCount?: number;
  lastSeen?: number;
  geoClusterId?: string;
}

export interface GeoServerCluster {
  id: string;
  name: string;
  region: 'North America' | 'Europe' | 'Asia Pacific' | 'Latin America' | 'Oceania';
  datacenter: string;
  city: string;
  country: string;
  coordinates: [number, number]; // [longitude, latitude]
  primaryHarvesters: string[];
  harvestIntensityWeight: number; // base factor
  defaultIp: string;
}

export interface ClientOriginLocation {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
  coordinates: [number, number]; // [longitude, latitude]
  clientIp: string;
  ispOrAsn: string;
}

export interface ClusterTelemetryStats {
  cluster: GeoServerCluster;
  requestCount: number;
  blockedCount: number;
  allowedCount: number;
  poisonedCount: number;
  sanitizedCount: number;
  estimatedBytesHarvested: number;
  activeHarvesters: string[];
  dataTiers: Set<DataClassificationTier>;
  lastHarvestTimestamp?: number;
}

export interface TrackerEntity {
  id: string;
  name: string;
  company: string;
  parentCompany?: string;
  category: 'AdTech & Profiling' | 'Session Replay' | 'Data Broker' | 'OS & Device' | 'Crash & Metrics';
  riskScore: number; // 1-100
  harvestedDataTypes: TelemetryCategory[];
  knownDomains: string[];
  trackingTechniques: string[];
  description: string;
  jurisdiction: string;
  optOutUrl?: string;
  blockRule: string;
  sampleBeacon: {
    url: string;
    method: 'POST' | 'GET';
    payload: Record<string, unknown>;
  };
}

export interface BrowserProbeResult {
  screen: {
    resolution: string;
    availResolution: string;
    colorDepth: number;
    pixelRatio: number;
    orientation: string;
  };
  hardware: {
    cpuCores: number;
    deviceMemoryGb: number | null;
    touchPoints: number;
    gpuVendor: string;
    gpuRenderer: string;
  };
  fingerprints: {
    canvasHash: string;
    canvasDataUri?: string;
    webglVendorHash: string;
    audioContextHash: string;
  };
  networkLocale: {
    timezone: string;
    timezoneOffset: number;
    languages: string[];
    cookiesEnabled: boolean;
    doNotTrack: string | null;
    connectionType?: string;
  };
  storageTelemetry: {
    localStorageKeys: number;
    sessionStorageKeys: number;
    indexedDbSupported: boolean;
  };
  battery?: {
    level: number;
    charging: boolean;
  };
  uniquenessScore: number; // 0 - 100
  exposedSurfacesCount: number;
}

export interface HealthScoreHistoryPoint {
  index: number;
  timestamp: number;
  label: string;
  hourOffset: number; // e.g., -23 to 0
  hourlyScore: number; // point-in-time score for this specific hour
  cumulativeScore: number; // rolling score up to this hour
  displayScore: number; // primary score plotted
  blockedCount: number;
  allowedCount: number;
  defendedCount: number;
  totalAlerts: number;
}

export interface HealthTrendAnalysis {
  data: HealthScoreHistoryPoint[];
  startScore: number;
  currentScore: number;
  delta: number;
  deltaPct: number;
  direction: 'improving' | 'declining' | 'stable';
  minScore: number;
  maxScore: number;
  avgScore: number;
  minPoint: HealthScoreHistoryPoint;
  maxPoint: HealthScoreHistoryPoint;
  colorHex: string;
  statusLabel: string;
  summaryText: string;
}

export interface EntropyCellData {
  timeSlotIndex: number;
  timeLabel: string;
  timestamp: number;
  channelId: string;
  channelName: string;
  packetCount: number;
  maxEntropy: number;
  avgEntropy: number;
  hasHighEntropyBurst: boolean;
  leakClassification: 'Bearer Token' | 'Encrypted PII' | 'Crypto Fingerprint' | 'Session UUID' | 'None';
  alerts: TelemetryAlert[];
}

export interface EntropyBurstRecord {
  id: string;
  alertId: string;
  timestamp: number;
  harvesterName: string;
  destinationHost: string;
  field: string;
  tokenSnippet: string;
  entropyBits: number;
  leakType: 'Bearer Token' | 'Encrypted PII' | 'Canvas/Audio Hash' | 'Session UUID' | 'Device Identifier' | 'Hex Hash';
  interdictionAction: InterdictionAction;
  rawPayload: string;
}

export interface EntropyWaveformPoint {
  index: number;
  char: string;
  substring: string;
  entropy: number;
  isSpike: boolean;
}

