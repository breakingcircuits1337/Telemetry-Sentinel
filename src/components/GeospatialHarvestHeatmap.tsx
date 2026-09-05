import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Globe,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Server,
  Maximize2,
  Minimize2,
  RefreshCw,
  Filter,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Flame,
} from 'lucide-react';
import { TelemetryAlert, GeoServerCluster, ClientOriginLocation, InterdictionAction, ClusterTelemetryStats } from '../types';
import {
  GLOBAL_SERVER_CLUSTERS,
  CLIENT_ORIGINS,
  DEFAULT_CLIENT_ORIGIN,
  calculateClusterTelemetryStats,
  mapAlertToCluster,
} from '../data/geoClusterData';
import { WORLD_GEO_DATA, GeoWorldData } from '../data/worldGeoData';
import { telemetryInterceptor } from '../services/telemetryInterceptor';

export interface BlockedMarkerPulse {
  id: string;
  clusterId: string;
  timestamp: number;
  harvesterName?: string;
}

interface GeospatialHarvestHeatmapProps {
  alerts: TelemetryAlert[];
  horizonMs?: number;
  onUpdateInterdiction?: (alertId: string, action: InterdictionAction) => void;
  onSimulate?: (trackerId: string) => void;
  onSelectTracker?: (trackerId: string) => void;
}

type HeatmapMetric = 'requests' | 'bytes' | 'allowed' | 'ratio';

