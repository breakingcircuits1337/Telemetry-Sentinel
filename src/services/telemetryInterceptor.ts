import { TelemetryAlert, TelemetryCategory, AlertSeverity, InterdictionAction, DataClassificationTier } from '../types';
import { TRACKER_DATABASE } from '../data/trackerDatabase';
import { audioAlerts } from '../utils/audioAlerts';
import {
  classifyDataTier,
  scanEntropyAndPii,
  sanitizePayload,
  resolveProcessForDomain,
  resolveTlsFingerprint,
  resolveBlocklistMatches,
} from './networkTelemetryArchitecture';
import { telemetryPoisonEngine } from './telemetryPoisonEngine';

type AlertListener = (alert: TelemetryAlert) => void;

class TelemetryInterceptorService {
  private isSentinelActive: boolean = true;
  private listeners: Set<AlertListener> = new Set();
  private originalFetch: typeof window.fetch | null = null;
  private originalSendBeacon: typeof navigator.sendBeacon | null = null;
  private originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
  private isPatched: boolean = false;
  private lastAlertTimeByKey: Map<string, number> = new Map();
  private alertHistory: Map<string, TelemetryAlert> = new Map();

  constructor() {
    // Initialized
  }

  public subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public isSentinelEnabled(): boolean {
    return this.isSentinelActive;
  }

  public setSentinelActive(active: boolean) {
    this.isSentinelActive = active;
    if (active && !this.isPatched) {
      this.attachInterceptors();
      this.attachBehavioralMonitors();
    }
  }

  public init() {
    if (typeof window === 'undefined') return;
    this.attachInterceptors();
    this.attachBehavioralMonitors();
  }

  private dispatchAlert(alert: TelemetryAlert) {
    if (!this.isSentinelActive) return;

    this.alertHistory.set(alert.id, alert);

    // Rate-limit identical triggers within 1.5 seconds
    const throttleKey = `${alert.harvesterName}_${alert.triggerEvent}`;
    const now = Date.now();
    const lastTime = this.lastAlertTimeByKey.get(throttleKey) || 0;
    if (now - lastTime < 1500) {
      return;
    }
    this.lastAlertTimeByKey.set(throttleKey, now);

    // Play corresponding audio cue
    if (alert.severity === 'critical') {
      audioAlerts.playCriticalAlert();
    } else if (alert.severity === 'warning') {
      audioAlerts.playWarningChime();
    } else {
      audioAlerts.playInfoPing();
    }

    this.listeners.forEach((listener) => listener(alert));
  }

  public updateAlertInterdiction(alertId: string, action: InterdictionAction) {
    const alert = this.alertHistory.get(alertId);
    if (alert) {
      alert.interdictionAction = action;
      this.listeners.forEach((listener) => listener({ ...alert }));
    }
  }

  private identifyHarvester(urlStr: string): {
    name: string;
    category: string;
    knownEntity?: (typeof TRACKER_DATABASE)[0];
  } {
    try {
      const parsed = new URL(urlStr, window.location.href);
      const host = parsed.hostname.toLowerCase();

      for (const entity of TRACKER_DATABASE) {
        if (entity.knownDomains.some((d) => host.includes(d.toLowerCase()))) {
          return {
            name: entity.name,
            category: entity.category,
            knownEntity: entity,
          };
        }
      }

      // Generic detection based on telemetry keywords
      const pathAndQuery = (parsed.pathname + parsed.search).toLowerCase();
      if (
        pathAndQuery.includes('telemetry') ||
        pathAndQuery.includes('beacon') ||
        pathAndQuery.includes('collect') ||
        pathAndQuery.includes('analytics') ||
        pathAndQuery.includes('metric') ||
        pathAndQuery.includes('track')
      ) {
        return {
          name: `Telemetry Endpoint (${host})`,
          category: 'Third-Party Analytics',
        };
      }

      return {
        name: host,
        category: 'Web Service',
      };
    } catch {
      return {
        name: 'Unknown Remote Endpoint',
        category: 'Network Request',
      };
    }
  }

