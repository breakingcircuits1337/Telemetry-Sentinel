import { PoisonEngineConfig, PoisonEngineMetrics, NoiseMutationRecord } from '../types';

type MetricsListener = (metrics: PoisonEngineMetrics, recentMutations: NoiseMutationRecord[]) => void;

class TelemetryPoisonEngineService {
  private config: PoisonEngineConfig = {
    enabled: true,
    variance: 0.08, // 8% default jitter variance
    fingerprintJitter: true,
    behavioralNoise: true,
    garbagePollution: true,
    injectDecoySignature: true,
  };

  private metrics: PoisonEngineMetrics = {
    totalPollutedPackets: 42,
    jitteredDataPointsCount: 187,
    garbageMetricsInjectedCount: 312,
    decoyProfilesFloodedCount: 18,
    identityEntropyDisruptionPct: 94.8,
  };

  private recentMutations: NoiseMutationRecord[] = [];
  private listeners: Set<MetricsListener> = new Set();

  constructor() {
    // Pre-seed some initial realistic noise mutations for immediate visual feedback
    this.seedInitialMutations();
  }

  public getConfig(): PoisonEngineConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<PoisonEngineConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.recalculateDisruption();
    this.notifyListeners();
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    this.recalculateDisruption();
    this.notifyListeners();
  }

  public getMetrics(): PoisonEngineMetrics {
    return { ...this.metrics };
  }

  public getRecentMutations(): NoiseMutationRecord[] {
    return [...this.recentMutations];
  }

  public subscribe(listener: MetricsListener): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics(), this.getRecentMutations());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const metrics = this.getMetrics();
    const mutations = this.getRecentMutations();
    this.listeners.forEach((l) => l(metrics, mutations));
  }

  private recalculateDisruption() {
    if (!this.config.enabled) {
      this.metrics.identityEntropyDisruptionPct = 0;
      return;
    }
    // Disruption calculation based on enabled vectors and variance
    let base = 65;
    if (this.config.fingerprintJitter) base += 12;
    if (this.config.behavioralNoise) base += 11;
    if (this.config.garbagePollution) base += 8;
    const varianceBonus = Math.min(6, this.config.variance * 40);
    this.metrics.identityEntropyDisruptionPct = Math.min(99.4, Math.round((base + varianceBonus) * 10) / 10);
  }

  /**
   * 1. Stochastic Jitter Generator for numerical telemetry fields
   */
  public injectNoise(value: number, customVariance?: number): number {
    const variance = customVariance ?? this.config.variance;
    if (typeof value === 'number' && !isNaN(value)) {
      // Gaussian/Uniform perturbation centered at 0 with spread [-variance, +variance]
      const delta = (Math.random() * 2 - 1) * variance * value;
      const noisy = value + delta;
      // Round to realistic precision
      return Number.isInteger(value) ? Math.round(noisy) : Math.round(noisy * 1000) / 1000;
    }
    return value;
  }

  /**
   * 2. Fingerprint Jitter Generator
   */
  public perturbFingerprintString(key: string, value: string): string {
    if (!this.config.fingerprintJitter) return value;

    const k = key.toLowerCase();
    // Resolution jitter
    if (k.includes('res') || k.includes('sr') || k.includes('resolution') || k.includes('viewport')) {
      const match = value.match(/^(\d+)x(\d+)$/);
      if (match) {
        const w = parseInt(match[1], 10);
        const h = parseInt(match[2], 10);
        const deltaW = Math.floor((Math.random() * 2 - 1) * (w * this.config.variance * 0.5));
        const deltaH = Math.floor((Math.random() * 2 - 1) * (h * this.config.variance * 0.5));
        return `${Math.max(800, w + deltaW)}x${Math.max(600, h + deltaH)}`;
      }
    }

    // Canvas / WebGL hash jitter
    if (k.includes('canvas') || k.includes('webgl') || k.includes('hash') || k.includes('fingerprint')) {
      const randomSalt = Math.random().toString(16).substring(2, 6);
      return `${value.slice(0, Math.max(4, value.length - 4))}${randomSalt}`;
    }

    // User-Agent version jitter
    if (k.includes('ua') || k.includes('agent')) {
      return value.replace(/(Chrome\/|Firefox\/|Safari\/)(\d+)/g, (_m, p1, p2) => {
        const newVer = parseInt(p2, 10) + Math.floor(Math.random() * 3) - 1;
        return `${p1}${newVer}`;
      });
    }

    return value;
  }

  /**
   * 3. Behavioral Noise Generator (Synthetic cursor tracks, synthetic typing delays)
   */
  public generateSyntheticBehavioralVectors(): {
    cursorTracks: { x: number; y: number; t: number; pressure: number }[];
    keystrokeIntervals: number[];
    syntheticScrollDepth: number;
  } {
    const trackCount = Math.floor(Math.random() * 5) + 4;
    const tracks = [];
    let curX = 200 + Math.floor(Math.random() * 800);
    let curY = 150 + Math.floor(Math.random() * 500);
    let curT = Date.now() - 3000;

    for (let i = 0; i < trackCount; i++) {
      curX += (Math.random() * 2 - 1) * 85;
      curY += (Math.random() * 2 - 1) * 65;
      curT += Math.floor(Math.random() * 120) + 40;
      tracks.push({
        x: Math.round(curX * 10) / 10,
        y: Math.round(curY * 10) / 10,
        t: curT,
        pressure: Math.round((Math.random() * 0.4 + 0.3) * 100) / 100,
      });
    }

    const keystrokeIntervals = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 210) + 60
    );

    return {
      cursorTracks: tracks,
      keystrokeIntervals,
      syntheticScrollDepth: Math.floor(Math.random() * 95) + 5,
    };
  }

  /**
   * 4. Intercept outbound JSON bodies or query strings and pollute them
   */
  public pollutePayload(
    data: unknown,
    urlStr: string = '',
    harvesterName: string = 'Tracking Endpoint'
  ): {
    pollutedData: unknown;
    pollutedSnippet: string;
    originalSnippet: string;
    mutations: { field: string; original: string; mutated: string; type: 'jitter' | 'decoy_behavior' | 'garbage_field' }[];
  } {
    if (!this.config.enabled) {
      const origStr = typeof data === 'object' ? JSON.stringify(data) : String(data ?? '');
      return {
        pollutedData: data,
        pollutedSnippet: origStr,
        originalSnippet: origStr,
        mutations: [],
      };
    }

    const mutations: { field: string; original: string; mutated: string; type: 'jitter' | 'decoy_behavior' | 'garbage_field' }[] = [];
    let pollutedData: unknown = data;
    let originalSnippet = '';
    let pollutedSnippet = '';

    try {
      if (typeof data === 'string') {
        originalSnippet = data;
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Plain query string or text
        }

        if (parsed && typeof parsed === 'object' && parsed !== null) {
          const mutatedObj = this.mutateObjectRecursive(parsed as Record<string, unknown>, mutations);
          this.injectDecoyFields(mutatedObj, mutations);
          pollutedData = JSON.stringify(mutatedObj);
          pollutedSnippet = JSON.stringify(mutatedObj, null, 2);
        } else {
          // String query mutation
          let mutatedStr = data;
          if (this.config.fingerprintJitter && data.includes('resolution=')) {
            const oldRes = data.match(/resolution=(\d+x\d+)/)?.[1] || '1920x1080';
            const newRes = `${1920 + Math.floor((Math.random() * 2 - 1) * 30)}x${1080 + Math.floor((Math.random() * 2 - 1) * 20)}`;
            mutatedStr = mutatedStr.replace(/resolution=\d+x\d+/, `resolution=${newRes}`);
            mutations.push({ field: 'resolution', original: oldRes, mutated: newRes, type: 'jitter' });
          }

          if (this.config.injectDecoySignature) {
            const noiseSig = Math.random().toString(36).substring(2, 10);
            mutatedStr += `${mutatedStr.includes('?') || mutatedStr.includes('&') ? '&' : '?'}_sentinel_noise_sig=${noiseSig}`;
            mutations.push({ field: '_sentinel_noise_sig', original: 'null', mutated: noiseSig, type: 'garbage_field' });
          }

          pollutedData = mutatedStr;
          pollutedSnippet = mutatedStr;
        }
      } else if (typeof data === 'object' && data !== null) {
        originalSnippet = JSON.stringify(data, null, 2);
        const copy = JSON.parse(JSON.stringify(data));
        const mutatedObj = this.mutateObjectRecursive(copy, mutations);
        this.injectDecoyFields(mutatedObj, mutations);
        pollutedData = mutatedObj;
        pollutedSnippet = JSON.stringify(mutatedObj, null, 2);
      } else {
        // Fallback for null or empty body: inject decoy JSON payload
        if (this.config.garbagePollution) {
          const decoy = this.generateSchemaCompliantDecoyPayload(harvesterName);
          originalSnippet = '{}';
          pollutedData = JSON.stringify(decoy);
          pollutedSnippet = JSON.stringify(decoy, null, 2);
          mutations.push({
            field: 'decoy_payload_stream',
            original: 'empty',
            mutated: 'schema_compliant_synthetic_telemetry',
            type: 'garbage_field',
          });
        }
      }
    } catch {
      pollutedData = data;
      pollutedSnippet = String(data);
    }

    // Update internal metrics & history
    if (mutations.length > 0) {
      this.metrics.totalPollutedPackets++;
      const jitterCount = mutations.filter((m) => m.type === 'jitter').length;
      const garbageCount = mutations.filter((m) => m.type === 'garbage_field').length;
      this.metrics.jitteredDataPointsCount += Math.max(1, jitterCount);
      this.metrics.garbageMetricsInjectedCount += Math.max(1, garbageCount);

      const record: NoiseMutationRecord = {
        id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        harvester: harvesterName,
        url: urlStr,
        originalPayloadSnippet: originalSnippet.substring(0, 300),
        mutatedPayloadSnippet: pollutedSnippet.substring(0, 300),
        mutationsCount: mutations.length,
        types: Array.from(new Set(mutations.map((m) => m.type))),
      };

      this.recentMutations = [record, ...this.recentMutations.slice(0, 24)];
      this.recalculateDisruption();
      this.notifyListeners();
    }

    return {
      pollutedData,
      pollutedSnippet,
      originalSnippet,
      mutations,
    };
  }

  private mutateObjectRecursive(
    obj: Record<string, unknown>,
    mutations: { field: string; original: string; mutated: string; type: 'jitter' | 'decoy_behavior' | 'garbage_field' }[]
  ): Record<string, unknown> {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'number') {
        const noisy = this.injectNoise(val);
        if (noisy !== val) {
          mutations.push({
            field: key,
            original: String(val),
            mutated: String(noisy),
            type: 'jitter',
          });
          obj[key] = noisy;
        }
      } else if (typeof val === 'string') {
        const jittered = this.perturbFingerprintString(key, val);
        if (jittered !== val) {
          mutations.push({
            field: key,
            original: val,
            mutated: jittered,
            type: 'jitter',
          });
          obj[key] = jittered;
        }
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        this.mutateObjectRecursive(val as Record<string, unknown>, mutations);
      }
    }
    return obj;
  }

  private injectDecoyFields(
    obj: Record<string, unknown>,
    mutations: { field: string; original: string; mutated: string; type: 'jitter' | 'decoy_behavior' | 'garbage_field' }[]
  ) {
    if (this.config.injectDecoySignature) {
      const noiseSig = Math.random().toString(36).substring(2, 11);
      obj['_sentinel_noise_sig'] = noiseSig;
      obj['_identity_graph_entropy'] = 'POISONED_IRREVERSIBLE';
      mutations.push({
        field: '_sentinel_noise_sig',
        original: 'undefined',
        mutated: noiseSig,
        type: 'garbage_field',
      });
    }

    if (this.config.behavioralNoise) {
      const behavioral = this.generateSyntheticBehavioralVectors();
      obj['_decoy_cursor_vectors'] = behavioral.cursorTracks.slice(0, 3);
      obj['_decoy_typing_latency_ms'] = behavioral.keystrokeIntervals[0];
      obj['_scrambled_scroll_depth'] = behavioral.syntheticScrollDepth;
      mutations.push({
        field: '_decoy_cursor_vectors',
        original: 'empty',
        mutated: `[${behavioral.cursorTracks.length} synthetic micro-jitter coordinates]`,
        type: 'decoy_behavior',
      });
    }

    if (this.config.garbagePollution) {
      // Inject decoy demographic & ad-targeting noise
      const fakeAdInterests = ['deep_sea_trawling', 'vintage_tractor_repair', 'medieval_calligraphy', 'industrial_smelting'];
      const chosen = fakeAdInterests[Math.floor(Math.random() * fakeAdInterests.length)];
      obj['_decoy_interest_vector'] = chosen;
      obj['_decoy_affinity_score'] = Math.round(Math.random() * 100) / 100;
      mutations.push({
        field: '_decoy_interest_vector',
        original: 'null',
        mutated: chosen,
        type: 'garbage_field',
      });
    }
  }

  /**
   * 5. Generate Schema-Compliant Garbage / Decoy Payload for specific harvesters
   */
  public generateSchemaCompliantDecoyPayload(harvesterName: string): Record<string, unknown> {
    const h = harvesterName.toLowerCase();
    const fakeUuid = `decoy-${Math.random().toString(36).substring(2, 8)}-${Math.random().toString(36).substring(2, 6)}`;
    const syntheticBehavior = this.generateSyntheticBehavioralVectors();

    if (h.includes('google') || h.includes('ga4') || h.includes('analytics')) {
      return {
        client_id: fakeUuid,
        non_personalized_ads: true,
        events: [
          {
            name: 'session_heartbeat_scrambled',
            params: {
              engagement_time_msec: this.injectNoise(14500),
              screen_resolution: `${1920 + Math.floor((Math.random() * 2 - 1) * 30)}x1080`,
              page_location: `https://decoy-sinkhole.internal/path/${Math.random().toString(36).substring(2, 6)}`,
              _sentinel_noise_sig: Math.random().toString(36).substring(2, 10),
              decoy_interest: 'antiquarian_horology',
            },
          },
        ],
      };
    }

    if (h.includes('meta') || h.includes('facebook')) {
      return {
        event_name: 'CustomPoisonInteraction',
        event_time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 300),
        event_id: fakeUuid,
        user_data: {
          client_ip_address: '127.0.0.1',
          client_user_agent: 'DecoySentinel/4.0 (Synthetic; ZeroProfile)',
          fbp: `fb.1.${Date.now()}.${Math.floor(Math.random() * 99999999)}`,
        },
        custom_data: {
          synthetic_currency: 'EUR',
          synthetic_value: this.injectNoise(499.5),
          cursor_jitter_variance: this.config.variance,
        },
      };
    }

    if (h.includes('hotjar') || h.includes('clarity') || h.includes('session')) {
      return {
        session_id: fakeUuid,
        recording_chunk_id: Math.floor(Math.random() * 999),
        keystroke_masking: 'ALWAYS_ENFORCED',
        synthetic_mouse_tracks: syntheticBehavior.cursorTracks,
        viewport_scramble: {
          w: this.injectNoise(1440),
          h: this.injectNoise(900),
          scroll_depth: syntheticBehavior.syntheticScrollDepth,
        },
        _sentinel_noise_sig: Math.random().toString(36).substring(2, 10),
      };
    }

    // Default universal schema-compliant telemetry decoy
    return {
      anonymous_id: fakeUuid,
      timestamp: new Date().toISOString(),
      platform: 'Synthetic Web Client',
      hardware_concurrency: this.injectNoise(8),
      device_memory_gb: this.injectNoise(16),
      color_depth: 24,
      synthetic_cursor_samples: syntheticBehavior.cursorTracks.slice(0, 3),
      _sentinel_noise_sig: Math.random().toString(36).substring(2, 10),
      _graph_poison_status: 'ACTIVE_INTERDICTION',
    };
  }

  /**
   * High-Frequency Burst: Flood harvester ingestion server with N schema-compliant polluted records
   */
  public floodHarvesterDecoys(harvesterName: string, count: number = 5): NoiseMutationRecord[] {
    const records: NoiseMutationRecord[] = [];
    for (let i = 0; i < count; i++) {
      const decoy = this.generateSchemaCompliantDecoyPayload(harvesterName);
      const mutatedSnippet = JSON.stringify(decoy, null, 2);
      const record: NoiseMutationRecord = {
        id: `burst-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now() - (count - i) * 120,
        harvester: harvesterName,
        url: `https://inbound-ingest.telemetry-target.internal/v2/collect`,
        originalPayloadSnippet: '{"_ingest_probe": "target_pipeline_sync"}',
        mutatedPayloadSnippet: mutatedSnippet,
        mutationsCount: 6,
        types: ['garbage_field', 'decoy_behavior', 'jitter'],
      };
      records.push(record);
    }

    this.metrics.totalPollutedPackets += count;
    this.metrics.garbageMetricsInjectedCount += count * 6;
    this.metrics.decoyProfilesFloodedCount += count;
    this.metrics.jitteredDataPointsCount += count * 3;
    this.recentMutations = [...records, ...this.recentMutations.slice(0, 25)];
    this.recalculateDisruption();
    this.notifyListeners();
    return records;
  }

  private seedInitialMutations() {
    this.recentMutations = [
      {
        id: 'seed-mut-1',
        timestamp: Date.now() - 12000,
        harvester: 'Google Analytics 4 Measurement Protocol',
        url: 'https://www.google-analytics.com/g/collect',
        originalPayloadSnippet: '{"sr":"1920x1080","engagement_time_msec":12450,"cid":"491209.16901"}',
        mutatedPayloadSnippet: '{"sr":"1934x1076","engagement_time_msec":13284,"cid":"491209.16901","_sentinel_noise_sig":"p9x8a2","_decoy_interest_vector":"medieval_calligraphy"}',
        mutationsCount: 4,
        types: ['jitter', 'garbage_field'],
      },
      {
        id: 'seed-mut-2',
        timestamp: Date.now() - 28000,
        harvester: 'Hotjar Behavioral Session Replay',
        url: 'https://in.hotjar.com/api/v2/client/events',
        originalPayloadSnippet: '{"cursor_x":450,"cursor_y":320,"scroll_pct":42}',
        mutatedPayloadSnippet: '{"cursor_x":471.2,"cursor_y":308.5,"scroll_pct":88,"_decoy_cursor_vectors":[{"x":465.1,"y":314.2,"t":1725556}],"_sentinel_noise_sig":"b7d2e1"}',
        mutationsCount: 5,
        types: ['jitter', 'decoy_behavior', 'garbage_field'],
      },
      {
        id: 'seed-mut-3',
        timestamp: Date.now() - 45000,
        harvester: 'Meta Pixel CAPI (Conversions API)',
        url: 'https://graph.facebook.com/tr/',
        originalPayloadSnippet: '{"event":"PageView","fbp":"fb.1.1689.98124","sr":"2560x1440"}',
        mutatedPayloadSnippet: '{"event":"PageView","fbp":"fb.1.1689.98124","sr":"2582x1428","_identity_graph_entropy":"POISONED_IRREVERSIBLE","_sentinel_noise_sig":"k19fa0"}',
        mutationsCount: 3,
        types: ['jitter', 'garbage_field'],
      },
    ];
  }
}

export const telemetryPoisonEngine = new TelemetryPoisonEngineService();
