import { GeoServerCluster, ClientOriginLocation, TelemetryAlert, ClusterTelemetryStats } from '../types';

export const GLOBAL_SERVER_CLUSTERS: GeoServerCluster[] = [
  {
    id: 'us-east-ashburn',
    name: 'US-East (Ashburn / N. Virginia)',
    region: 'North America',
    datacenter: 'AWS us-east-1 / Equinix DC2',
    city: 'Ashburn, VA',
    country: 'United States',
    coordinates: [-77.4875, 39.0438],
    primaryHarvesters: ['Google Analytics 4', 'Meta Conversions API', 'Amazon APS', 'Segment CDP', 'Datadog US'],
    harvestIntensityWeight: 1.6,
    defaultIp: '142.250.190.46',
  },
  {
    id: 'us-west-silicon-valley',
    name: 'US-West (Silicon Valley / Oregon)',
    region: 'North America',
    datacenter: 'GCP us-west1 / AWS us-west-2',
    city: 'San Jose & The Dalles, OR',
    country: 'United States',
    coordinates: [-121.8863, 37.3382],
    primaryHarvesters: ['Google Signals', 'Apple Metrics', 'Meta Graph', 'FullStory Replay'],
    harvestIntensityWeight: 1.3,
    defaultIp: '172.217.14.206',
  },
  {
    id: 'eu-central-frankfurt',
    name: 'EU-Central (Frankfurt & Dublin)',
    region: 'Europe',
    datacenter: 'AWS eu-central-1 / GCP europe-west3',
    city: 'Frankfurt, Germany',
    country: 'Germany',
    coordinates: [8.6821, 50.1109],
    primaryHarvesters: ['Hotjar Replay', 'Criteo OneTag', 'Datadog EU', 'Google EU Ingestion'],
    harvestIntensityWeight: 1.2,
    defaultIp: '18.196.224.11',
  },
  {
    id: 'eu-west-london',
    name: 'EU-West (London & Amsterdam)',
    region: 'Europe',
    datacenter: 'Equinix LD8 / AMS-IX Telemetry',
    city: 'London, UK',
    country: 'United Kingdom',
    coordinates: [-0.1278, 51.5074],
    primaryHarvesters: ['Microsoft Clarity', 'Snowplow Analytics', 'Contentsquare'],
    harvestIntensityWeight: 1.1,
    defaultIp: '51.140.80.35',
  },
  {
    id: 'apac-singapore',
    name: 'Asia-Pacific (Singapore Hub)',
    region: 'Asia Pacific',
    datacenter: 'AWS ap-southeast-1 / ByteDance SG',
    city: 'Singapore',
    country: 'Singapore',
    coordinates: [103.8198, 1.3521],
    primaryHarvesters: ['TikTok Pixel', 'ByteDance Events', 'Shopee CDP', 'Alibaba Metrics'],
    harvestIntensityWeight: 1.4,
    defaultIp: '13.250.12.88',
  },
  {
    id: 'apac-tokyo',
    name: 'Asia-East (Tokyo, Japan)',
    region: 'Asia Pacific',
    datacenter: 'AWS ap-northeast-1 / GCP asia-northeast1',
    city: 'Tokyo, Japan',
    country: 'Japan',
    coordinates: [139.6917, 35.6895],
    primaryHarvesters: ['LINE Analytics', 'Google APAC Hub', 'Yahoo JP DMP'],
    harvestIntensityWeight: 0.9,
    defaultIp: '52.198.112.5',
  },
  {
    id: 'latam-saopaulo',
    name: 'South America (São Paulo)',
    region: 'Latin America',
    datacenter: 'AWS sa-east-1 / Equinix SP3',
    city: 'São Paulo, Brazil',
    country: 'Brazil',
    coordinates: [-46.6333, -23.5505],
    primaryHarvesters: ['Meta LatAm Collector', 'Google SA Gateway', 'Mercado DMP'],
    harvestIntensityWeight: 0.8,
    defaultIp: '177.71.180.12',
  },
  {
    id: 'oceania-sydney',
    name: 'Oceania (Sydney Edge Collector)',
    region: 'Oceania',
    datacenter: 'AWS ap-southeast-2 / NextDC S1',
    city: 'Sydney, Australia',
    country: 'Australia',
    coordinates: [151.2093, -33.8688],
    primaryHarvesters: ['Google ANZ Telemetry', 'Meta Edge Sydney', 'Segment Oceania'],
    harvestIntensityWeight: 0.7,
    defaultIp: '13.238.10.42',
  },
];

export const CLIENT_ORIGINS: ClientOriginLocation[] = [
  {
    id: 'origin-us-west',
    name: 'Local Browser Egress (Silicon Valley)',
    city: 'San Jose, CA',
    region: 'North America',
    country: 'United States',
    coordinates: [-121.8863, 37.3382],
    clientIp: '198.51.100.42 (Local Egress)',
    ispOrAsn: 'Cloudflare / Local Fiber WAN',
  },
  {
    id: 'origin-us-east',
    name: 'Client Node (New York Metro)',
    city: 'New York, NY',
    region: 'North America',
    country: 'United States',
    coordinates: [-74.006, 40.7128],
    clientIp: '198.51.100.88 (East Node)',
    ispOrAsn: 'Verizon Fios / CDN Edge',
  },
  {
    id: 'origin-eu-west',
    name: 'Client Node (Western Europe)',
    city: 'Amsterdam, NL',
    region: 'Europe',
    country: 'Netherlands',
    coordinates: [4.9041, 52.3676],
    clientIp: '198.51.100.120 (AMS Egress)',
    ispOrAsn: 'KPN / Amsterdam Internet Exchange',
  },
];

