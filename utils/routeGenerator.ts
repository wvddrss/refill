import { GPXRoute, GPXPoint, POI } from '@/store/store';
import { calculateDistance } from './gpxParser';

interface RouteSegment {
  startIndex: number;
  endIndex: number;
  insertionPoint: number; // Index in original route where POI should be inserted
  poi: POI;
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
export function generateRouteWithPOIs(originalRoute: GPXRoute, pois: POI[]): GPXRoute {
  const selectedPOIs = pois.filter((poi) => poi.selected);

  if (selectedPOIs.length === 0) {
    // No POIs selected, return original route
    return { ...originalRoute };
  }

  // Create a copy of the route points
  const newPoints: GPXPoint[] = [...originalRoute.points];

  // Find insertion points for each POI
  const segments: RouteSegment[] = selectedPOIs.map((poi) => {
    const insertionPoint = findBestInsertionPoint(poi, originalRoute.points);
    return {
      startIndex: 0,
      endIndex: 0,
      insertionPoint,
      poi,
    };
  });

  // Sort POIs by their insertion point (in reverse order to maintain indices)
  segments.sort((a, b) => b.insertionPoint - a.insertionPoint);

  // Insert POIs into the route
  segments.forEach((segment) => {
    const poiPoint: GPXPoint = {
      lat: segment.poi.lat,
      lon: segment.poi.lon,
    };

    // Find the best position between the two nearest points
    const insertIndex = segment.insertionPoint;

    // Insert the POI point at the calculated index
    // If there's a next point, we insert before it; otherwise, we append
    if (insertIndex < newPoints.length - 1) {
      // Insert POI point after the nearest point
      newPoints.splice(insertIndex + 1, 0, poiPoint);
    } else {
      // Insert at the end
      newPoints.push(poiPoint);
    }
  });

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
