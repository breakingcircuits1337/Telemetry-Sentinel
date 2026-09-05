import {
  DataClassificationTier,
  EntropyDetection,
  ProcessInfo,
  TlsFingerprint,
  BlocklistMatch,
} from '../types';

/**
 * Calculates Shannon Entropy in bits per character.
 * Strings with entropy > 4.2 bits are strongly indicative of cryptographic IDs,
 * session cookies, salted hashes, or random device tokens.
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const frequencies = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  frequencies.forEach((count) => {
    const p = count / len;
    entropy -= p * Math.log2(p);
  });

  return Math.round(entropy * 100) / 100;
}

/**
 * Regex and Heuristic scanner detecting PII and High-Entropy Identifiers
 */
export function scanEntropyAndPii(key: string, value: string): EntropyDetection {
  const valStr = String(value);
  const entropy = calculateShannonEntropy(valStr);
  const keyLower = key.toLowerCase();

  let patternMatch: EntropyDetection['patternMatch'];

  // Email pattern
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(valStr) || keyLower.includes('email') || keyLower === 'em') {
    patternMatch = 'Email Address';
  }
  // UUIDv4 pattern
  else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valStr)) {
    patternMatch = 'UUIDv4';
  }
  // MAC Address pattern
  else if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(valStr) || keyLower.includes('mac_addr')) {
    patternMatch = 'MAC Address';
  }
  // GPS Coordinates pattern (e.g. 37.7749, -122.4194 or lat/lng)
  else if (
    (/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/.test(valStr) ||
      keyLower === 'lat' ||
      keyLower === 'lng' ||
      keyLower.includes('coord') ||
      keyLower.includes('gps')) &&
    !isNaN(Number(valStr))
  ) {
    patternMatch = 'GPS Coordinates';
  }
  // Bearer / API token pattern
  else if (valStr.startsWith('Bearer ') || keyLower.includes('token') || keyLower.includes('auth')) {
    patternMatch = 'Bearer Token';
  }
  // High-entropy hex or base64 token
  else if (valStr.length >= 16 && entropy >= 4.1) {
    patternMatch = 'Hex Token';
  }
  // Device identifier keys
  else if (
    keyLower === 'cid' ||
    keyLower === 'uid' ||
    keyLower === 'id' ||
    keyLower === 'ttp' ||
    keyLower === '_fbp' ||
    keyLower === 'deviceid' ||
    keyLower === 'advertising_id'
  ) {
    patternMatch = 'Device Identifier';
  }

  const isHighEntropy = entropy >= 4.2 || Boolean(patternMatch);

  return {
    field: key,
    value: valStr,
    entropyBits: entropy,
    isHighEntropy,
    patternMatch,
  };
}

/**
 * 3-Tier Schema Classification
 * 1. Trivial/Operational: App version, crash stacks, CPU, build number
 * 2. Intrusive/Behavioral: Clickstream, dwell times, scroll depths, active tab, mouse jitter
 * 3. Critical/PII: Location, contacts, hardware UUID, MAC, email, account hashes
 */
export function classifyDataTier(field: string, value: string): DataClassificationTier {
  const f = field.toLowerCase();
  const v = String(value).toLowerCase();

  // Tier 3: Critical / PII
  if (
    f.includes('email') ||
    f.includes('phone') ||
    f.includes('contact') ||
    f.includes('gps') ||
    f.includes('lat') ||
    f.includes('lng') ||
    f.includes('location') ||
    f.includes('mac') ||
    f.includes('uuid') ||
    f.includes('guid') ||
    f.includes('cid') ||
    f.includes('uid') ||
    f.includes('_fbp') ||
    f.includes('canvas') ||
    f.includes('audio_hash') ||
    f.includes('credit') ||
    f.includes('account') ||
    f.includes('serial') ||
    f.includes('keystroke') ||
    f.includes('imei') ||
    f.includes('advertising_id')
  ) {
    return 'critical_pii';
  }

  // Tier 2: Intrusive / Behavioral
  if (
    f.includes('scroll') ||
    f.includes('click') ||
    f.includes('dwell') ||
    f.includes('duration') ||
    f.includes('velocity') ||
    f.includes('cursor') ||
    f.includes('visibility') ||
    f.includes('rage') ||
    f.includes('path') ||
    f.includes('url') ||
    f.includes('referrer') ||
    f.includes('page') ||
    f.includes('viewport') ||
    f.includes('screen') ||
    f.includes('blur') ||
    f.includes('focus') ||
    f.includes('session')
  ) {
    return 'behavioral';
  }

  // Tier 1: Trivial / Operational
  return 'operational';
}

