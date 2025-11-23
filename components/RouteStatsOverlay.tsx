import { View, Text } from 'react-native';
import type { GPXRoute } from '@/store/store';
import { calculateRouteDistance, calculateElevationGain } from '@/utils/routeGenerator';

interface RouteStatsOverlayProps {
  originalRoute: GPXRoute;
  modifiedRoute: GPXRoute | null;
  showModifiedRoute: boolean;
}

export default function RouteStatsOverlay({
  originalRoute,
  modifiedRoute,
  showModifiedRoute,
}: RouteStatsOverlayProps) {
  const originalDistance = calculateRouteDistance(originalRoute);
  const originalElevation = calculateElevationGain(originalRoute);

  const displayRoute = showModifiedRoute && modifiedRoute ? modifiedRoute : originalRoute;
  const displayDistance = calculateRouteDistance(displayRoute);
  const displayElevation = calculateElevationGain(displayRoute);

  const addedDistance = displayDistance - originalDistance;
  const addedElevation = displayElevation - originalElevation;

  const hasElevationData = originalRoute.points.some((p) => p.ele !== undefined);

  return (
    <View
      className="rounded-lg bg-white shadow-lg"
      style={{
        padding: 12,
      }}>
      <Text className="text-base font-semibold text-gray-900">
        {displayDistance.toFixed(1)}km{' '}
        {showModifiedRoute && addedDistance > 0 && (
          <Text className="text-sm font-medium text-green-600">
            (+{addedDistance.toFixed(1)}km)
          </Text>
        )}
      </Text>

      {hasElevationData && (
        <Text className="mt-1 text-base font-semibold text-gray-900">
          {displayElevation.toFixed(0)}hm{' '}
          {showModifiedRoute && addedElevation > 0 && (
            <Text className="text-sm font-medium text-green-600">
              (+{addedElevation.toFixed(0)}m)
            </Text>
          )}
        </Text>
      )}
    </View>
  );
}