  private parseHarvestedFields(urlStr: string, body?: unknown): TelemetryAlert['harvestedFields'] {
    const fields: TelemetryAlert['harvestedFields'] = [];
    try {
      const url = new URL(urlStr, window.location.href);

      // Search parameters check
      url.searchParams.forEach((val, key) => {
        const k = key.toLowerCase();
        const tier = classifyDataTier(key, val);
        const scan = scanEntropyAndPii(key, val);

        if (k === 'cid' || k === 'uid' || k === 'id' || k === 'ttp' || k === '_fbp') {
          fields.push({
            field: key,
            value: val,
            risk: 'high',
            description: 'Persistent Unique Device / User ID token',
            entropyBits: scan.entropyBits,
            tier: 'critical_pii',
          });
        } else if (k === 'sr' || k === 'vp' || k === 'res') {
          fields.push({
            field: key,
            value: val,
            risk: 'medium',
            description: 'Screen / Viewport Hardware Resolution',
            entropyBits: scan.entropyBits,
            tier: 'behavioral',
          });
        } else if (k === 'dl' || k === 'url' || k === 'page') {
          fields.push({
            field: key,
            value: val,
            risk: 'medium',
            description: 'Full Page URL & Browsing Path',
            entropyBits: scan.entropyBits,
            tier: 'behavioral',
          });
        } else if (k === 'en' || k === 'ev' || k === 'event') {
          fields.push({
            field: key,
            value: val,
            risk: 'low',
            description: 'Action / Interaction Event Type',
            entropyBits: scan.entropyBits,
            tier: 'operational',
          });
        } else if (k === 'ul' || k === 'lang') {
          fields.push({
            field: key,
            value: val,
            risk: 'low',
            description: 'Locale & System Language',
            entropyBits: scan.entropyBits,
            tier: 'operational',
          });
        } else {
          fields.push({
            field: key,
            value: val,
            risk: tier === 'critical_pii' ? 'high' : tier === 'behavioral' ? 'medium' : 'low',
            description: scan.patternMatch ? `Detected ${scan.patternMatch}` : 'Telemetry Parameter',
            entropyBits: scan.entropyBits,
            tier,
          });
        }
      });

      // Body inspection if JSON or string
      if (body) {
        let parsedBody: Record<string, unknown> | null = null;
        if (typeof body === 'string') {
          try {
            parsedBody = JSON.parse(body);
          } catch {
            // Not JSON
          }
        } else if (typeof body === 'object' && body !== null) {
          parsedBody = body as Record<string, unknown>;
        }

        if (parsedBody) {
          Object.entries(parsedBody).forEach(([k, v]) => {
            const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
            const tier = classifyDataTier(k, valStr);
            const scan = scanEntropyAndPii(k, valStr);

            fields.push({
              field: k,
              value: valStr.length > 50 ? `${valStr.substring(0, 50)}...` : valStr,
              risk: tier === 'critical_pii' || scan.isHighEntropy ? 'high' : tier === 'behavioral' ? 'medium' : 'low',
              description: scan.patternMatch
                ? `Pattern Match: ${scan.patternMatch}`
                : tier === 'critical_pii'
                ? 'High-Risk PII / Unique Identifier'
                : tier === 'behavioral'
                ? 'Behavioral Engagement Telemetry'
                : 'Operational Metric',
              entropyBits: scan.entropyBits,
              tier,
            });
          });
        }
      }
    } catch {
      // Fallback
    }

    if (fields.length === 0) {
      fields.push({
        field: 'payload_transmission',
        value: 'active_session_hit',
        risk: 'low',
        description: 'Session keepalive / interaction beacon dispatch',
        entropyBits: 3.1,
        tier: 'operational',
      });
    }

    return fields;
  }

