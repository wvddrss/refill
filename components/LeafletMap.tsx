import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import type { GPXRoute, POI } from '@/store/store';

interface LeafletMapProps {
  originalRoute: GPXRoute;
  modifiedRoute: GPXRoute | null;
  showModifiedRoute: boolean;
  pois: POI[];
  onTogglePOI: (id: string) => void;
}

export default function LeafletMap({
  originalRoute,
  modifiedRoute,
  showModifiedRoute,
  pois,
  onTogglePOI,
}: LeafletMapProps) {
  const [Map, setMap] = useState<any>(null);

  useEffect(() => {
    // Only load on client side
    if (typeof window !== 'undefined') {
      import('./LeafletMapClient').then((mod) => {
        setMap(() => mod.default);
      });
    }
  }, []);

  if (!Map) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: '#6b7280' }}>Loading map...</Text>
      </View>
    );
  }

  return (
    <Map
      originalRoute={originalRoute}
      modifiedRoute={modifiedRoute}
      showModifiedRoute={showModifiedRoute}
      pois={pois}
      onTogglePOI={onTogglePOI}
    />
  );
}

