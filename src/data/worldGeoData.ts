// Self-contained GeoJSON FeatureCollection for world continents and landmasses
// Designed for offline D3.js geospatial rendering without external CDN dependencies

export interface GeoFeature {
  type: 'Feature';
  properties: {
    name: string;
    continent: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoWorldData {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export const WORLD_GEO_DATA: GeoWorldData = {
  type: 'FeatureCollection',
  features: [
    // North America (Continental)
    {
      type: 'Feature',
      properties: { name: 'North America', continent: 'NA' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-168, 65], [-160, 71], [-140, 70], [-120, 76], [-85, 76],
            [-78, 72], [-65, 60], [-55, 50], [-60, 45], [-68, 44],
            [-75, 38], [-80, 25], [-82, 23], [-88, 21], [-97, 26],
            [-97, 20], [-93, 16], [-84, 10], [-77, 8], [-83, 8],
            [-87, 13], [-96, 16], [-105, 20], [-110, 24], [-115, 30],
            [-122, 37], [-124, 45], [-128, 52], [-135, 57], [-145, 60],
            [-160, 58], [-168, 65],
          ],
        ],
      },
    },
    // Greenland
    {
      type: 'Feature',
      properties: { name: 'Greenland', continent: 'NA' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-44, 60], [-52, 64], [-55, 72], [-45, 83], [-20, 83],
            [-18, 76], [-28, 70], [-35, 65], [-44, 60],
          ],
        ],
      },
    },
    // South America
    {
      type: 'Feature',
      properties: { name: 'South America', continent: 'SA' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77, 8], [-72, 11], [-60, 10], [-50, 2], [-35, -5],
            [-35, -10], [-40, -20], [-45, -23], [-50, -30], [-58, -34],
            [-65, -42], [-68, -54], [-75, -52], [-74, -45], [-72, -35],
            [-70, -20], [-78, -5], [-80, 2], [-77, 8],
          ],
        ],
      },
    },
    // Europe
    {
      type: 'Feature',
      properties: { name: 'Europe', continent: 'EU' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-9, 36], [-9, 43], [-1, 44], [-4, 48], [2, 51],
            [5, 53], [8, 55], [10, 57], [12, 56], [14, 54],
            [20, 55], [26, 60], [28, 70], [35, 68], [45, 68],
            [55, 65], [60, 60], [50, 50], [40, 45], [30, 46],
            [26, 40], [22, 38], [15, 38], [12, 43], [3, 42],
            [-3, 36], [-9, 36],
          ],
        ],
      },
    },
    // Scandinavia
    {
      type: 'Feature',
      properties: { name: 'Scandinavia', continent: 'EU' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [5, 62], [10, 58], [15, 56], [20, 60], [25, 65],
            [28, 70], [20, 71], [15, 68], [10, 65], [5, 62],
          ],
        ],
      },
    },
    // British Isles
    {
      type: 'Feature',
      properties: { name: 'United Kingdom & Ireland', continent: 'EU' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-10, 51], [-6, 50], [-1, 51], [1.5, 52.5], [0, 54],
            [-2, 58], [-5, 58], [-6, 55], [-10, 54], [-10, 51],
          ],
        ],
      },
    },
    // Africa
    {
      type: 'Feature',
      properties: { name: 'Africa', continent: 'AF' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-17, 15], [-17, 21], [-5, 35], [10, 37], [25, 32],
            [32, 31], [35, 25], [43, 12], [51, 12], [45, 5],
            [40, -5], [36, -15], [32, -26], [28, -33], [18, -34],
            [15, -28], [12, -15], [10, 0], [2, 5], [-8, 4],
            [-13, 8], [-17, 15],
          ],
        ],
      },
    },
    // Madagascar
    {
      type: 'Feature',
      properties: { name: 'Madagascar', continent: 'AF' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [44, -25], [47, -25], [50, -16], [48, -12], [44, -15],
            [43, -20], [44, -25],
          ],
        ],
      },
    },
    // Asia (Mainland Eurasia & East Asia)
    {
      type: 'Feature',
      properties: { name: 'Asia', continent: 'AS' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [35, 32], [42, 40], [50, 42], [53, 37], [60, 25],
            [68, 23], [70, 18], [78, 8], [82, 12], [88, 22],
            [92, 18], [98, 10], [104, 10], [108, 14], [108, 22],
            [118, 25], [122, 32], [126, 38], [130, 42], [138, 48],
            [142, 53], [160, 56], [170, 60], [180, 66], [170, 70],
            [150, 72], [120, 75], [90, 76], [70, 73], [60, 68],
            [55, 60], [50, 50], [40, 45], [35, 32],
          ],
        ],
      },
    },
    // Japan
    {
      type: 'Feature',
      properties: { name: 'Japan', continent: 'AS' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [130, 32], [135, 34], [140, 36], [142, 42], [145, 44],
            [142, 45], [140, 41], [136, 36], [131, 33], [130, 32],
          ],
        ],
      },
    },
    // Southeast Asia Islands (Indonesia / Philippines)
    {
      type: 'Feature',
      properties: { name: 'Maritime Southeast Asia', continent: 'AS' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [95, 5], [105, -5], [115, -8], [125, -8], [130, -3],
            [125, 6], [120, 14], [115, 6], [105, 2], [95, 5],
          ],
        ],
      },
    },
    // Australia
    {
      type: 'Feature',
      properties: { name: 'Australia', continent: 'OC' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114, -22], [118, -35], [135, -35], [140, -38], [150, -37],
            [153, -28], [148, -20], [142, -11], [130, -12], [124, -16],
            [114, -22],
          ],
        ],
      },
    },
    // New Zealand
    {
      type: 'Feature',
      properties: { name: 'New Zealand', continent: 'OC' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [166, -46], [172, -44], [178, -38], [175, -35], [172, -40],
            [168, -43], [166, -46],
          ],
        ],
      },
    },
  ],
};
