import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GPXRoute, POI } from '@/store/store';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapClientProps {
  originalRoute: GPXRoute;
  modifiedRoute: GPXRoute | null;
  showModifiedRoute: boolean;
  pois: POI[];
  onTogglePOI: (id: string) => void;
}

export default function LeafletMapClient({
  originalRoute,
  modifiedRoute,
  showModifiedRoute,
  pois,
  onTogglePOI,
}: LeafletMapClientProps) {
  const mapCenter = [originalRoute.points[0].lat, originalRoute.points[0].lon] as [number, number];
  const displayRoute = showModifiedRoute && modifiedRoute ? modifiedRoute : originalRoute;

  // Create custom icons for POIs
  const createPOIIcon = (isSelected: boolean) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${isSelected ? '#16a34a' : '#ef4444'}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12],
    });
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Original Route */}
      {!showModifiedRoute && originalRoute && (
        <Polyline
          positions={originalRoute.points.map((p) => [p.lat, p.lon])}
          color="#2563eb"
          weight={3}
        />
      )}

      {/* Modified Route */}
      {showModifiedRoute && modifiedRoute && (
        <Polyline
          positions={modifiedRoute.points.map((p) => [p.lat, p.lon])}
          color="#16a34a"
          weight={3}
        />
      )}

      {/* POI Markers */}
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.lat, poi.lon]}
          icon={createPOIIcon(poi.selected)}
          eventHandlers={{
            click: () => onTogglePOI(poi.id),
          }}>
          <Popup>
            <div>
              <strong>{poi.name}</strong>
              <br />
              {poi.type} • At {poi.distanceAlongRoute.toFixed(1)}km •{' '}
              {poi.distanceFromRoute.toFixed(1)}km off route
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Start Marker */}
      {displayRoute && displayRoute.points.length > 0 && (
        <Marker position={[displayRoute.points[0].lat, displayRoute.points[0].lon]}>
          <Popup>Start</Popup>
        </Marker>
      )}

      {/* End Marker */}
      {displayRoute && displayRoute.points.length > 1 && (
        <Marker
          position={[
            displayRoute.points[displayRoute.points.length - 1].lat,
            displayRoute.points[displayRoute.points.length - 1].lon,
          ]}>
          <Popup>End</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

