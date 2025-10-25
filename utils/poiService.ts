import { GPXPoint, POI, POIType } from '@/store/store';
import { getMinDistanceToRoute, getDistanceAlongRoute } from './gpxParser';

/**
 * Fetch POIs from OpenStreetMap Overpass API
 */
export async function fetchPOIsAlongRoute(
  route: GPXPoint[],
  poiTypes: POIType[],
  maxDeviation: number
): Promise<POI[]> {
  if (route.length === 0) return [];

  // Get enabled POI types
  const enabledTypes = poiTypes.filter((t) => t.enabled);
  if (enabledTypes.length === 0) return [];

  // Calculate bounding box with buffer
  const lats = route.map((p) => p.lat);
  const lons = route.map((p) => p.lon);
  const minLat = Math.min(...lats) - maxDeviation / 111; // rough km to degrees
  const maxLat = Math.max(...lats) + maxDeviation / 111;
  const minLon = Math.min(...lons) - maxDeviation / 111;
  const maxLon = Math.max(...lons) + maxDeviation / 111;

  // Build Overpass query
  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
  let query = '[out:json][timeout:25];(\n';

  enabledTypes.forEach((poiType) => {
    poiType.osmTags.forEach((tag) => {
      const [key, value] = tag.split('=');
      query += `  node["${key}"="${value}"](${bbox});\n`;
      query += `  way["${key}"="${value}"](${bbox});\n`;
    });
  });

  query += ');\nout center;';

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Process results
    const pois: POI[] = [];
    const processedIds = new Set<string>();

    data.elements?.forEach((element: any) => {
      // Skip duplicates
      if (processedIds.has(element.id.toString())) return;
      processedIds.add(element.id.toString());

      let lat: number, lon: number;

      // Get coordinates
      if (element.type === 'node') {
        lat = element.lat;
        lon = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else {
        return; // Skip if no coordinates
      }

      // Calculate distance to route
      const distanceFromRoute = getMinDistanceToRoute(lat, lon, route);

      // Filter by max deviation
      if (distanceFromRoute > maxDeviation) return;

      // Calculate distance along route
      const distanceAlongRoute = getDistanceAlongRoute(lat, lon, route);

      // Determine POI type
      let poiTypeLabel = 'Unknown';
      for (const poiType of enabledTypes) {
        for (const tag of poiType.osmTags) {
          const [key, value] = tag.split('=');
          if (element.tags?.[key] === value) {
            poiTypeLabel = poiType.label;
            break;
          }
        }
        if (poiTypeLabel !== 'Unknown') break;
      }

      // Get name
      const name =
        element.tags?.name ||
        element.tags?.['name:en'] ||
        element.tags?.operator ||
        `${poiTypeLabel} #${element.id}`;

      pois.push({
        id: element.id.toString(),
        name,
        type: poiTypeLabel,
        lat,
        lon,
        selected: false,
        distanceFromRoute,
        distanceAlongRoute,
      });
    });

    // Sort by distance along route (chronological order)
    pois.sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);

    return pois;
  } catch (error) {
    console.error('Error fetching POIs:', error);
    throw error;
  }
}
