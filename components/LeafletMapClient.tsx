import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GPXRoute, POI } from '@/store/store';
import RouteStatsOverlay from './RouteStatsOverlay';

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

  // Map POI type to icon
  const getIconForPOIType = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('water')) return '💧';
    if (lowerType.includes('store') || lowerType.includes('shop')) return '🛒';
    if (lowerType.includes('food') || lowerType.includes('resto') || lowerType.includes('restaurant') || lowerType.includes('cafe')) return '🍽️';
    return '📍';
  };

  // Create custom icons for POIs
  const createPOIIcon = (poi: POI) => {
    const icon = getIconForPOIType(poi.type);
    const bgColor = poi.selected ? '#16a34a' : '#ef4444';
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="
        background-color: ${bgColor}; 
        width: 32px; 
        height: 32px; 
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        position: relative;
      ">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">${icon}</div>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
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
            key={`original-${originalRoute.points.length}`}
            positions={originalRoute.points.map((p) => [p.lat, p.lon])}
            color="#2563eb"
            weight={3}
          />
        )}

        {/* Modified Route */}
        {showModifiedRoute && modifiedRoute && (
          <Polyline
            key={`modified-${modifiedRoute.points.length}`}
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
            icon={createPOIIcon(poi)}>
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <strong>{poi.name}</strong>
                <br />
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {poi.type} • At {poi.distanceAlongRoute.toFixed(1)}km •{' '}
                  {poi.distanceFromRoute.toFixed(1)}km off route
                </span>
                <br />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePOI(poi.id);
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    backgroundColor: poi.selected ? '#ef4444' : '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    width: '100%',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}>
                  {poi.selected ? '✓ Remove' : '+ Add to Route'}
                </button>
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

      {/* Route Stats Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
        <RouteStatsOverlay
          originalRoute={originalRoute}
          modifiedRoute={modifiedRoute}
          showModifiedRoute={showModifiedRoute}
        />
      </div>
    </div>
  );
}