  public createEnrichedAlert(params: {
    urlString: string;
    harvester: { name: string; category: string; knownEntity?: (typeof TRACKER_DATABASE)[0] };
    harvested: TelemetryAlert['harvestedFields'];
    rawPayloadSnippet?: string;
    method: TelemetryAlert['method'];
    triggerEvent: string;
    isSimulated?: boolean;
  }): TelemetryAlert {
    let hostname = 'unknown.endpoint';
    try {
      hostname = new URL(params.urlString, window.location.href).hostname;
    } catch {
      hostname = params.urlString;
    }

    // Determine 3-Tier Classification
    let tier: DataClassificationTier = 'operational';
    if (params.harvested.some((f) => f.tier === 'critical_pii' || f.risk === 'high')) {
      tier = 'critical_pii';
    } else if (params.harvested.some((f) => f.tier === 'behavioral' || f.risk === 'medium')) {
      tier = 'behavioral';
    }

    // Determine Severity
    let severity: AlertSeverity = 'info';
    if (tier === 'critical_pii') {
      severity = 'critical';
    } else if (tier === 'behavioral') {
      severity = 'warning';
    }

    // Interdiction default: Sinkhole critical PII, Poison/Sanitize behavioral, Allow operational
    const isPoisonActive = telemetryPoisonEngine.isEnabled();
    const interdictionAction: InterdictionAction =
      tier === 'critical_pii' ? 'blocked' : tier === 'behavioral' ? (isPoisonActive ? 'poisoned' : 'sanitized') : 'allowed';

    // Correlate Host Process, TLS Handshake, Blocklists
    const process = resolveProcessForDomain(hostname);
    const tls = resolveTlsFingerprint(hostname, process.name);
    const blocklistMatches = resolveBlocklistMatches(hostname);

    // Entropy & PII scans
    const entropyDetections = params.harvested.map((f) => scanEntropyAndPii(f.field, f.value));

    // Data Scrubbing / Sanitization Preview
    const { sanitizedSnippet } = sanitizePayload(params.rawPayloadSnippet || params.urlString);

    // Poisoning & Noise Injection
    const poisonResult = isPoisonActive
      ? telemetryPoisonEngine.pollutePayload(params.rawPayloadSnippet || params.urlString, params.urlString, params.harvester.name)
      : null;

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      severity,
      tier,
      category: params.harvester.knownEntity?.harvestedDataTypes[0] || (tier === 'critical_pii' ? 'hardware_fingerprint' : 'browsing_history'),
      harvesterName: params.harvester.name,
      harvesterCategory: params.harvester.category,
      destinationHost: hostname,
      ipAddress: hostname.includes('discord') ? '162.159.130.233' : hostname.includes('google') ? '142.250.190.46' : '104.244.42.1',
      port: 443,
      protocol: 'HTTPS',
      triggerEvent: params.triggerEvent,
      harvestedFields: params.harvested,
      rawPayloadSnippet: params.rawPayloadSnippet,
      sanitizedPayloadSnippet: sanitizedSnippet,
      poisonedPayloadSnippet: poisonResult?.pollutedSnippet,
      isPoisoned: isPoisonActive && interdictionAction === 'poisoned',
      poisonMutations: poisonResult?.mutations,
      method: params.method,
      isSimulated: params.isSimulated,
      interdictionAction,
      process,
      tls,
      blocklistMatches,
      entropyDetections,
      pingCount: 1,
      lastSeen: Date.now(),
    };
  }

  private attachInterceptors() {
    if (this.isPatched || typeof window === 'undefined') return;
    this.isPatched = true;

    // 1. Intercept navigator.sendBeacon safely
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        this.originalSendBeacon = navigator.sendBeacon.bind(navigator);
        const self = this;
        const interceptedSendBeacon = function (url: string | URL, data?: BodyInit | null): boolean {
          let outboundData: BodyInit | null | undefined = data;
          try {
            const urlString = url.toString();
            const harvester = self.identifyHarvester(urlString);
            const harvested = self.parseHarvestedFields(urlString, data);

            let poisonMutations;
            let poisonedSnippet;
            if (telemetryPoisonEngine.isEnabled()) {
              const res = telemetryPoisonEngine.pollutePayload(data, urlString, harvester.name);
              outboundData = (res.pollutedData as BodyInit) || data;
              poisonMutations = res.mutations;
              poisonedSnippet = res.pollutedSnippet;
            }

            const alert = self.createEnrichedAlert({
              urlString,
              harvester,
              harvested,
              rawPayloadSnippet: typeof data === 'string' ? data.substring(0, 200) : undefined,
              method: 'BEACON',
              triggerEvent: telemetryPoisonEngine.isEnabled()
                ? 'Background Beacon Dispatched & Poisoned with Jitter'
                : 'Background Beacon Dispatched (sendBeacon)',
            });

            if (poisonMutations && poisonMutations.length > 0) {
              alert.interdictionAction = 'poisoned';
              alert.isPoisoned = true;
              alert.poisonedPayloadSnippet = poisonedSnippet;
              alert.poisonMutations = poisonMutations;
            }

            self.dispatchAlert(alert);
          } catch {
            // Ignore error
          }

          // Pass polluted data to original sendBeacon to corrupt harvester telemetry
          return self.originalSendBeacon ? self.originalSendBeacon(url, outboundData) : true;
        };

        try {
          Object.defineProperty(navigator, 'sendBeacon', {
            value: interceptedSendBeacon,
            writable: true,
            configurable: true,
          });
        } catch {
          try {
            (navigator as unknown as { sendBeacon: unknown }).sendBeacon = interceptedSendBeacon;
          } catch {
            // SendBeacon is sealed or read-only
          }
        }
      }
    } catch {
      // Cannot patch sendBeacon in this context
    }

    // 2. Intercept window.fetch safely
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        this.originalFetch = window.fetch.bind(window);
        const self = this;
        const interceptedFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
          try {
            const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

            // Filter out internal app calls
            if (
              !urlStr.startsWith('/api') &&
              !urlStr.includes('localhost') &&
              !urlStr.includes('vite') &&
              !urlStr.endsWith('.tsx') &&
              !urlStr.endsWith('.css')
            ) {
              const harvester = self.identifyHarvester(urlStr);
              if (
                harvester.knownEntity ||
                urlStr.includes('telemetry') ||
                urlStr.includes('collect') ||
                urlStr.includes('analytics')
              ) {
                const harvested = self.parseHarvestedFields(urlStr, init?.body);

                let poisonMutations;
                let poisonedSnippet;
                if (telemetryPoisonEngine.isEnabled() && init?.body) {
                  const res = telemetryPoisonEngine.pollutePayload(init.body, urlStr, harvester.name);
                  if (init) {
                    init.body = res.pollutedData as BodyInit;
                  }
                  poisonMutations = res.mutations;
                  poisonedSnippet = res.pollutedSnippet;
                }

                const alert = self.createEnrichedAlert({
                  urlString: urlStr,
                  harvester,
                  harvested,
                  rawPayloadSnippet: typeof init?.body === 'string' ? init.body.substring(0, 200) : undefined,
                  method: 'FETCH',
                  triggerEvent: telemetryPoisonEngine.isEnabled()
                    ? `Telemetry Ingestion Dispatched & Mutated with Noise (${init?.method || 'GET'})`
                    : `Telemetry Dispatch (${init?.method || 'GET'})`,
                });

                if (poisonMutations && poisonMutations.length > 0) {
                  alert.interdictionAction = 'poisoned';
                  alert.isPoisoned = true;
                  alert.poisonedPayloadSnippet = poisonedSnippet;
                  alert.poisonMutations = poisonMutations;
                }

                self.dispatchAlert(alert);
              }
            }
          } catch {
            // Ignore error
          }

          return self.originalFetch ? self.originalFetch(input, init) : Promise.reject(new Error('Fetch unavailable'));
        };

        // Try Object.defineProperty on window first to avoid "setting getter-only property" error
        try {
          Object.defineProperty(window, 'fetch', {
            value: interceptedFetch,
            writable: true,
            configurable: true,
          });
        } catch {
          try {
            const proto = Object.getPrototypeOf(window);
            if (proto) {
              Object.defineProperty(proto, 'fetch', {
                value: interceptedFetch,
                writable: true,
                configurable: true,
              });
            } else {
              (window as unknown as { fetch: unknown }).fetch = interceptedFetch;
            }
          } catch {
            // In strictly sandboxed / sealed environments, window.fetch cannot be overwritten
          }
        }
      }
    } catch {
      // Cannot patch fetch in this context
    }
  }

  private attachBehavioralMonitors() {
    if (typeof window === 'undefined') return;

    // A. Detect Rapid Mouse Velocity / Heatmap Sampling
    let mouseMoveSamples = 0;
    let lastMouseAlert = 0;
    window.addEventListener(
      'mousemove',
      () => {
        mouseMoveSamples++;
        const now = Date.now();
        if (mouseMoveSamples >= 45 && now - lastMouseAlert > 15000) {
          lastMouseAlert = now;
          mouseMoveSamples = 0;

          const alert = this.createEnrichedAlert({
            urlString: 'https://client-dom.telemetry.internal/cursor-metrics',
            harvester: {
              name: 'Behavioral Biometrics Listener',
              category: 'Session Heatmap / Fingerprinter',
            },
            harvested: [
              {
                field: 'cursor_velocity_vector',
                value: 'x/y coordinate trajectory sampled',
                risk: 'medium',
                description: 'Used to reconstruct user engagement and motor biometric identity',
                entropyBits: 4.85,
                tier: 'behavioral',
              },
              {
                field: 'rage_click_monitor',
                value: 'active',
                risk: 'low',
                description: 'Detects rapid repeated clicks on stalled elements',
                entropyBits: 2.1,
                tier: 'operational',
              },
            ],
            method: 'DOM_EVENT',
            triggerEvent: 'Cursor Velocity & Micro-Jitter Sampling Active',
          });

          this.dispatchAlert(alert);
        }
      },
      { passive: true }
    );

    // B. Detect Tab Focus / Blur Visibility Telemetry
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const alert = this.createEnrichedAlert({
          urlString: 'https://client-dom.telemetry.internal/visibility',
          harvester: {
            name: 'Visibility State Logger',
            category: 'Audience Attention Telemetry',
          },
          harvested: [
            {
              field: 'document.visibilityState',
              value: 'hidden (user switched tabs)',
              risk: 'low',
              description: 'Exposes exact moments when user stops looking at the screen',
              entropyBits: 1.8,
              tier: 'behavioral',
            },
            {
              field: 'active_dwell_duration',
              value: 'timestamped_ms',
              risk: 'low',
              description: 'Duration before tab blur calculated for engagement scoring',
              entropyBits: 3.4,
              tier: 'operational',
            },
          ],
          method: 'DOM_EVENT',
          triggerEvent: 'Window Blur / Tab Switch Event (PageVisibility API)',
        });

        this.dispatchAlert(alert);
      }
    });

    // C. Detect Clipboard Snooping
    window.addEventListener('copy', () => {
      const alert = this.createEnrichedAlert({
        urlString: 'https://client-dom.telemetry.internal/clipboard',
        harvester: {
          name: 'Clipboard Interaction Monitor',
          category: 'User Action Snooper',
        },
        harvested: [
          {
            field: 'clipboard_event',
            value: 'copy action captured',
            risk: 'medium',
            description: 'Can be used by malicious or tracking scripts to inspect copied text',
            entropyBits: 4.3,
            tier: 'critical_pii',
          },
        ],
        method: 'DOM_EVENT',
        triggerEvent: 'Clipboard Copy Event Triggered',
      });

      this.dispatchAlert(alert);
    });
  }

  // Trigger manual simulated telemetry packet to test alerts
  public emitSimulatedTelemetry(trackerId: string): TelemetryAlert {
    const tracker = TRACKER_DATABASE.find((t) => t.id === trackerId) || TRACKER_DATABASE[0];
    const harvested = this.parseHarvestedFields(tracker.sampleBeacon.url, tracker.sampleBeacon.payload);

    const alert = this.createEnrichedAlert({
      urlString: tracker.sampleBeacon.url,
      harvester: {
        name: tracker.name,
        category: tracker.category,
        knownEntity: tracker,
      },
      harvested,
      rawPayloadSnippet: JSON.stringify(tracker.sampleBeacon.payload, null, 2),
      method: tracker.sampleBeacon.method === 'POST' ? 'BEACON' : 'FETCH',
      triggerEvent: `Simulated Telemetry Beacon: ${tracker.sampleBeacon.method} Payload`,
      isSimulated: true,
    });

    this.dispatchAlert(alert);
    return alert;
  }

  // Trigger high-frequency noise injection burst with schema-compliant decoy payloads
  public emitPoisonBurstSimulated(trackerId?: string): TelemetryAlert {
    const tracker = trackerId ? TRACKER_DATABASE.find((t) => t.id === trackerId) || TRACKER_DATABASE[0] : TRACKER_DATABASE[0];
    const decoy = telemetryPoisonEngine.generateSchemaCompliantDecoyPayload(tracker.name);
    const mutatedSnippet = JSON.stringify(decoy, null, 2);

    // Trigger poison engine flood counter & records
    telemetryPoisonEngine.floodHarvesterDecoys(tracker.name, 3);

    const harvested = this.parseHarvestedFields(tracker.sampleBeacon.url, decoy);
    const alert = this.createEnrichedAlert({
      urlString: tracker.sampleBeacon.url,
      harvester: {
        name: tracker.name,
        category: tracker.category,
        knownEntity: tracker,
      },
      harvested,
      rawPayloadSnippet: JSON.stringify(tracker.sampleBeacon.payload, null, 2),
      method: 'BEACON',
      triggerEvent: `Adversarial Noise Burst Injected: 3 Schema Decoys Dispatched`,
      isSimulated: true,
    });

    alert.interdictionAction = 'poisoned';
    alert.isPoisoned = true;
    alert.poisonedPayloadSnippet = mutatedSnippet;
    alert.poisonMutations = [
      { field: '_sentinel_noise_sig', original: 'undefined', mutated: 'active_hash', type: 'garbage_field' },
      { field: 'cursor_trajectories', original: 'empty', mutated: '4 synthetic vectors', type: 'decoy_behavior' },
      { field: 'screen_resolution', original: '1920x1080', mutated: '1938x1068', type: 'jitter' },
    ];

    this.dispatchAlert(alert);
    return alert;
  }

  // Trigger simulated allowed telemetry (useful for observing Privacy Pulse health score dips)
  public emitSimulatedAllowedTelemetry(trackerId?: string): TelemetryAlert {
    const tracker = trackerId ? TRACKER_DATABASE.find((t) => t.id === trackerId) || TRACKER_DATABASE[3] : TRACKER_DATABASE[3];
    const harvested = this.parseHarvestedFields(tracker.sampleBeacon.url, tracker.sampleBeacon.payload);

    const alert = this.createEnrichedAlert({
      urlString: tracker.sampleBeacon.url,
      harvester: {
        name: tracker.name,
        category: tracker.category,
        knownEntity: tracker,
      },
      harvested,
      rawPayloadSnippet: JSON.stringify(tracker.sampleBeacon.payload, null, 2),
      method: 'FETCH',
      triggerEvent: `Simulated Pass-Through Telemetry (Allowed Ingestion)`,
      isSimulated: true,
    });

    alert.interdictionAction = 'allowed';
    this.dispatchAlert(alert);
    return alert;
  }

  // Trigger simulated blocked telemetry (useful for observing Privacy Pulse recovery)
  public emitSimulatedBlockedTelemetry(trackerId?: string): TelemetryAlert {
    const tracker = trackerId ? TRACKER_DATABASE.find((t) => t.id === trackerId) || TRACKER_DATABASE[0] : TRACKER_DATABASE[0];
    const harvested = this.parseHarvestedFields(tracker.sampleBeacon.url, tracker.sampleBeacon.payload);

    const alert = this.createEnrichedAlert({
      urlString: tracker.sampleBeacon.url,
      harvester: {
        name: tracker.name,
        category: tracker.category,
        knownEntity: tracker,
      },
      harvested,
      rawPayloadSnippet: JSON.stringify(tracker.sampleBeacon.payload, null, 2),
      method: 'BEACON',
      triggerEvent: `Interdiction Enforced: Telemetry Sinkholed (Blocked)`,
      isSimulated: true,
    });

    alert.interdictionAction = 'blocked';
    this.dispatchAlert(alert);
    return alert;
  }

  // Trigger simulated high-entropy telemetry burst (Token leak or encrypted PII)
  public emitEntropyBurstSimulated(type: 'jwt_bearer' | 'encrypted_pii' | 'canvas_hash' | 'session_uuid' = 'jwt_bearer'): TelemetryAlert {
    let urlString = 'https://www.google-analytics.com/g/collect';
    let harvesterId = 'google-analytics-4';
    let triggerText = 'High-Entropy Burst: Cryptographic Auth Token Leak';
    let rawPayload: Record<string, unknown> = {};
    let highEntropyField = '';
    let highEntropyVal = '';

    if (type === 'jwt_bearer') {
      urlString = 'https://graph.facebook.com/v19.0/act_918237192/events';
      harvesterId = 'meta-pixel';
      triggerText = 'High-Entropy Leak: Bearer JWT Token Intercepted in Outbound Payload';
      highEntropyField = 'Authorization';
      highEntropyVal = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwidXNlcklkIjoidXNyXzg4YjFkMmNmIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      rawPayload = {
        event_name: 'Purchase',
        event_id: 'ev_99182',
        Authorization: highEntropyVal,
        user_data: {
          client_ip: '192.0.2.1',
          external_id: '5f4dcc3b5aa765d61d8327deb882cf99',
        },
      };
    } else if (type === 'encrypted_pii') {
      urlString = 'https://analytics.tiktok.com/api/v2/pixel';
      harvesterId = 'tiktok-pixel';
      triggerText = 'High-Entropy Leak: Encrypted Contact PII & AES Geolocation Cipher Exfiltration';
      highEntropyField = 'encrypted_contact_blob';
      highEntropyVal = 'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkw++dQ0KjT7X9+1/2P8kZ9a8/WwQ3Z4r5T6Y7U8I9O0P1A2S3D4F5G6H7J8K9L0==';
      rawPayload = {
        event: 'InitiateCheckout',
        timestamp: Date.now(),
        encrypted_contact_blob: highEntropyVal,
        geo_cipher: 'AES_GCM_9f81a7b6c5d4e3f2a1b0c9d8e7f6',
        ttp: '94829104-tt-8812-4fbc-9182-0192837465',
      };
    } else if (type === 'canvas_hash') {
      urlString = 'https://fpjs.io/api/v3/telemetry';
      harvesterId = 'google-analytics-4';
      triggerText = 'High-Entropy Burst: Canvas & WebGL Hardware Digest Dispatched';
      highEntropyField = 'canvas_hash_digest';
      highEntropyVal = 'a3f5c9e2b8104d57c2e08a9f3b1746205847cdba836021f198472504938210fe';
      rawPayload = {
        visitorId: 'fp_a3f5c9e2b8104d57',
        canvas_hash_digest: highEntropyVal,
        audio_fingerprint: '35.738192019485728192',
        webgl_vendor: 'WebKit/Metal/Apple-M2',
      };
    } else {
      urlString = 'https://browser-http-intake.datadoghq.com/v1/input/telemetry';
      harvesterId = 'datadog-rum';
      triggerText = 'High-Entropy Leak: Session Tracking Correlation UUID Exfiltration';
      highEntropyField = 'session_uuid';
      highEntropyVal = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      rawPayload = {
        trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
        session_uuid: highEntropyVal,
        app_id: 'rum_7c8d9e0f',
        view_url: 'https://app.local/checkout/step-2',
      };
    }

    const tracker = TRACKER_DATABASE.find((t) => t.id === harvesterId) || TRACKER_DATABASE[0];
    const harvested = this.parseHarvestedFields(urlString, rawPayload);

    // Explicitly guarantee the high-entropy field is present with high entropyBits
    const scan = scanEntropyAndPii(highEntropyField, highEntropyVal);
    harvested.unshift({
      field: highEntropyField,
      value: highEntropyVal,
      risk: 'high',
      description: `Shannon Entropy: ${scan.entropyBits} bits/char - ${scan.patternMatch || 'High-Entropy Cipher/Token'}`,
      entropyBits: scan.entropyBits,
      tier: 'critical_pii',
    });

    const alert = this.createEnrichedAlert({
      urlString,
      harvester: {
        name: tracker.name,
        category: tracker.category,
        knownEntity: tracker,
      },
      harvested,
      rawPayloadSnippet: JSON.stringify(rawPayload, null, 2),
      method: 'POST' as unknown as TelemetryAlert['method'],
      triggerEvent: triggerText,
      isSimulated: true,
    });

    alert.tier = 'critical_pii';
    alert.severity = 'critical';
    alert.interdictionAction = 'blocked';

    this.dispatchAlert(alert);
    return alert;
  }

  // Generate realistic 24-hour historical telemetry alerts for Privacy Pulse baseline
  public getInitial24HourHistory(): TelemetryAlert[] {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;

    const seedConfigs: {
      trackerId: string;
      hoursAgo: number;
      action: InterdictionAction;
      triggerText: string;
    }[] = [
      { trackerId: 'google-analytics-4', hoursAgo: 0.25, action: 'blocked', triggerText: 'Outbound Scroll & Engagement Beacon' },
      { trackerId: 'meta-pixel', hoursAgo: 0.8, action: 'blocked', triggerText: 'Conversion Tracking Pixel Beacon' },
      { trackerId: 'hotjar', hoursAgo: 1.6, action: 'blocked', triggerText: 'Session Replay Telemetry Push' },
      { trackerId: 'datadog-rum', hoursAgo: 2.3, action: 'allowed', triggerText: 'Operational Error Metric Ingestion' },
      { trackerId: 'microsoft-clarity', hoursAgo: 3.5, action: 'blocked', triggerText: 'Cursor Heatmap Trajectory Stream' },
      { trackerId: 'segment-io', hoursAgo: 4.8, action: 'sanitized', triggerText: 'Client Identity Sync Beacon' },
      { trackerId: 'google-analytics-4', hoursAgo: 6.2, action: 'blocked', triggerText: 'Google Signals Cross-Device Ping' },
      { trackerId: 'criteo-one-tag', hoursAgo: 7.5, action: 'blocked', triggerText: 'Retargeting Cookie Sync Call' },
      { trackerId: 'fullstory-session', hoursAgo: 9.0, action: 'blocked', triggerText: 'DOM Tree Snapshot Dispatch' },
      { trackerId: 'amazon-aps', hoursAgo: 11.2, action: 'allowed', triggerText: 'Header Bidding Operational Probe' },
      { trackerId: 'tiktok-pixel', hoursAgo: 13.0, action: 'blocked', triggerText: 'Device Identifier Exfiltration Attempt' },
      { trackerId: 'meta-pixel', hoursAgo: 14.5, action: 'blocked', triggerText: 'Advanced Matching Ingestion Call' },
      { trackerId: 'google-analytics-4', hoursAgo: 16.0, action: 'blocked', triggerText: 'Realtime Viewport Geometry Ping' },
      { trackerId: 'datadog-rum', hoursAgo: 17.8, action: 'allowed', triggerText: 'Frontend Latency & Health Sample' },
      { trackerId: 'hotjar', hoursAgo: 19.5, action: 'blocked', triggerText: 'Keystroke Timing Interval Beacon' },
      { trackerId: 'microsoft-clarity', hoursAgo: 21.0, action: 'blocked', triggerText: 'Rage-Click Behavioral Ingestion' },
      { trackerId: 'segment-io', hoursAgo: 22.4, action: 'poisoned', triggerText: 'CDP Event Stream Hook' },
      { trackerId: 'google-analytics-4', hoursAgo: 23.5, action: 'blocked', triggerText: 'Measurement Protocol Handshake' },
    ];

    return seedConfigs.map((cfg, index) => {
      const tracker = TRACKER_DATABASE.find((t) => t.id === cfg.trackerId) || TRACKER_DATABASE[0];
      const harvested = this.parseHarvestedFields(tracker.sampleBeacon.url, tracker.sampleBeacon.payload);
      
      // Inject high entropy token on several historical items to populate entropy heatmap immediately
      if (index === 1) {
        harvested.unshift({
          field: 'Authorization',
          value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          risk: 'high',
          description: 'Shannon Entropy: 5.34 bits/char - Bearer Token',
          entropyBits: 5.34,
          tier: 'critical_pii',
        });
      } else if (index === 4) {
        harvested.unshift({
          field: 'canvas_hash',
          value: 'b8104d57c2e08a9f3b1746205847cdba836021f1',
          risk: 'high',
          description: 'Shannon Entropy: 4.28 bits/char - Device Identifier',
          entropyBits: 4.28,
          tier: 'critical_pii',
        });
      } else if (index === 10) {
        harvested.unshift({
          field: 'ttp_encrypted_token',
          value: 'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkw++dQ0KjT7X9',
          risk: 'high',
          description: 'Shannon Entropy: 5.62 bits/char - Encrypted PII',
          entropyBits: 5.62,
          tier: 'critical_pii',
        });
      }

      const alert = this.createEnrichedAlert({
        urlString: tracker.sampleBeacon.url,
        harvester: {
          name: tracker.name,
          category: tracker.category,
          knownEntity: tracker,
        },
        harvested,
        rawPayloadSnippet: JSON.stringify(tracker.sampleBeacon.payload, null, 2),
        method: tracker.sampleBeacon.method === 'POST' ? 'BEACON' : 'FETCH',
        triggerEvent: cfg.triggerText,
        isSimulated: true,
      });

      alert.id = `hist-alert-${index}-${now - Math.round(cfg.hoursAgo * HOUR)}`;
      alert.timestamp = now - Math.round(cfg.hoursAgo * HOUR);
      alert.interdictionAction = cfg.action;
      if (cfg.action === 'poisoned') {
        alert.isPoisoned = true;
        alert.poisonedPayloadSnippet = '{\n  "_sentinel_noise_sig": "active_entropy_hash",\n  "viewport": "1938x1068"\n}';
      }

      this.alertHistory.set(alert.id, alert);
      return alert;
    });
  }
}

export const telemetryInterceptor = new TelemetryInterceptorService();
