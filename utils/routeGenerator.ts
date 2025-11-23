import { GPXRoute, GPXPoint, POI } from '@/store/store';
import { calculateDistance } from './gpxParser';

// Use Mapbox's cycling profile so the detours are bike-friendly
const MAPBOX_BASE_URL = 'https://api.mapbox.com/directions/v5/mapbox/cycling';
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? 'MAPBOX_TOKEN_PLACEHOLDER';

interface RouteSegment {
  insertionPoint: number; // Index in original route where POI should be inserted
  poi: POI;
}

interface MapboxRouteResponse {
  routes?: {
    geometry?: {
      coordinates?: [number, number][];
    };
  }[];
}

function pointsAreEqual(pointA: GPXPoint, pointB: GPXPoint, tolerance = 1e-6): boolean {
  return (
    Math.abs(pointA.lat - pointB.lat) < tolerance &&
    Math.abs(pointA.lon - pointB.lon) < tolerance
  );
}

async function fetchMapboxSegment(
  entryPoint: GPXPoint,
  poi: POI,
  exitPoint?: GPXPoint
): Promise<GPXPoint[] | null> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'MAPBOX_TOKEN_PLACEHOLDER') {
    console.log(
      '[routeGenerator] Missing Mapbox token – falling back to straight insertion for POI',
      poi.id
    );
    return null;
  }

  const coordinates = [
    `${entryPoint.lon},${entryPoint.lat}`,
    `${poi.lon},${poi.lat}`,
    ...(exitPoint ? [`${exitPoint.lon},${exitPoint.lat}`] : []),
  ].join(';');

  const url = `${MAPBOX_BASE_URL}/${coordinates}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  console.log(
    '[routeGenerator] Requesting Mapbox segment',
    JSON.stringify({ entryPoint, poiId: poi.id, hasExitPoint: Boolean(exitPoint) })
  );

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox Directions API error: ${response.statusText}`);
  }

  const data = (await response.json()) as MapboxRouteResponse;
  const geometry = data.routes?.[0]?.geometry?.coordinates;

  if (!geometry || geometry.length === 0) {
    return null;
  }

  return geometry.map(([longitude, latitude]) => ({
    lat: latitude,
    lon: longitude,
  }));
}

/**
 * Find the best insertion point for a POI along the route
 */