/**
 * Actionable Interdiction: Sanitization (Data Scrubbing)
 * Strips out tracking identifiers and high-entropy PII while preserving
 * basic operational metrics so the host app does not crash or malfunction.
 */
export function sanitizePayload(payload: Record<string, unknown> | string): {
  sanitized: Record<string, unknown> | string;
  sanitizedSnippet: string;
  strippedCount: number;
  strippedFields: string[];
} {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      const res = sanitizePayload(parsed);
      return {
        ...res,
        sanitized: JSON.stringify(res.sanitized, null, 2),
      };
    } catch {
      // Clean query string format e.g. "cid=xxx&sr=1920x1080"
      const parts = payload.split('&');
      const strippedFields: string[] = [];
      const cleaned = parts.filter((part) => {
        const [k] = part.split('=');
        const tier = classifyDataTier(k || '', '');
        if (tier === 'critical_pii') {
          strippedFields.push(k);
          return false;
        }
        return true;
      });

      return {
        sanitized: cleaned.join('&'),
        sanitizedSnippet: cleaned.join('&'),
        strippedCount: strippedFields.length,
        strippedFields,
      };
    }
  }

  const sanitized: Record<string, unknown> = {};
  const strippedFields: string[] = [];

  for (const [key, val] of Object.entries(payload)) {
    const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
    const tier = classifyDataTier(key, valStr);
    const entropyScan = scanEntropyAndPii(key, valStr);

    if (tier === 'critical_pii' || entropyScan.isHighEntropy) {
      strippedFields.push(key);
      // Substitute with scrubbed marker or omit
      sanitized[key] = '[SCRUBBED_BY_DEFENSE_PROXY]';
    } else {
      sanitized[key] = val;
    }
  }

  return {
    sanitized,
    sanitizedSnippet: JSON.stringify(sanitized, null, 2),
    strippedCount: strippedFields.length,
    strippedFields,
  };
}

/**
 * Maps outbound telemetry connection to active client process/executable
 */
export function resolveProcessForDomain(domain: string): ProcessInfo {
  const d = domain.toLowerCase();

  if (d.includes('discord')) {
    return {
      pid: 14280,
      name: 'discord.exe',
      path: '/Applications/Discord.app/Contents/MacOS/Discord',
      command: 'Discord --type=renderer --telemetry-enabled',
      cpuUsage: 2.8,
    };
  }
  if (d.includes('google') || d.includes('doubleclick')) {
    return {
      pid: 8924,
      name: 'chrome.exe',
      path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      command: 'Google Chrome --enable-features=NetworkService',
      cpuUsage: 4.1,
    };
  }
  if (d.includes('spotify')) {
    return {
      pid: 11408,
      name: 'spotify.exe',
      path: '/usr/bin/spotify',
      command: 'spotify --enable-crash-reporter',
      cpuUsage: 1.4,
    };
  }
  if (d.includes('microsoft') || d.includes('vortex') || d.includes('clarity')) {
    return {
      pid: 19430,
      name: 'Code.exe',
      path: '/usr/share/code/bin/code',
      command: 'code --status --telemetry-level=all',
      cpuUsage: 1.9,
    };
  }
  if (d.includes('zoom')) {
    return {
      pid: 6412,
      name: 'zoom.us',
      path: '/Applications/zoom.us.app/Contents/MacOS/zoom.us',
      command: 'zoom.us --metrics-heartbeat',
      cpuUsage: 3.2,
    };
  }
  if (d.includes('tiktok') || d.includes('byteoversea')) {
    return {
      pid: 22104,
      name: 'TikTokApp.exe',
      path: 'C:\\Program Files\\TikTok\\TikTok.exe',
      command: 'TikTok.exe --enable-analytics',
      cpuUsage: 5.6,
    };
  }
  if (d.includes('apple') || d.includes('icloud')) {
    return {
      pid: 412,
      name: 'analyticsd',
      path: '/System/Library/PrivateFrameworks/CoreAnalytics.framework/Support/analyticsd',
      command: 'analyticsd',
      cpuUsage: 0.4,
    };
  }

  // Default browser / webview process
  return {
    pid: 9240,
    name: 'browser_sandbox.exe',
    path: '/usr/lib/chromium/chrome-sandbox',
    command: 'browser_sandbox --origin=isolated',
    cpuUsage: 1.2,
  };
}

