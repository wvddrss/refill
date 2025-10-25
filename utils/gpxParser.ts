import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { GPXRoute, GPXPoint } from '@/store/store';

/**
 * Parse GPX file content to extract route points
 */
export function parseGPX(gpxContent: string): GPXRoute {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const gpxData = parser.parse(gpxContent);

  const points: GPXPoint[] = [];
  let routeName = '';

  // Try to extract from track (trk) first, then route (rte), then waypoints (wpt)
  if (gpxData.gpx?.trk) {
    const track = Array.isArray(gpxData.gpx.trk) ? gpxData.gpx.trk[0] : gpxData.gpx.trk;
    routeName = track.name || 'Imported Track';

    const segments = Array.isArray(track.trkseg) ? track.trkseg : [track.trkseg];
    segments.forEach((segment: any) => {
      const trackPoints = Array.isArray(segment.trkpt) ? segment.trkpt : [segment.trkpt];
      trackPoints.forEach((pt: any) => {
        if (pt && pt['@_lat'] && pt['@_lon']) {
          points.push({
            lat: parseFloat(pt['@_lat']),
            lon: parseFloat(pt['@_lon']),
            ele: pt.ele ? parseFloat(pt.ele) : undefined,
            time: pt.time,
          });
        }
      });
    });
  } else if (gpxData.gpx?.rte) {
    const route = Array.isArray(gpxData.gpx.rte) ? gpxData.gpx.rte[0] : gpxData.gpx.rte;
    routeName = route.name || 'Imported Route';

    const routePoints = Array.isArray(route.rtept) ? route.rtept : [route.rtept];
    routePoints.forEach((pt: any) => {
      if (pt && pt['@_lat'] && pt['@_lon']) {
        points.push({
          lat: parseFloat(pt['@_lat']),
          lon: parseFloat(pt['@_lon']),
          ele: pt.ele ? parseFloat(pt.ele) : undefined,
        });
      }
    });
  }

  return {
    name: routeName,
    points,
  };
}

/**
 * Generate GPX file content from route points
 */
export function generateGPX(route: GPXRoute): string {
  const gpxData = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    gpx: {
      '@_version': '1.1',
      '@_creator': 'Refuel App',
      '@_xmlns': 'http://www.topografix.com/GPX/1/1',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_xsi:schemaLocation':
        'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
      metadata: {
        name: route.name || 'Refuel Route',
        time: new Date().toISOString(),
      },
      trk: {
        name: route.name || 'Refuel Route',
        trkseg: {
          trkpt: route.points.map((point) => ({
            '@_lat': point.lat,
            '@_lon': point.lon,
            ...(point.ele && { ele: point.ele }),
            ...(point.time && { time: point.time }),
          })),
        },
      },
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  return builder.build(gpxData);
}

/**
 * Calculate distance between two points using Haversine formula (in kilometers)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the minimum distance from a point to a route
 */
export function getMinDistanceToRoute(
  pointLat: number,
  pointLon: number,
  route: GPXPoint[]
): number {
  let minDistance = Infinity;

  route.forEach((routePoint) => {
    const distance = calculateDistance(pointLat, pointLon, routePoint.lat, routePoint.lon);
    if (distance < minDistance) {
      minDistance = distance;
    }
  });

  return minDistance;
}

/**
 * Find the distance along the route to the closest point to a given location
 */
export function getDistanceAlongRoute(
  pointLat: number,
  pointLon: number,
  route: GPXPoint[]
): number {
  let minDistance = Infinity;
  let closestIndex = 0;

  // Find the closest point on the route
  route.forEach((routePoint, index) => {
    const distance = calculateDistance(pointLat, pointLon, routePoint.lat, routePoint.lon);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  // Calculate cumulative distance from start to the closest point
  let cumulativeDistance = 0;
  for (let i = 0; i < closestIndex; i++) {
    const point1 = route[i];
    const point2 = route[i + 1];
    cumulativeDistance += calculateDistance(point1.lat, point1.lon, point2.lat, point2.lon);
  }

  return cumulativeDistance;
}
