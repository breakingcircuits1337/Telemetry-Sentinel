import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Keyboard,
  MousePointer,
  Share2,
  MapPin,
  Compass,
  BatteryCharging,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { CATEGORY_DETAILS } from '../data/trackerDatabase';
import { TelemetryCategory } from '../types';

export const HarvestedDataMatrix: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<TelemetryCategory>('hardware_fingerprint');

  const categoryIcons: Record<TelemetryCategory, React.ElementType> = {
    hardware_fingerprint: Layers,
    keystroke_recorder: Keyboard,
    behavioral_biometrics: MousePointer,
    cross_site_identity: Share2,
    network_location: MapPin,
    browsing_history: Compass,
    sensor_ambient: BatteryCharging,
    financial_commercial: DollarSign,
  };

  const sampleTelemetryPayloads: Record<TelemetryCategory, Record<string, string>> = {
    hardware_fingerprint: {
      'canvas_2d_hash': '0x9E72A81B (derived from sub-pixel rasterization)',
      'webgl_unmasked_renderer': 'ANGLE (Apple, Apple M2 Pro, OpenGL 4.1)',
      'webgl_unmasked_vendor': 'Apple Inc.',
      'hardware_concurrency': '10 logical CPU threads',
      'device_memory_gb': '16 GB RAM',
      'screen_resolution': '2560x1440x24 (Retina ratio 2.0)',
      'audio_context_hash': '0x438A19DF (dynamics compressor oscillation)',
    },
    keystroke_recorder: {
      'event_type': 'keydown / keyup',
      'key_dwell_time_ms': '74ms (time key held down)',
      'flight_time_ms': '132ms (time between key A and key B)',
      'input_selector': 'input#shipping_address_line1',
      'unsubmitted_buffer': 'Partial text captured prior to form submit',
    },
    behavioral_biometrics: {
      'cursor_coordinates': '[(420, 110, t=10), (428, 115, t=32), ...]',
      'acceleration_jitter': 'Micro-movements and hand tremor signature',
      'scroll_speed_px_sec': '1450 px/s with deceleration curve',
      'rage_click_frequency': '3 clicks / 250ms on disabled checkout button',
    },
    cross_site_identity: {
      'rampid_envelope': 'XY892-DETERMINISTIC-HOUSEHOLD-ID',
      'hashed_email_sha256': '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      'fbp_cookie': 'fb.1.1714829102.849201948',
      'uid2_token': 'A38B9C10D4...unified_identity_token',
      'household_ip_cluster': 'Aggregated with other devices on same WiFi',
    },
    network_location: {
      'public_ipv4': '198.51.100.42',
      'autonomous_system': 'AS7922 (Comcast Cable Communications)',
      'approx_geolocation': 'Denver, CO, US (Latitude: 39.7392, Longitude: -104.9903)',
      'webrtc_candidate_leak': '192.168.1.105 (internal router subnet leak)',
    },
    browsing_history: {
      'http_referrer': 'https://search-portal.com/query?q=medical+symptoms',
      'utm_campaign': 'spring_sale_targeted_retargeting_v3',
      'viewport_dwell_seconds': '42.8 seconds on pricing tier card',
      'tab_visibility_changes': '3 tab switch events before purchase',
    },
    sensor_ambient: {
      'battery_level': '84% (Battery Status API)',
      'battery_charging': 'false (used in behavioral fraud algorithms)',
      'device_orientation': 'alpha: 12.4, beta: 84.1, gamma: -3.2',
      'ambient_light_lux': '240 lux (detects if user is in dark room or office)',
    },
    financial_commercial: {
      'cart_subtotal_usd': '249.99',
      'currency': 'USD',
      'item_categories': '["Electronics", "Security Cameras"]',
      'coupon_code_attempt': 'HONEY_DISCOUNT_FAIL',
    },
  };

  const currentDetails = CATEGORY_DETAILS[selectedCategory];
  const CurrentIcon = categoryIcons[selectedCategory];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-rose-400" />
          <h2 className="text-base font-bold text-white">What Data Is Being Harvested: Telemetry Taxonomy</h2>
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          Select any harvested category below to dissect exact telemetry data fields, extraction mechanisms, and defense steps.
        </p>

        {/* Category Picker Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-neutral-800/80">
          {(Object.keys(CATEGORY_DETAILS) as TelemetryCategory[]).map((catKey) => {
            const detail = CATEGORY_DETAILS[catKey];
            const Icon = categoryIcons[catKey];
            const isSelected = selectedCategory === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`p-3 rounded-lg border text-left transition-all flex items-start space-x-2.5 ${
                  isSelected
                    ? 'bg-neutral-800 border-rose-500/40 text-white shadow-md'
                    : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800/30'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isSelected ? 'text-rose-400' : 'text-neutral-500'
                  }`}
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold block truncate">{detail.title}</span>
                  <span
                    className={`text-[10px] font-mono uppercase font-semibold ${
                      detail.severity === 'critical'
                        ? 'text-rose-400'
                        : detail.severity === 'warning'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {detail.severity}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Category Deep Breakdown */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <CurrentIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{currentDetails.title}</h3>
              <p className="text-xs text-neutral-400 mt-0.5">{currentDetails.description}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase self-start sm:self-auto border ${
              currentDetails.severity === 'critical'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : currentDetails.severity === 'warning'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            }`}
          >
            {currentDetails.severity} Risk Level
          </span>
        </div>

        {/* Harvested Parameter Anatomy */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
            Anatomy of Harvested Telemetry Fields in this Category
          </h4>
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-neutral-800/80">
              {Object.entries(sampleTelemetryPayloads[selectedCategory] || {}).map(([key, val]) => (
                <div key={key} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                  <code className="font-mono text-rose-300 font-semibold shrink-0">{key}</code>
                  <span className="font-mono text-neutral-300 text-[11px] sm:text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Common Harvesters & Defense Advice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Who Regularly Harvester This Data?</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentDetails.commonHarvesters.map((h, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-xs text-neutral-300"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Recommended Defense Countermeasure</span>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              {currentDetails.defenseRecommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