/**
 * SNI & Destination Fingerprinting (JA3 / JA4 Fingerprinting)
 */
export function resolveTlsFingerprint(domain: string, clientName?: string): TlsFingerprint {
  const d = domain.toLowerCase();

  if (d.includes('discord')) {
    return {
      sni: domain,
      ja3Hash: 'b32309a26951912be7dba376398abc3b',
      ja4String: 't13d1516h2_8daaf6152771_b93d69766d4b',
      clientType: 'Electron 31 / BoringSSL (Discord App)',
      cipherSuite: 'TLS_AES_128_GCM_SHA256',
    };
  }
  if (d.includes('google')) {
    return {
      sni: domain,
      ja3Hash: 'e7d705a3286e19ea42f587b344ee6865',
      ja4String: 't13d1715h2_5b23d903f902_c94d69766d4b',
      clientType: 'Chromium 128 / BoringSSL (Google Chrome)',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
    };
  }
  if (d.includes('microsoft')) {
    return {
      sni: domain,
      ja3Hash: '1c430e3860b764b8c9d1a3c77840391d',
      ja4String: 't13d2012h2_7ba3f81903e1_d83e71028a1c',
      clientType: 'Windows Schannel / WinHTTP',
      cipherSuite: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
    };
  }

  return {
    sni: domain,
    ja3Hash: '771,4865-4866-4867,0-23-65281-10-11,29-23-24,0',
    ja4String: 't13d1912h2_9a8b7c6d5e4f_e2f1a0b9c8d7',
    clientType: clientName || 'Standard TLS 1.3 Client Handshake',
    cipherSuite: 'TLS_CHACHA20_POLY1305_SHA256',
  };
}

/**
 * Blocklist matching against known reputation lists
 */
export function resolveBlocklistMatches(domain: string): BlocklistMatch[] {
  const d = domain.toLowerCase();
  const matches: BlocklistMatch[] = [];

  // OISD Big
  if (
    d.includes('google-analytics') ||
    d.includes('doubleclick') ||
    d.includes('facebook') ||
    d.includes('tiktok') ||
    d.includes('hotjar') ||
    d.includes('criteo') ||
    d.includes('telemetry')
  ) {
    matches.push({
      listName: 'OISD Big',
      category: 'Telemetry / Adware / Tracking',
      matchedRule: `||${d}^$all`,
    });
  }

  // StevenBlack Hosts
  if (
    d.includes('analytics') ||
    d.includes('stats') ||
    d.includes('track') ||
    d.includes('pixel') ||
    d.includes('telemetry')
  ) {
    matches.push({
      listName: 'StevenBlack Hosts',
      category: 'Unified Adware + Spyware + Telemetry',
      matchedRule: `0.0.0.0 ${d}`,
    });
  }

  // EasyPrivacy
  if (
    d.includes('hotjar') ||
    d.includes('clarity') ||
    d.includes('fullstory') ||
    d.includes('segment') ||
    d.includes('adjust')
  ) {
    matches.push({
      listName: 'EasyPrivacy',
      category: 'Session Replay & Fingerprinting Defense',
      matchedRule: `||${d}^$third-party`,
    });
  }

  // AdGuard DNS
  if (d.includes('doubleclick') || d.includes('google-analytics') || d.includes('app-measurement')) {
    matches.push({
      listName: 'AdGuard DNS',
      category: 'DNS Tracking Protection Filter',
      matchedRule: `||${d}^`,
    });
  }

  return matches;
}

