import { BrowserProbeResult } from '../types';

export function runLiveBrowserTelemetryProbe(): Promise<BrowserProbeResult> {
  return new Promise((resolve) => {
    // 1. Screen Telemetry
    const screenData = {
      resolution: `${window.screen.width} x ${window.screen.height}`,
      availResolution: `${window.screen.availWidth} x ${window.screen.availHeight}`,
      colorDepth: window.screen.colorDepth || 24,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: window.screen.orientation ? window.screen.orientation.type : 'landscape-primary',
    };

    // 2. Hardware Telemetry & WebGL Unmasked Info
    let gpuVendor = 'Unknown';
    let gpuRenderer = 'Generic Hardware Accelerator';
    let webglHash = 'none';

    try {
      const canvas = document.createElement('canvas');
      const gl =
        (canvas.getContext('webgl') as WebGLRenderingContext) ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext);
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
          gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Generic GPU';
        }
        webglHash = simpleHash(`${gpuVendor}_${gpuRenderer}_${gl.getParameter(gl.VERSION)}`);
      }
    } catch {
      // Sandboxed or blocked
    }

    const nav = window.navigator as Navigator & { deviceMemory?: number };
    const hardware = {
      cpuCores: nav.hardwareConcurrency || 4,
      deviceMemoryGb: nav.deviceMemory || null,
      touchPoints: nav.maxTouchPoints || 0,
      gpuVendor,
      gpuRenderer,
    };

    // 3. Canvas 2D Fingerprinting
    let canvasHash = 'unknown';
    let canvasDataUri = '';
    try {
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 60;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial', sans-serif";
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('TelemetrySentinel! <canvas> 1.0', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('TelemetrySentinel! <canvas> 1.0', 4, 17);

        canvasDataUri = c.toDataURL();
        canvasHash = simpleHash(canvasDataUri);
      }
    } catch {
      canvasHash = 'blocked_by_guard';
    }

    // 4. AudioContext Fingerprinting
    let audioContextHash = 'audio_fingerprint_unsupported';
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const offlineCtx = new OfflineAudioContext(1, 44100, 44100);
        const oscillator = offlineCtx.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(10000, offlineCtx.currentTime);

        const compressor = offlineCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-50, offlineCtx.currentTime);
        compressor.knee.setValueAtTime(40, offlineCtx.currentTime);
        compressor.ratio.setValueAtTime(12, offlineCtx.currentTime);
        compressor.attack.setValueAtTime(0, offlineCtx.currentTime);
        compressor.release.setValueAtTime(0.25, offlineCtx.currentTime);

        oscillator.connect(compressor);
        compressor.connect(offlineCtx.destination);
        oscillator.start(0);

        offlineCtx.startRendering().then((renderedBuffer) => {
          const channelData = renderedBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 4500; i < 5000; i++) {
            sum += Math.abs(channelData[i]);
          }
          audioContextHash = simpleHash(sum.toString());
          finishProbe(audioContextHash);
        }).catch(() => {
          finishProbe('audio_context_denied');
        });
        return; // Asynchronous resolution via finishProbe
      }
    } catch {
      audioContextHash = 'audio_context_error';
    }

    finishProbe(audioContextHash);

    function finishProbe(audioHash: string) {
      // 5. Network & Locale
      let tz = 'UTC';
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch {
        // Fallback
      }

      const networkLocale = {
        timezone: tz,
        timezoneOffset: new Date().getTimezoneOffset(),
        languages: Array.from(nav.languages || [nav.language || 'en-US']),
        cookiesEnabled: nav.cookieEnabled,
        doNotTrack: nav.doNotTrack || (window as unknown as { doNotTrack?: string }).doNotTrack || null,
        connectionType: (nav as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType,
      };

      // 6. Storage Telemetry
      let localStorageKeys = 0;
      let sessionStorageKeys = 0;
      try {
        localStorageKeys = window.localStorage ? window.localStorage.length : 0;
        sessionStorageKeys = window.sessionStorage ? window.sessionStorage.length : 0;
      } catch {
        // Restricted in certain iframes
      }

      const storageTelemetry = {
        localStorageKeys,
        sessionStorageKeys,
        indexedDbSupported: typeof window.indexedDB !== 'undefined',
      };

      // Calculate harvestability / uniqueness score
      // Points for each identifiable telemetry vector exposed
      let points = 20; // baseline
      if (gpuRenderer !== 'Generic Hardware Accelerator' && gpuRenderer !== 'Unknown') points += 25;
      if (canvasHash && canvasHash !== 'blocked_by_guard') points += 20;
      if (audioHash && !audioHash.includes('error') && !audioHash.includes('denied')) points += 15;
      if (hardware.cpuCores > 0) points += 10;
      if (screenData.colorDepth >= 24) points += 5;
      if (networkLocale.languages.length > 1) points += 5;

      const uniquenessScore = Math.min(99, points);

      const result: BrowserProbeResult = {
        screen: screenData,
        hardware,
        fingerprints: {
          canvasHash,
          canvasDataUri,
          webglVendorHash: webglHash,
          audioContextHash: audioHash,
        },
        networkLocale,
        storageTelemetry,
        uniquenessScore,
        exposedSurfacesCount: 14,
      };

      resolve(result);
    }
  });
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = (hash >>> 0).toString(16).toUpperCase();
  return `0x${hex.padStart(8, '0')}`;
}