function findBestInsertionPoint(poi: POI, route: GPXPoint[]): number {
  let minDistance = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < route.length; i++) {
    const distance = calculateDistance(poi.lat, poi.lon, route[i].lat, route[i].lon);
    if (distance < minDistance) {
      minDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Generate a new route with selected POIs inserted optimally
 */
export async function generateRouteWithPOIs(
  originalRoute: GPXRoute,
  pois: POI[]
): Promise<GPXRoute> {
  const selectedPOIs = pois.filter((poi) => poi.selected);

  console.log(
    '[routeGenerator] generateRouteWithPOIs',
    JSON.stringify({
      totalPOIs: pois.length,
      selectedPOIs: selectedPOIs.length,
      originalPoints: originalRoute.points.length,
    })
  );

  if (selectedPOIs.length === 0) {
    // No POIs selected, return original route
    return { ...originalRoute };
  }

  const segmentsByIndex = new Map<number, RouteSegment[]>();

  selectedPOIs.forEach((poi) => {
    const insertionPoint = findBestInsertionPoint(poi, originalRoute.points);
    const segments = segmentsByIndex.get(insertionPoint) ?? [];
    segments.push({ insertionPoint, poi });
    segmentsByIndex.set(insertionPoint, segments);
  });

  segmentsByIndex.forEach((segments) => {
    segments.sort(
      (a, b) => (a.poi.distanceAlongRoute ?? 0) - (b.poi.distanceAlongRoute ?? 0)
    );
  });

  const newPoints: GPXPoint[] = [];

  for (let i = 0; i < originalRoute.points.length; i++) {
    const currentPoint = originalRoute.points[i];
    const nextPoint = originalRoute.points[i + 1];
    newPoints.push(currentPoint);

    const segmentsAtIndex = segmentsByIndex.get(i);
    if (!segmentsAtIndex) continue;

    for (const segment of segmentsAtIndex) {
      let routedPoints: GPXPoint[] | null = null;

      try {
        routedPoints = await fetchMapboxSegment(currentPoint, segment.poi, nextPoint);
      } catch (error) {
        console.error('[routeGenerator] Error fetching Mapbox segment', {
          poiId: segment.poi.id,
          entryIndex: i,
          error,
        });
      }

      if (!routedPoints || routedPoints.length === 0) {
        // Fallback: insert the POI directly after the entry point
        console.log(
          '[routeGenerator] Fallback to direct insert',
          JSON.stringify({ poiId: segment.poi.id, entryIndex: i })
        );
        newPoints.push({
          lat: segment.poi.lat,
          lon: segment.poi.lon,
        });
        continue;
      }

      console.log(
        '[routeGenerator] Inserting routed segment',
        JSON.stringify({
          poiId: segment.poi.id,
          entryIndex: i,
          routedPoints: routedPoints.length,
        })
      );

      routedPoints.forEach((routePoint, idx) => {
        if (idx === 0 && pointsAreEqual(routePoint, currentPoint)) {
          return;
        }

        if (nextPoint && idx === routedPoints.length - 1 && pointsAreEqual(routePoint, nextPoint)) {
          return;
        }

        newPoints.push(routePoint);
      });
    }
  }

  const downsampledCoordinates = (() => {
    const MAX_PREVIEW_POINTS = 100;
    const stride = Math.max(1, Math.floor(newPoints.length / MAX_PREVIEW_POINTS));
    const coords: [number, number][] = [];
    newPoints.forEach((point, index) => {
      if (index % stride === 0 || index === newPoints.length - 1) {
        coords.push([point.lon, point.lat]);
      }
    });
    return coords;
  })();

  const staticPreviewGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: downsampledCoordinates,
        },
      },
    ],
  };

  const encodedGeoJSON = encodeURIComponent(JSON.stringify(staticPreviewGeoJSON));
  const staticBaseUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/geojson(${encodedGeoJSON})/auto/800x600`;

  console.log(
    '[routeGenerator] Modified route summary',
    JSON.stringify({
      originalPoints: originalRoute.points.length,
      modifiedPoints: newPoints.length,
      downsampledPoints: downsampledCoordinates.length,
      sample: newPoints.slice(0, 5),
    })
  );
  console.log(
    '[routeGenerator] Mapbox static preview (append your access_token parameter):',
    `${staticBaseUrl}?access_token=YOUR_TOKEN_HERE`
  );

  return {
    name: `${originalRoute.name || 'Route'} (Modified)`,
    points: newPoints,
  };
}

/**
 * Calculate total route distance
 */
export function calculateRouteDistance(route: GPXRoute): number {
  let totalDistance = 0;

  for (let i = 0; i < route.points.length - 1; i++) {
    const point1 = route.points[i];
    const point2 = route.points[i + 1];
    totalDistance += calculateDistance(point1.lat, point1.lon, point2.lat, point2.lon);
  }

  return totalDistance;
}

/**
 * Calculate total elevation gain for a route
 */
export function calculateElevationGain(route: GPXRoute): number {
  let totalGain = 0;

  for (let i = 0; i < route.points.length - 1; i++) {
    const point1 = route.points[i];
    const point2 = route.points[i + 1];
    
    // Only calculate if both points have elevation data
    if (point1.ele !== undefined && point2.ele !== undefined) {
      const elevationDiff = point2.ele - point1.ele;
      // Only add positive elevation changes (climbing)
      if (elevationDiff > 0) {
        totalGain += elevationDiff;
      }
    }
  }

  return totalGain;
}
