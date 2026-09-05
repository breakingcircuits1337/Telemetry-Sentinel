import { TrackerEntity, TelemetryCategory } from '../types';

export const TRACKER_DATABASE: TrackerEntity[] = [
  {
    id: 'google-analytics-4',
    name: 'Google Analytics 4 & Signals',
    company: 'Google LLC',
    parentCompany: 'Alphabet Inc.',
    category: 'AdTech & Profiling',
    riskScore: 84,
    harvestedDataTypes: [
      'hardware_fingerprint',
      'network_location',
      'behavioral_biometrics',
      'browsing_history',
      'cross_site_identity',
    ],
    knownDomains: [
      'google-analytics.com',
      'analytics.google.com',
      'stats.g.doubleclick.net',
      'googletagmanager.com',
    ],
    trackingTechniques: [
      'Client ID cookie syncing',
      'Google Account cross-device linking (Signals)',
      'Viewport & screen geometry logging',
      'Scroll depth & outbound link beacons',
      'IP masking with approximate geolocation parsing',
    ],
    description:
      'Harvests real-time interaction events, session duration, referral sources, and cross-device digital fingerprints linked to Google ad profiles.',
    jurisdiction: 'United States',
    optOutUrl: 'https://tools.google.com/dlpage/gaoptout',
    blockRule: '||google-analytics.com^$third-party',
    sampleBeacon: {
      url: 'https://www.google-analytics.com/g/collect?v=2&tid=G-9X7Z8WQ0L&cid=1498201948.1714829102',
      method: 'POST',
      payload: {
        v: '2',
        tid: 'G-9X7Z8WQ0L',
        cid: '1498201948.1714829102',
        en: 'user_engagement',
        _et: '4820',
        epn_scroll_depth: 85,
        ul: 'en-us',
        sr: '1920x1080',
        vp: '1440x820',
        _p: '192830192',
      },
    },
  },
  {
    id: 'meta-pixel',
    name: 'Meta Pixel & Conversions API',
    company: 'Meta Platforms, Inc.',
    parentCompany: 'Meta Platforms, Inc.',
    category: 'AdTech & Profiling',
    riskScore: 95,
    harvestedDataTypes: [
      'hardware_fingerprint',
      'browsing_history',
      'cross_site_identity',
      'financial_commercial',
      'network_location',
    ],
    knownDomains: ['connect.facebook.net', 'facebook.com/tr', 'graph.facebook.com'],
    trackingTechniques: [
      'Advanced Matching (hashed email/phone)',
      'Third-party cookie stitching (_fbp, _fbc)',
      'Button click & DOM form field sniffing',
      'Cross-site graph matching across Instagram & Facebook',
    ],
    description:
      'Tracks specific page visits, purchases, cart additions, and matches encrypted user identifiers against billions of Meta social graph accounts.',
    jurisdiction: 'United States',
    optOutUrl: 'https://www.facebook.com/adpreferences/ad_settings',
    blockRule: '||connect.facebook.net^$third-party',
    sampleBeacon: {
      url: 'https://www.facebook.com/tr/?id=849201948291029&ev=SubscribedButtonClick',
      method: 'POST',
      payload: {
        id: '849201948291029',
        ev: 'SubscribedButtonClick',
        dl: 'https://example-shop.com/checkout',
        rl: 'https://example-shop.com/cart',
        cd: { buttonText: 'Complete Order', value: 129.99, currency: 'USD' },
        ud: { em: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
        ts: Date.now(),
      },
    },
  },
  {
    id: 'hotjar-replay',
    name: 'Hotjar Behavioral & Session Replay',
    company: 'Hotjar Ltd.',
    parentCompany: 'Contentsquare SAS',
    category: 'Session Replay',
    riskScore: 92,
    harvestedDataTypes: [
      'behavioral_biometrics',
      'keystroke_recorder',
      'hardware_fingerprint',
      'browsing_history',
    ],
    knownDomains: ['static.hotjar.com', 'script.hotjar.com', 'in.hotjar.com'],
    trackingTechniques: [
      'Continuous mouse position & cursor velocity sampling',
      'DOM mutation tree streaming',
      'Keystroke flight-time & dwell recording (may leak unmasked form data)',
      'Scroll heatmaps & rage-click detection',
    ],
    description:
      'Records high-fidelity video-like replays of exact user interactions, cursor jitters, typing rhythms, and page navigation.',
    jurisdiction: 'Malta / European Union',
    optOutUrl: 'https://www.hotjar.com/legal/compliance/opt-out/',
    blockRule: '||hotjar.com^$third-party',
    sampleBeacon: {
      url: 'https://in.hotjar.com/api/v2/client/sites/3029102/telemetry/replay',
      method: 'POST',
      payload: {
        site_id: 3029102,
        session_id: 'hj-sess-9f82-a01b',
        mouse_events_count: 142,
        cursor_trajectory: [
          { x: 420, y: 180, t: 12 },
          { x: 422, y: 185, t: 34 },
          { x: 430, y: 200, t: 56 },
        ],
        keystroke_event_timestamps: [120, 240, 310, 480],
        active_viewport: '1440x900',
      },
    },
  },
  {
    id: 'fullstory-session',
    name: 'FullStory Digital Experience Telemetry',
    company: 'FullStory, Inc.',
    parentCompany: 'FullStory, Inc.',
    category: 'Session Replay',
    riskScore: 90,
    harvestedDataTypes: [
      'behavioral_biometrics',
      'keystroke_recorder',
      'hardware_fingerprint',
      'network_location',
    ],
    knownDomains: ['fullstory.com', 'rs.fullstory.com', 'edge.fullstory.com'],
    trackingTechniques: [
      'Full DOM tree serialization & shadow-DOM capture',
      'Rage-click & dead-click biometrics',
      'Error stack telemetry with local memory state',
      'Device orientation & viewport resize tracking',
    ],
    description:
      'Deep session reconstructor that indexes every interaction, text field input timing, and interface element rendered on screen.',
    jurisdiction: 'United States',
    optOutUrl: 'https://www.fullstory.com/optout/',
    blockRule: '||fullstory.com^$third-party',
    sampleBeacon: {
      url: 'https://rs.fullstory.com/rec/bundle?OrgId=FS-8821&UserId=anon-9382',
      method: 'POST',
      payload: {
        org: 'FS-8821',
        bundle_id: 'b-92810',
        dom_mutations: 18,
        events: ['focus:input#email', 'input:length=14', 'blur:input#email'],
        client_memory_usage_mb: 84.2,
      },
    },
  },
  {
    id: 'microsoft-diagtrack',
    name: 'Microsoft DiagTrack & Windows Telemetry',
    company: 'Microsoft Corporation',
    parentCompany: 'Microsoft Corporation',
    category: 'OS & Device',
    riskScore: 89,
    harvestedDataTypes: [
      'hardware_fingerprint',
      'keystroke_recorder',
      'network_location',
      'sensor_ambient',
    ],
    knownDomains: [
      'vortex.data.microsoft.com',
      'telemetry.microsoft.com',
      'watson.telemetry.microsoft.com',
      'pipe.aria.microsoft.com',
    ],
    trackingTechniques: [
      'Connected User Experiences and Telemetry (DiagTrack) daemon',
      'Hardware UUID, CPU stepping, and disk serial ingestion',
      'Inking and typing dictionary personalization telemetry',
      'Application launch frequency & crash dumps',
    ],
    description:
      'Native OS-level diagnostic and telemetry pipeline embedded in Windows 10/11 transmitting continuous device telemetry to Microsoft clouds.',
    jurisdiction: 'United States',
    optOutUrl: 'Windows Settings > Privacy & Security > Diagnostics & feedback',
    blockRule: '||vortex.data.microsoft.com^',
    sampleBeacon: {
      url: 'https://vortex.data.microsoft.com/collect/v1',
      method: 'POST',
      payload: {
        app_name: 'ShellExperienceHost',
        os_version: '10.0.22631.3296',
        device_guid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        cpu_arch: 'x64',
        mem_installed_bytes: 17179869184,
        telemetry_tier: 'OptionalDiagnosticData',
      },
    },
  },
  {
    id: 'liveramp-identity',
    name: 'LiveRamp RampID / Identity Graph',
    company: 'LiveRamp Holdings, Inc.',
    parentCompany: 'LiveRamp Holdings, Inc.',
    category: 'Data Broker',
    riskScore: 98,
    harvestedDataTypes: [
      'cross_site_identity',
      'financial_commercial',
      'browsing_history',
      'hardware_fingerprint',
    ],
    knownDomains: ['rlcdn.com', 'liveramp.com', 'api.rlcdn.com'],
    trackingTechniques: [
      'Offline-to-online identity resolution',
      'Deterministic identity graph matching across household addresses',
      'Cross-publisher cookie synchronization pixels',
      'Mobile advertising ID (MAID) to hashed email reconciliation',
    ],
    description:
      'Global master identity syndicate that bridges fragmented anonymous online telemetry with real-world consumer profiles, postal addresses, and credit records.',
    jurisdiction: 'United States',
    optOutUrl: 'https://liveramp.com/opt_out/',
    blockRule: '||rlcdn.com^$third-party',
    sampleBeacon: {
      url: 'https://api.rlcdn.com/api/identity/envelope?partner_id=8921',
      method: 'GET',
      payload: {
        partner_id: '8921',
        sync_envelope: 'XY981-RAMPID-PSEUDONYM-99182',
        device_fingerprint_seed: 'canvas_hash_7f9a12',
        consent_string: 'CP82910...IAB_TCF_v2',
      },
    },
  },
  {
    id: 'tiktok-pixel',
    name: 'TikTok Pixel & Events SDK',
    company: 'TikTok Inc.',
    parentCompany: 'ByteDance Ltd.',
    category: 'AdTech & Profiling',
    riskScore: 94,
    harvestedDataTypes: [
      'hardware_fingerprint',
      'network_location',
      'browsing_history',
      'cross_site_identity',
      'behavioral_biometrics',
    ],
    knownDomains: ['analytics.tiktok.com', 'business-api.tiktok.com'],
    trackingTechniques: [
      'Client hints header collection (Architecture, platform version)',
      'Local storage ID persistent recreation',
      'Cross-app tracking via mobile deep links',
      'Audio & Canvas canvas rendering probe',
    ],
    description:
      'Embeds behavioral tracking across partner websites to train algorithm recommendations and power demographic target modeling.',
    jurisdiction: 'China / Singapore / US',
    optOutUrl: 'https://www.tiktok.com/safety/en/ads-and-data/',
    blockRule: '||analytics.tiktok.com^$third-party',
    sampleBeacon: {
      url: 'https://analytics.tiktok.com/api/v2/pixel/track',
      method: 'POST',
      payload: {
        event: 'ViewContent',
        pixel_code: 'C39102847192',
        context: {
          ad: { callback: '1920839' },
          page: { url: 'https://trendy-merch.com/shoes' },
          user: { ttp: '9a8b7c6d5e4f3a2b1' },
          device: { user_agent: 'Mozilla/5.0...', screen_width: 1920 },
        },
      },
    },
  },
  {
    id: 'oracle-bluekai',
    name: 'Oracle BlueKai & Moat Analytics',
    company: 'Oracle Corporation',
    parentCompany: 'Oracle Corporation',
    category: 'Data Broker',
    riskScore: 96,
    harvestedDataTypes: [
      'cross_site_identity',
      'browsing_history',
      'hardware_fingerprint',
      'financial_commercial',
    ],
    knownDomains: ['bluekai.com', 'tags.bluekai.com', 'bkrtx.com'],
    trackingTechniques: [
      'Massive 3rd-party data aggregation across thousands of partners',
      'Intent scoring & audience taxonomy categorization',
      'Invisible 1x1 GIF synchronization cascades',
    ],
    description:
      'Supplies advertisers with behavioral dossier segments (e.g. "Frequent International Traveler", "Subprime Auto Loan Seeker") constructed from cross-site telemetry.',
    jurisdiction: 'United States',
    optOutUrl: 'https://www.oracle.com/legal/privacy/marketing-cloud-data-cloud-privacy-policy.html',
    blockRule: '||bluekai.com^$third-party',
    sampleBeacon: {
      url: 'https://tags.bluekai.com/site/49102?ret=html&phint=cat%3Dautomotive',
      method: 'GET',
      payload: {
        site: '49102',
        phint: 'cat=luxury_vehicles&intent=buy_30days',
        bkuid: '9920194817263541',
      },
    },
  },
  {
    id: 'datadog-rum',
    name: 'Datadog Real User Monitoring (RUM)',
    company: 'Datadog, Inc.',
    parentCompany: 'Datadog, Inc.',
    category: 'Crash & Metrics',
    riskScore: 72,
    harvestedDataTypes: [
      'hardware_fingerprint',
      'network_location',
      'behavioral_biometrics',
    ],
    knownDomains: ['browser-intake-datadoghq.com', 'datadoghq.com'],
    trackingTechniques: [
      'Core Web Vitals & performance timing waterfalls',
      'Network request timing and payload headers',
      'Session duration and page view route changes',
      'Client memory and CPU performance sampling',
    ],
    description:
      'Monitors client-side web application health, capturing network request timings, browser rendering bottlenecks, and error traces.',
    jurisdiction: 'United States',
    optOutUrl: 'https://www.datadoghq.com/legal/privacy/',
    blockRule: '||browser-intake-datadoghq.com^$third-party',
    sampleBeacon: {
      url: 'https://browser-intake-datadoghq.com/api/v2/rum?ddsource=browser',
      method: 'POST',
      payload: {
        type: 'view',
        view: { id: 'view-9281', url: 'https://app.example.com/dashboard', loading_time: 420 },
        connectivity: { status: 'connected', effective_type: '4g' },
      },
    },
  },
  {
    id: 'samsung-acr',
    name: 'Samsung Smart TV ACR Telemetry',
    company: 'Samsung Electronics Co., Ltd.',
    parentCompany: 'Samsung Electronics Co., Ltd.',
    category: 'OS & Device',
    riskScore: 91,
    harvestedDataTypes: [
      'hardware_fingerprint',
      'network_location',
      'sensor_ambient',
    ],
    knownDomains: ['samsungacr.com', 'samsungcloudplatform.com', 'samsungotn.net'],
    trackingTechniques: [
      'Automated Content Recognition (ACR) screen frame acoustic matching',
      'HDMI input feed fingerprinting (cable box, console, streaming sticks)',
      'Device MAC address and local LAN neighborhood scanning',
    ],
    description:
      'Extracts visual or acoustic snippets of what you watch on smart TV screens, identifying shows, commercials, and video games in real time.',
    jurisdiction: 'South Korea',
    optOutUrl: 'TV Settings > Support > Terms & Privacy > Viewing Information Services',
    blockRule: '||samsungacr.com^',
    sampleBeacon: {
      url: 'https://samsungacr.com/api/v1/fingerprint/match',
      method: 'POST',
      payload: {
        tv_model: 'QN90B',
        firmware: '1520.7',
        video_acoustic_snippet_hash: 'c837b019df77a',
        active_input: 'HDMI1',
      },
    },
  },
];

export const CATEGORY_DETAILS: Record<
  TelemetryCategory,
  {
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    commonHarvesters: string[];
    defenseRecommendation: string;
  }
> = {
  hardware_fingerprint: {
    title: 'Hardware & Browser Fingerprinting',
    description:
      'Canvas 2D rendering noise, WebGL GPU unmasked renderer, AudioContext buffer sums, screen dimensions, and CPU core counts combined into a unique pseudo-serial identifier.',
    severity: 'critical',
    commonHarvesters: ['Data Brokers', 'Fraud Detectors', 'AdTech Syndicates', 'TikTok', 'FingerprintJS'],
    defenseRecommendation:
      'Use Firefox ResistFingerprinting, Brave Shields, or Safari which clamp canvas readouts and standardize device metrics.',
  },
  keystroke_recorder: {
    title: 'Keystroke & Form Field Sniffing',
    description:
      'Captures individual keyboard press timings, flight times, and unsubmitted form inputs (often leaking passwords or personal thoughts before submission).',
    severity: 'critical',
    commonHarvesters: ['Hotjar', 'FullStory', 'Microsoft Clarity', 'Fraud Detection SDKs'],
    defenseRecommendation:
      'Disable JavaScript on sensitive forms or use uBlock Origin script-blocking on session replay domains.',
  },
  behavioral_biometrics: {
    title: 'Behavioral Biometrics & Heatmaps',
    description:
      'Continuous mouse trajectory vectors, cursor velocity changes, scroll cadence, dwell time, and rage-clicks used to profile user mood and unique motor reflexes.',
    severity: 'warning',
    commonHarvesters: ['Session Recorders', 'CAPTCHA engines (reCAPTCHA v3)', 'Fraud rings'],
    defenseRecommendation:
      'Block third-party analytics scripts with content blockers or privacy-hardened browser profiles.',
  },
  cross_site_identity: {
    title: 'Cross-Site Identity Graphs & Syncing',
    description:
      'Stitching together browsing across thousands of independent domains using hashed emails, RampIDs, UID2.0, or bounce tracking.',
    severity: 'critical',
    commonHarvesters: ['LiveRamp', 'The Trade Desk', 'Meta', 'Oracle BlueKai', 'Criteo'],
    defenseRecommendation:
      'Use email masking (e.g. SimpleLogin, Hide My Email), container tabs, and block third-party cookies.',
  },
  network_location: {
    title: 'IP & Geolocation Telemetry',
    description:
      'Public IP address, ISP autonomous system number (ASN), approximate physical postal area, and WebRTC local candidate packet leaks.',
    severity: 'warning',
    commonHarvesters: ['Virtually all web servers & CDN analytics', 'GeoIP services', 'Ad networks'],
    defenseRecommendation:
      'Use a trusted encrypted VPN or Tor, and disable WebRTC candidate sharing in browser flags.',
  },
  browsing_history: {
    title: 'Browsing & Navigation Trajectory',
    description:
      'Referral HTTP headers, UTM marketing campaign parameters, internal navigation clicks, and exit pages.',
    severity: 'warning',
    commonHarvesters: ['Google Analytics', 'Meta Pixel', 'Affiliate Networks'],
    defenseRecommendation:
      'Enable strict Referrer-Policy or URL param stripping tools (ClearURLs, Brave Query Stripping).',
  },
  sensor_ambient: {
    title: 'Ambient & Sensor Probing',
    description:
      'Battery API charging status, device orientation gyroscope, accelerometer motion, and ambient light sensors.',
    severity: 'info',
    commonHarvesters: ['Mobile Web SDKs', 'Fraud Score algorithms', 'Smart Device firmware'],
    defenseRecommendation:
      'Modern browsers have restricted Battery API access; avoid granting sensor permissions to unverified sites.',
  },
  financial_commercial: {
    title: 'Commercial Intent & Transaction Telemetry',
    description:
      'Shopping cart contents, item SKUs, checkout price tags, and coupon code entry history.',
    severity: 'critical',
    commonHarvesters: ['Meta Pixel', 'TikTok Events API', 'Amazon AdSystem', 'Google Ads'],
    defenseRecommendation:
      'Use privacy-respecting browsers or privacy cards for financial checkouts.',
  },
};