export const GeospatialHarvestHeatmap: React.FC<GeospatialHarvestHeatmapProps> = ({
  alerts,
  horizonMs = 24 * 60 * 60 * 1000,
  onUpdateInterdiction,
  onSimulate,
  onSelectTracker,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [activeMetric, setActiveMetric] = useState<HeatmapMetric>('requests');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<ClientOriginLocation>(DEFAULT_CLIENT_ORIGIN);
  const [showArcs, setShowArcs] = useState<boolean>(true);
  const [showHalos, setShowHalos] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [animatingPackets, setAnimatingPackets] = useState<
    { id: string; clusterId: string; progress: number; color: string }[]
  >([]);
  const [simulationPingMessage, setSimulationPingMessage] = useState<string | null>(null);

  // Real-time blocked telemetry pulse events
  const [activeBlockedPulses, setActiveBlockedPulses] = useState<BlockedMarkerPulse[]>([]);
  const prevAlertsMapRef = useRef<Map<string, InterdictionAction>>(new Map());
  const isInitialMountRef = useRef<boolean>(true);

  // Monitor incoming and updated alerts for newly blocked telemetry
  useEffect(() => {
    const prevMap = prevAlertsMapRef.current;
    const newPulses: BlockedMarkerPulse[] = [];
    const now = Date.now();

    if (isInitialMountRef.current) {
      alerts.forEach((a) => {
        prevMap.set(a.id, a.interdictionAction);
      });
      isInitialMountRef.current = false;
      return;
    }

    alerts.forEach((alert) => {
      const prevAction = prevMap.get(alert.id);
      const isNowBlocked = alert.interdictionAction === 'blocked';

      if (isNowBlocked && (prevAction === undefined || prevAction !== 'blocked')) {
        const cluster = mapAlertToCluster(alert);
        newPulses.push({
          id: `pulse-prop-${alert.id}-${now}`,
          clusterId: cluster.id,
          timestamp: now,
          harvesterName: alert.harvesterName,
        });
      }
      prevMap.set(alert.id, alert.interdictionAction);
    });

    if (newPulses.length > 0) {
      setActiveBlockedPulses((prev) => [...prev, ...newPulses]);
    }
  }, [alerts]);

  // Subscribe directly to real-time telemetry interceptor for zero-latency blocked beacon pulses
  useEffect(() => {
    const unsubscribe = telemetryInterceptor.subscribe((alert) => {
      if (alert.interdictionAction === 'blocked') {
        const cluster = mapAlertToCluster(alert);
        const now = Date.now();
        setActiveBlockedPulses((prev) => [
          ...prev,
          {
            id: `pulse-live-${alert.id}-${now}`,
            clusterId: cluster.id,
            timestamp: now,
            harvesterName: alert.harvesterName,
          },
        ]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Pulse lifecycle garbage collector
  useEffect(() => {
    if (activeBlockedPulses.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveBlockedPulses((prev) => {
        const filtered = prev.filter((p) => now - p.timestamp < 4500);
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 400);
    return () => clearInterval(timer);
  }, [activeBlockedPulses]);

  // Calculate cluster stats based on the passed alerts
  const clusterStatsMap = useMemo(() => {
    return calculateClusterTelemetryStats(alerts, horizonMs);
  }, [alerts, horizonMs]);

  // Total metrics across all clusters
  const globalTotals = useMemo(() => {
    let totalReq = 0;
    let totalBytes = 0;
    let totalBlocked = 0;
    let totalAllowed = 0;
    let totalPoisoned = 0;

    (Object.values(clusterStatsMap) as ClusterTelemetryStats[]).forEach((st) => {
      totalReq += st.requestCount;
      totalBytes += st.estimatedBytesHarvested;
      totalBlocked += st.blockedCount;
      totalAllowed += st.allowedCount;
      totalPoisoned += st.poisonedCount;
    });

    const evaluated = totalBlocked + totalAllowed;
    const globalRatio = evaluated > 0 ? Math.round((totalBlocked / evaluated) * 100) : 100;

    return {
      totalReq,
      totalBytes,
      totalBlocked,
      totalAllowed,
      totalPoisoned,
      globalRatio,
    };
  }, [clusterStatsMap]);

  // Ranked clusters by current metric
  const rankedClusters = useMemo(() => {
    const list = Object.values(clusterStatsMap) as ClusterTelemetryStats[];
    return list.sort((a, b) => {
      if (activeMetric === 'bytes') return b.estimatedBytesHarvested - a.estimatedBytesHarvested;
      if (activeMetric === 'allowed') return b.allowedCount - a.allowedCount;
      if (activeMetric === 'ratio') {
        const evalA = a.blockedCount + a.allowedCount;
        const evalB = b.blockedCount + b.allowedCount;
        const ratioA = evalA > 0 ? a.blockedCount / evalA : 1;
        const ratioB = evalB > 0 ? b.blockedCount / evalB : 1;
        return ratioA - ratioB; // Lowest ratio first for risk highlighting
      }
      return b.requestCount - a.requestCount;
    });
  }, [clusterStatsMap, activeMetric]);

  // Filtered clusters by region
  const displayedClusters = useMemo(() => {
    if (selectedRegion === 'All') return GLOBAL_SERVER_CLUSTERS;
    return GLOBAL_SERVER_CLUSTERS.filter((c) => c.region === selectedRegion);
  }, [selectedRegion]);

  // Trigger outbound telemetry packet animation
  const handleTriggerSimulatedPing = (cluster: GeoServerCluster) => {
    const packetId = `packet-${Date.now()}-${Math.random()}`;
    const newPacket = {
      id: packetId,
      clusterId: cluster.id,
      progress: 0,
      color: '#38bdf8', // cyan packet
    };

    setAnimatingPackets((prev) => [...prev, newPacket]);
    setSimulationPingMessage(`Telemetry packet dispatched to ${cluster.name} (${cluster.datacenter})`);
    setTimeout(() => setSimulationPingMessage(null), 3500);

    // Call simulated tracker in parent if available
    if (onSimulate) {
      // Map to tracker
      const trackerMap: Record<string, string> = {
        'us-east-ashburn': 'google-analytics-4',
        'us-west-silicon-valley': 'google-analytics-4',
        'eu-central-frankfurt': 'hotjar-replay',
        'eu-west-london': 'hotjar-replay',
        'apac-singapore': 'meta-pixel',
        'apac-tokyo': 'google-analytics-4',
        'latam-saopaulo': 'meta-pixel',
        'oceania-sydney': 'google-analytics-4',
      };
      onSimulate(trackerMap[cluster.id] || 'google-analytics-4');
    }
  };

  // Trigger simulated blocked telemetry on a specific cluster to observe real-time marker pulse
  const handleTriggerBlockedPulse = (cluster: GeoServerCluster) => {
    const trackerMap: Record<string, string> = {
      'us-east-ashburn': 'google-analytics-4',
      'us-west-silicon-valley': 'google-analytics-4',
      'eu-central-frankfurt': 'hotjar-replay',
      'eu-west-london': 'hotjar-replay',
      'apac-singapore': 'meta-pixel',
      'apac-tokyo': 'google-analytics-4',
      'latam-saopaulo': 'meta-pixel',
      'oceania-sydney': 'google-analytics-4',
    };

    const trackerId = trackerMap[cluster.id] || 'google-analytics-4';
    telemetryInterceptor.emitSimulatedBlockedTelemetry(trackerId);

    const now = Date.now();
    setActiveBlockedPulses((prev) => [
      ...prev,
      {
        id: `pulse-manual-${cluster.id}-${now}`,
        clusterId: cluster.id,
        timestamp: now,
        harvesterName: cluster.primaryHarvesters[0] || 'Simulated Telemetry',
      },
    ]);

    setSimulationPingMessage(`Interdiction active: Telemetry blocked at ${cluster.city}!`);
    setTimeout(() => setSimulationPingMessage(null), 3500);
  };

  // Packet animation loop
  useEffect(() => {
    if (animatingPackets.length === 0) return;

    const interval = setInterval(() => {
      setAnimatingPackets((prev) => {
        const updated = prev
          .map((p) => ({ ...p, progress: p.progress + 0.05 }))
          .filter((p) => p.progress <= 1.0);
        return updated;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [animatingPackets]);

  // D3 Rendering of World Map, Graticule, Arcs, Halos, and Server Nodes
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 920;
    const height = Math.max(480, Math.min(640, Math.round(width * 0.54)));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Definitions for gradients and filters
    const defs = svg.append('defs');

    // Subtle glow filter
    const filter = defs.append('filter').attr('id', 'glow-filter').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    filter.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter().append('feMergeNode').attr('in', (d) => d);

    // Background ocean gradient
    const oceanGrad = defs.append('linearGradient').attr('id', 'ocean-grad').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
    oceanGrad.append('stop').attr('offset', '0%').attr('stop-color', '#060a13');
    oceanGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0c1626');

    // D3 Projection: Natural Earth 1 projection provides balanced global proportions
    const projection = d3
      .geoNaturalEarth1()
      .scale(width / 5.8)
      .translate([width / 2.05, height / 1.85]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Main Zoomable Group
    const g = svg.append('g').attr('class', 'map-viewport');

    // Setup D3 Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .translateExtent([
        [-100, -100],
        [width + 100, height + 100],
      ])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 1. Ocean Background Canvas
    g.append('rect')
      .attr('width', width * 2)
      .attr('height', height * 2)
      .attr('x', -width * 0.5)
      .attr('y', -height * 0.5)
      .attr('fill', 'url(#ocean-grad)');

    // 2. Graticule (Coordinate Grid Lines)
    const graticule = d3.geoGraticule().step([30, 30]);
    g.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', pathGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(148, 163, 184, 0.08)')
      .attr('stroke-width', 0.75)
      .attr('stroke-dasharray', '3,3');

    // Equator highlight line
    const equator = d3.geoGraticule().step([0, 0]).stepMinor([0, 0]);
    g.append('path')
      .datum({
        type: 'LineString',
        coordinates: [
          [-180, 0],
          [-90, 0],
          [0, 0],
          [90, 0],
          [180, 0],
        ],
      })
      .attr('d', pathGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(56, 189, 248, 0.15)')
      .attr('stroke-width', 1);

    // 3. World Continents
    const landGroup = g.append('g').attr('class', 'continents-layer');
    landGroup
      .selectAll('path.continent')
      .data(WORLD_GEO_DATA.features)
      .enter()
      .append('path')
      .attr('class', 'continent')
      .attr('d', pathGenerator as any)
      .attr('fill', '#111d33')
      .attr('stroke', 'rgba(56, 189, 248, 0.22)')
      .attr('stroke-width', 0.8)
      .attr('opacity', 0.95)
      .on('mouseenter', function () {
        d3.select(this).attr('fill', '#182b4a').attr('stroke', 'rgba(56, 189, 248, 0.5)');
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill', '#111d33').attr('stroke', 'rgba(56, 189, 248, 0.22)');
      });

    // 4. Maximum metric scales for dynamic halos and arcs
    const statsList = Object.values(clusterStatsMap) as ClusterTelemetryStats[];
    const maxRequests = d3.max(statsList, (d) => d.requestCount) || 1;
    const maxBytes = d3.max(statsList, (d) => d.estimatedBytesHarvested) || 1;

    // Radius scale for heatmap thermal halos
    const haloRadiusScale = d3
      .scaleSqrt()
      .domain([0, activeMetric === 'bytes' ? maxBytes : maxRequests])
      .range([18, 55]);

    // 5. Heatmap Density Halos (Multi-layer concentric thermal glow)
    if (showHalos) {
      const halosGroup = g.append('g').attr('class', 'heatmap-halos-layer');

      displayedClusters.forEach((cluster) => {
        const stats = clusterStatsMap[cluster.id];
        const projected = projection(cluster.coordinates);
        if (!projected) return;
        const [cx, cy] = projected;

        const metricVal = activeMetric === 'bytes' ? stats.estimatedBytesHarvested : stats.requestCount;
        const haloRadius = haloRadiusScale(metricVal);

        // Heatmap color logic:
        // If mostly allowed requests exfiltrating -> Infrared Rose
        // If mostly poisoned -> Cyan / Purple
        // If well blocked -> Emerald / Gold
        const allowedRatio = stats.requestCount > 0 ? stats.allowedCount / stats.requestCount : 0;
        let coreColor = '#10b981'; // emerald
        let glowColor = '#059669';
        if (allowedRatio > 0.4) {
          coreColor = '#f43f5e'; // rose (high harvest leak)
          glowColor = '#e11d48';
        } else if (allowedRatio > 0.15) {
          coreColor = '#f59e0b'; // amber (moderate harvest)
          glowColor = '#d97706';
        } else if (stats.poisonedCount > 2) {
          coreColor = '#a855f7'; // purple (noise poisoned)
          glowColor = '#9333ea';
        }

        // Dynamic radial gradient for this cluster
        const gradId = `halo-grad-${cluster.id}`;
        const haloGrad = defs
          .append('radialGradient')
          .attr('id', gradId)
          .attr('cx', '50%')
          .attr('cy', '50%')
          .attr('r', '50%');
        haloGrad.append('stop').attr('offset', '0%').attr('stop-color', coreColor).attr('stop-opacity', 0.55);
        haloGrad.append('stop').attr('offset', '45%').attr('stop-color', glowColor).attr('stop-opacity', 0.28);
        haloGrad.append('stop').attr('offset', '85%').attr('stop-color', coreColor).attr('stop-opacity', 0.08);
        haloGrad.append('stop').attr('offset', '100%').attr('stop-color', coreColor).attr('stop-opacity', 0);

        // Outer ambient heat bloom
        halosGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', haloRadius * 1.5)
          .attr('fill', `url(#${gradId})`)
          .attr('pointer-events', 'none');

        // Middle concentrated heat disk
        halosGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', haloRadius)
          .attr('fill', `url(#${gradId})`)
          .attr('pointer-events', 'none');
      });
    }

    // 6. Great Circle Geodesic Trajectory Arcs
    const originProjected = projection(selectedOrigin.coordinates);
    const arcsGroup = g.append('g').attr('class', 'trajectory-arcs-layer');

    if (showArcs && originProjected) {
      displayedClusters.forEach((cluster) => {
        const stats = clusterStatsMap[cluster.id];
        const destProjected = projection(cluster.coordinates);
        if (!destProjected) return;

        // Generate great-circle path points using d3.geoInterpolate
        const interpolator = d3.geoInterpolate(selectedOrigin.coordinates, cluster.coordinates);
        const arcPoints: [number, number][] = [];
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const coord = interpolator(i / steps);
          const pt = projection(coord);
          if (pt) arcPoints.push(pt);
        }

        const lineGenerator = d3.line<[number, number]>().curve(d3.curveBasis);
        const pathData = lineGenerator(arcPoints);
        if (!pathData) return;

        const isSelected = selectedClusterId === cluster.id;
        const hasAllowed = stats.allowedCount > 0;
        const arcStrokeColor = isSelected
          ? '#38bdf8'
          : hasAllowed
          ? 'rgba(244, 63, 94, 0.45)'
          : 'rgba(16, 185, 129, 0.35)';

        // Trajectory Path
        arcsGroup
          .append('path')
          .attr('d', pathData)
          .attr('fill', 'none')
          .attr('stroke', arcStrokeColor)
          .attr('stroke-width', isSelected ? 2.5 : Math.max(1, (stats.requestCount / maxRequests) * 2.5))
          .attr('stroke-dasharray', hasAllowed ? '4,3' : 'solid')
          .attr('opacity', isSelected ? 1 : 0.75);

        // Animated packet streaming along arc
        const activePacket = animatingPackets.find((p) => p.clusterId === cluster.id);
        if (activePacket && activePacket.progress < 1.0) {
          const currentCoord = interpolator(activePacket.progress);
          const currentPt = projection(currentCoord);
          if (currentPt) {
            arcsGroup
              .append('circle')
              .attr('cx', currentPt[0])
              .attr('cy', currentPt[1])
              .attr('r', 4.5)
              .attr('fill', activePacket.color)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 1.5)
              .attr('filter', 'url(#glow-filter)');
          }
        }
      });
    }

    // 7. Client Origin Radar Beacon (User Browser Terminal)
    if (originProjected) {
      const [ox, oy] = originProjected;
      const originGroup = g.append('g').attr('class', 'client-origin-node');

      // Radiating radar pulse rings
      originGroup
        .append('circle')
        .attr('cx', ox)
        .attr('cy', oy)
        .attr('r', 16)
        .attr('fill', 'none')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6)
        .attr('stroke-dasharray', '2,2');

      originGroup
        .append('circle')
        .attr('cx', ox)
        .attr('cy', oy)
        .attr('r', 8)
        .attr('fill', '#06b6d4')
        .attr('opacity', 0.3);

      originGroup
        .append('circle')
        .attr('cx', ox)
        .attr('cy', oy)
        .attr('r', 4.5)
        .attr('fill', '#22d3ee')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .attr('filter', 'url(#glow-filter)');

      // Origin text label
      originGroup
        .append('text')
        .attr('x', ox + 10)
        .attr('y', oy - 8)
        .attr('fill', '#22d3ee')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .text('LOCAL ORIGIN');

      originGroup
        .append('text')
        .attr('x', ox + 10)
        .attr('y', oy + 4)
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(selectedOrigin.city);
    }

    // 8. Server Cluster Nodes & Interaction Targets
    const nodesGroup = g.append('g').attr('class', 'server-cluster-nodes-layer');

    displayedClusters.forEach((cluster) => {
      const stats = clusterStatsMap[cluster.id];
      const projected = projection(cluster.coordinates);
      if (!projected) return;
      const [cx, cy] = projected;

      const isSelected = selectedClusterId === cluster.id;
      const isAllowedExfiltrating = stats.allowedCount > 0;

      const clusterG = nodesGroup
        .append('g')
        .attr('class', `cluster-node-${cluster.id}`)
        .attr('cursor', 'pointer')
        .on('click', () => {
          setSelectedClusterId((prev) => (prev === cluster.id ? null : cluster.id));
        });

      // Outer focus ring if selected
      if (isSelected) {
        clusterG
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 16)
          .attr('fill', 'none')
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,2');
      }

      // Base server node circle
      const nodeColor = isAllowedExfiltrating
        ? '#f43f5e'
        : stats.poisonedCount > 2
        ? '#a855f7'
        : '#10b981';

      clusterG
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', isSelected ? 8 : 6)
        .attr('fill', nodeColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .attr('filter', isSelected ? 'url(#glow-filter)' : undefined);

      // Label background pill
      const labelText = cluster.city.split('&')[0].trim();
      const badgeText =
        activeMetric === 'bytes'
          ? `${(stats.estimatedBytesHarvested / 1024).toFixed(1)}K`
          : `${stats.requestCount}`;

      const textGroup = clusterG.append('g').attr('transform', `translate(${cx + 8}, ${cy - 4})`);

      textGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', -9)
        .attr('width', labelText.length * 5.8 + badgeText.length * 6 + 14)
        .attr('height', 16)
        .attr('rx', 4)
        .attr('fill', 'rgba(10, 15, 26, 0.85)')
        .attr('stroke', isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)')
        .attr('stroke-width', 1);

      textGroup
        .append('text')
        .attr('x', 4)
        .attr('y', 2)
        .attr('fill', '#e2e8f0')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .text(labelText);

      textGroup
        .append('text')
        .attr('x', labelText.length * 5.8 + 8)
        .attr('y', 2)
        .attr('fill', isAllowedExfiltrating ? '#fb7185' : '#34d399')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .text(badgeText);
    });
  }, [
    clusterStatsMap,
    displayedClusters,
    selectedOrigin,
    activeMetric,
    selectedClusterId,
    showArcs,
    showHalos,
    animatingPackets,
  ]);

  // Selected cluster detail object
  const activeClusterDetail = useMemo(() => {
    if (!selectedClusterId) return null;
    return clusterStatsMap[selectedClusterId] || null;
  }, [selectedClusterId, clusterStatsMap]);

  return (
    <div
      id="geospatial-harvest-heatmap-container"
      ref={containerRef}
      className={`bg-slate-900/90 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 overflow-y-auto bg-slate-950/95 border-cyan-500/40' : ''
      }`}
    >
      {/* Top Header & Geospatial Control Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Global Telemetry Ingestion Heatmap
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                D3.js Geo Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mapping intercepted beacon destinations & exfiltrated data density across worldwide server clusters
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Pills */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveMetric('requests')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'requests' ? 'bg-cyan-500/25 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualize clusters by total intercepted telemetry requests"
            >
              Requests
            </button>
            <button
              onClick={() => setActiveMetric('bytes')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'bytes' ? 'bg-amber-500/25 text-amber-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualize clusters by estimated bytes harvested"
            >
              Data Volume
            </button>
            <button
              onClick={() => setActiveMetric('allowed')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'allowed' ? 'bg-rose-500/25 text-rose-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualize clusters by leaking/allowed exfiltrations"
            >
              Leaks (Allowed)
            </button>
            <button
              onClick={() => setActiveMetric('ratio')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'ratio' ? 'bg-emerald-500/25 text-emerald-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Rank by lowest interdiction ratio"
            >
              Shield Ratio
            </button>
          </div>

          {/* Trajectory & Halos Toggles */}
          <div className="flex items-center space-x-1 bg-black/30 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setShowArcs((prev) => !prev)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                showArcs ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Geodesic Trajectory Arcs"
            >
              Arcs {showArcs ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowHalos((prev) => !prev)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                showHalos ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Heatmap Density Bloom"
            >
              Bloom {showHalos ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Geospatial View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Secondary Bar: Regional Filter & Client Origin Egress Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-xs">
        {/* Region Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-500 font-mono text-[11px] uppercase mr-1">Region:</span>
          {['All', 'North America', 'Europe', 'Asia Pacific', 'Latin America', 'Oceania'].map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all ${
                selectedRegion === reg
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-black/30 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>

        {/* Client Origin Switcher */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-mono text-[11px] uppercase">Origin Node:</span>
          <select
            value={selectedOrigin.id}
            onChange={(e) => {
              const matched = CLIENT_ORIGINS.find((o) => o.id === e.target.value);
              if (matched) setSelectedOrigin(matched);
            }}
            className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
          >
            {CLIENT_ORIGINS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.city} ({o.country})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main D3 Heatmap Stage */}
      <div className="relative mt-2 rounded-2xl overflow-hidden border border-white/10 bg-[#060a13]">
        <svg ref={svgRef} className="w-full h-auto block select-none cursor-grab active:cursor-grabbing" />

        {/* Live Simulation Ping Overlay Toast */}
        {simulationPingMessage && (
          <div className="absolute top-3 left-3 z-30 bg-slate-950/90 border border-cyan-500/40 px-3 py-1.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-mono text-cyan-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>{simulationPingMessage}</span>
          </div>
        )}

        {/* Map Legend & Thermal Scale */}
        <div className="absolute bottom-3 left-3 z-20 bg-slate-950/85 backdrop-blur-md border border-white/10 p-2.5 rounded-xl text-[10px] font-mono space-y-1.5 pointer-events-none">
          <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Harvest Density Intensity</div>
          <div className="flex items-center space-x-1.5">
            <span className="text-emerald-400">Low/Shielded</span>
            <div className="w-24 h-2 rounded bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600" />
            <span className="text-rose-400">High Leak</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[9px] pt-0.5 border-t border-white/5">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              <span>Client Origin</span>
            </span>
            <span className="flex items-center space-x-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Target Cluster</span>
            </span>
          </div>
        </div>

        {/* Interactive Floating Quick Tooltip / Inspector if Cluster is clicked */}
        {activeClusterDetail && (
          <div className="absolute top-3 right-3 z-30 max-w-sm w-full bg-slate-950/95 border border-cyan-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h4 className="text-xs font-bold text-white font-mono uppercase flex items-center space-x-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{activeClusterDetail.cluster.name}</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeClusterDetail.cluster.datacenter} &bull; {activeClusterDetail.cluster.city}
                </p>
              </div>
              <button
                onClick={() => setSelectedClusterId(null)}
                className="text-slate-400 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded bg-white/5"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-slate-400 text-[10px]">Requests Intercepted</span>
                <p className="text-base font-bold text-white mt-0.5">
                  {activeClusterDetail.requestCount}
                </p>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-slate-400 text-[10px]">Est. Data Harvested</span>
                <p className="text-base font-bold text-amber-300 mt-0.5">
                  {(activeClusterDetail.estimatedBytesHarvested / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-emerald-400 text-[10px]">Sinkholed / Blocked</span>
                <p className="text-sm font-bold text-emerald-300 mt-0.5">
                  {activeClusterDetail.blockedCount}
                </p>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-rose-400 text-[10px]">Leaked / Allowed</span>
                <p className="text-sm font-bold text-rose-300 mt-0.5">
                  {activeClusterDetail.allowedCount}
                </p>
              </div>
            </div>

            {/* Active Harvesters at this Datacenter */}
            <div className="mb-3">
              <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
                Dominant Harvesters at this Gateway:
              </div>
              <div className="flex flex-wrap gap-1">
                {activeClusterDetail.activeHarvesters.map((harv) => (
                  <span
                    key={harv}
                    className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300 font-mono"
                  >
                    {harv}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Triggers for this Cluster */}
            <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
              <button
                onClick={() => handleTriggerSimulatedPing(activeClusterDetail.cluster)}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-mono font-semibold flex items-center justify-center space-x-1 transition-colors"
              >
                <Radio className="w-3 h-3 text-cyan-400" />
                <span>Simulate Outbound Beacon</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Regional Harvesting Breakdown & Global Telemetry Share */}
      <div className="mt-6 pt-5 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Global Regional Harvesting Density Breakdown
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Total Exfiltration Monitored: {(globalTotals.totalBytes / 1024).toFixed(1)} KB ({globalTotals.totalReq} Beacons)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rankedClusters.slice(0, 4).map((stat, idx) => {
            const cluster = stat.cluster;
            const reqPct = globalTotals.totalReq > 0 ? (stat.requestCount / globalTotals.totalReq) * 100 : 0;
            const isSelected = selectedClusterId === cluster.id;
            const isLeak = stat.allowedCount > 0;

            return (
              <div
                key={cluster.id}
                onClick={() => setSelectedClusterId((prev) => (prev === cluster.id ? null : cluster.id))}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/80 border-cyan-500/60 shadow-lg'
                    : 'bg-black/30 hover:bg-slate-800/40 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-slate-500 font-bold">#{idx + 1}</span>
                    <span className="text-white font-bold truncate">{cluster.city}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isLeak ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {reqPct.toFixed(0)}% Vol
                  </span>
                </div>

                <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                  {cluster.datacenter}
                </p>

                {/* Progress bar of data exfiltration share */}
                <div className="w-full bg-white/5 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLeak ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(6, reqPct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-white/5">
                  <span>{stat.requestCount} requests</span>
                  <span className="text-amber-300 font-bold">
                    {(stat.estimatedBytesHarvested / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