export interface MockActiveSocket {
  id: string;
  process: ProcessInfo;
  protocol: 'TCP' | 'UDP' | 'DoH';
  localPort: number;
  remoteAddress: string;
  destinationHost: string;
  tls: TlsFingerprint;
  dataTier: DataClassificationTier;
  state: 'ESTABLISHED' | 'SINKHOLED' | 'SANITIZED' | 'INSPECTING';
  bytesSent: number;
  packetsOut: number;
  matchedBlocklists: string[];
}

export const MOCK_ACTIVE_SOCKETS: MockActiveSocket[] = [
  {
    id: 'sock-1',
    process: {
      pid: 14280,
      name: 'discord.exe',
      path: '/Applications/Discord.app/Contents/MacOS/Discord',
      command: 'Discord --type=renderer --telemetry-enabled',
      cpuUsage: 2.8,
    },
    protocol: 'TCP',
    localPort: 54192,
    remoteAddress: '162.159.130.233:443',
    destinationHost: 'telemetry.discord.gg',
    tls: {
      sni: 'telemetry.discord.gg',
      ja3Hash: 'b32309a26951912be7dba376398abc3b',
      ja4String: 't13d1516h2_8daaf6152771_b93d69766d4b',
      clientType: 'Electron 31 / BoringSSL',
    },
    dataTier: 'critical_pii',
    state: 'SINKHOLED',
    bytesSent: 0,
    packetsOut: 48,
    matchedBlocklists: ['OISD Big', 'StevenBlack Hosts'],
  },
  {
    id: 'sock-2',
    process: {
      pid: 8924,
      name: 'chrome.exe',
      path: '/Applications/Google Chrome.app',
      command: 'Google Chrome --enable-features=NetworkService',
      cpuUsage: 4.1,
    },
    protocol: 'TCP',
    localPort: 51204,
    remoteAddress: '142.250.190.46:443',
    destinationHost: 'google-analytics.com',
    tls: {
      sni: 'google-analytics.com',
      ja3Hash: 'e7d705a3286e19ea42f587b344ee6865',
      ja4String: 't13d1715h2_5b23d903f902_c94d69766d4b',
      clientType: 'Chromium 128 / BoringSSL',
    },
    dataTier: 'critical_pii',
    state: 'SANITIZED',
    bytesSent: 340,
    packetsOut: 112,
    matchedBlocklists: ['OISD Big', 'StevenBlack Hosts', 'AdGuard DNS'],
  },
  {
    id: 'sock-3',
    process: {
      pid: 19430,
      name: 'Code.exe',
      path: '/usr/share/code/bin/code',
      command: 'code --telemetry-level=all',
      cpuUsage: 1.9,
    },
    protocol: 'TCP',
    localPort: 49830,
    remoteAddress: '20.54.89.112:443',
    destinationHost: 'vortex.data.microsoft.com',
    tls: {
      sni: 'vortex.data.microsoft.com',
      ja3Hash: '1c430e3860b764b8c9d1a3c77840391d',
      ja4String: 't13d2012h2_7ba3f81903e1_d83e71028a1c',
      clientType: 'WinHTTP / SChannel',
    },
    dataTier: 'behavioral',
    state: 'ESTABLISHED',
    bytesSent: 1840,
    packetsOut: 24,
    matchedBlocklists: ['StevenBlack Hosts'],
  },
  {
    id: 'sock-4',
    process: {
      pid: 11408,
      name: 'spotify.exe',
      path: '/usr/bin/spotify',
      command: 'spotify --enable-crash-reporter',
      cpuUsage: 1.4,
    },
    protocol: 'TCP',
    localPort: 52188,
    remoteAddress: '35.186.224.25:443',
    destinationHost: 'spclient.wg.spotify.com',
    tls: {
      sni: 'spclient.wg.spotify.com',
      ja3Hash: '9a7c3b21890e4f1a2b3c4d5e6f7a8b9c',
      ja4String: 't13d1814h2_4c5d6e7f8a9b_1a2b3c4d5e6f',
      clientType: 'Chromium Embedded Framework (CEF)',
    },
    dataTier: 'operational',
    state: 'ESTABLISHED',
    bytesSent: 620,
    packetsOut: 18,
    matchedBlocklists: [],
  },
];