export const DEFAULT_CLIENT_ORIGIN = CLIENT_ORIGINS[0];

// Deterministic or domain-guided mapping from alert to global server cluster
export function mapAlertToCluster(alert: TelemetryAlert): GeoServerCluster {
  const host = (alert.destinationHost || '').toLowerCase();
  const harvester = (alert.harvesterName || '').toLowerCase();

  if (alert.geoClusterId) {
    const matched = GLOBAL_SERVER_CLUSTERS.find((c) => c.id === alert.geoClusterId);
    if (matched) return matched;
  }

  // Domain & Harvester heuristics
  if (host.includes('tiktok') || host.includes('bytedance') || harvester.includes('tiktok')) {
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'apac-singapore')!;
  }
  if (host.includes('hotjar') || harvester.includes('hotjar')) {
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'eu-central-frankfurt')!;
  }
  if (host.includes('criteo') || harvester.includes('criteo')) {
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'eu-central-frankfurt')!;
  }
  if (host.includes('clarity') || harvester.includes('clarity')) {
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'eu-west-london')!;
  }
  if (host.includes('fullstory') || harvester.includes('fullstory')) {
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'us-west-silicon-valley')!;
  }
  if (host.includes('segment') || harvester.includes('segment')) {
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'us-west-silicon-valley')!;
  }
  if (host.includes('datadog') || harvester.includes('datadog')) {
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'us-east-ashburn')!;
  }
  if (host.includes('amazon') || harvester.includes('amazon')) {
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'us-east-ashburn')!;
  }
  if (host.includes('facebook') || host.includes('meta') || harvester.includes('meta')) {
    // 60% US East, 40% EU Central
    const charCode = host.charCodeAt(0) + (alert.id ? alert.id.charCodeAt(alert.id.length - 1) : 0);
    return charCode % 2 === 0
      ? GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'us-east-ashburn')!
      : GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'eu-central-frankfurt')!;
  }
  if (host.includes('google') || harvester.includes('google')) {
    const charCode = alert.id ? alert.id.charCodeAt(alert.id.length - 1) : 0;
    if (charCode % 3 === 0) return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'us-east-ashburn')!;
    if (charCode % 3 === 1) return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'us-west-silicon-valley')!;
    return GLOBAL_SERVER_CLUSTERS.find((c) => c.id === 'apac-tokyo')!;
  }

  // Fallback: hash the host string to evenly distribute across clusters with realistic weights
  let hash = 0;
  for (let i = 0; i < host.length; i++) {
    hash = (hash << 5) - hash + host.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GLOBAL_SERVER_CLUSTERS.length;
  return GLOBAL_SERVER_CLUSTERS[index];
}

// Aggregate telemetry metrics per cluster
export function calculateClusterTelemetryStats(
  alerts: TelemetryAlert[],
  horizonMs: number = 24 * 60 * 60 * 1000
): Record<string, ClusterTelemetryStats> {
  const now = Date.now();
  const windowAlerts = alerts.filter((a) => now - a.timestamp <= horizonMs);

  const statsMap: Record<string, ClusterTelemetryStats> = {};

  GLOBAL_SERVER_CLUSTERS.forEach((cluster) => {
    statsMap[cluster.id] = {
      cluster,
      requestCount: 0,
      blockedCount: 0,
      allowedCount: 0,
      poisonedCount: 0,
      sanitizedCount: 0,
      estimatedBytesHarvested: 0,
      activeHarvesters: [],
      dataTiers: new Set(),
      lastHarvestTimestamp: undefined,
    };
  });

  const harvesterSetMap: Record<string, Set<string>> = {};
  GLOBAL_SERVER_CLUSTERS.forEach((c) => {
    harvesterSetMap[c.id] = new Set();
  });

  windowAlerts.forEach((alert) => {
    const cluster = mapAlertToCluster(alert);
    const stat = statsMap[cluster.id];
    if (!stat) return;

    stat.requestCount++;
    if (alert.interdictionAction === 'blocked') stat.blockedCount++;
    else if (alert.interdictionAction === 'allowed') stat.allowedCount++;
    else if (alert.interdictionAction === 'poisoned') stat.poisonedCount++;
    else if (alert.interdictionAction === 'sanitized') stat.sanitizedCount++;

    // Estimate bytes harvested (raw payload length or field estimation)
    const payloadLen = alert.rawPayloadSnippet ? alert.rawPayloadSnippet.length : (alert.harvestedFields.length * 90);
    stat.estimatedBytesHarvested += Math.max(380, payloadLen);

    if (alert.harvesterName) {
      harvesterSetMap[cluster.id].add(alert.harvesterName);
    }
    if (alert.tier) {
      stat.dataTiers.add(alert.tier);
    }
    if (!stat.lastHarvestTimestamp || alert.timestamp > stat.lastHarvestTimestamp) {
      stat.lastHarvestTimestamp = alert.timestamp;
    }
  });

  GLOBAL_SERVER_CLUSTERS.forEach((cluster) => {
    statsMap[cluster.id].activeHarvesters = Array.from(harvesterSetMap[cluster.id]);
    if (statsMap[cluster.id].activeHarvesters.length === 0) {
      // Seed with primary harvesters for context
      statsMap[cluster.id].activeHarvesters = cluster.primaryHarvesters.slice(0, 2);
    }
  });

  return statsMap;
}
