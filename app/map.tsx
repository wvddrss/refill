import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { useState, useEffect, useRef, useMemo } from 'react';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { cacheDirectory, documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Button } from '@/components/Button';
import { useStore } from '@/store/store';
import { fetchPOIsAlongRoute } from '@/utils/poiService';
import { generateRouteWithPOIs, calculateRouteDistance } from '@/utils/routeGenerator';
import { generateGPX } from '@/utils/gpxParser';

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const {
    originalRoute,
    modifiedRoute,
    poiTypes,
    maxDeviation,
    pois,
    setPOIs,
    togglePOI,
    setModifiedRoute,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [loadingPOIs, setLoadingPOIs] = useState(true);
  const [showModifiedRoute, setShowModifiedRoute] = useState(false);

  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  useEffect(() => {
    if (!originalRoute) {
      Alert.alert('Error', 'No route loaded', [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }

    loadPOIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPOIs = async () => {
    if (!originalRoute) return;

    try {
      setLoadingPOIs(true);
      const fetchedPOIs = await fetchPOIsAlongRoute(originalRoute.points, poiTypes, maxDeviation);
      setPOIs(fetchedPOIs);
      setLoadingPOIs(false);

      // Fit map to route
      if (mapRef.current && originalRoute.points.length > 0) {
        const coordinates = originalRoute.points.map((p) => ({
          latitude: p.lat,
          longitude: p.lon,
        }));
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Error loading POIs:', error);
      Alert.alert(
        'Error',
        'Failed to load POIs. Please check your internet connection and try again.'
      );
      setLoadingPOIs(false);
    }
  };

  const handleGenerateRoute = () => {
    if (!originalRoute) return;

    const selectedCount = pois.filter((p) => p.selected).length;
    if (selectedCount === 0) {
      Alert.alert('Notice', 'Please select at least one POI to generate a new route.');
      return;
    }

    setLoading(true);

    try {
      const newRoute = generateRouteWithPOIs(originalRoute, pois);
      setModifiedRoute(newRoute);
      setShowModifiedRoute(true);

      const originalDistance = calculateRouteDistance(originalRoute);
      const newDistance = calculateRouteDistance(newRoute);
      const additionalDistance = newDistance - originalDistance;

      Alert.alert(
        'Route Generated',
        `New route created with ${selectedCount} stops.\n\n` +
          `Original: ${originalDistance.toFixed(1)} km\n` +
          `New: ${newDistance.toFixed(1)} km\n` +
          `Additional: ${additionalDistance.toFixed(1)} km`
      );
    } catch (error) {
      console.error('Error generating route:', error);
      Alert.alert('Error', 'Failed to generate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportGPX = async () => {
    const routeToExport = showModifiedRoute && modifiedRoute ? modifiedRoute : originalRoute;

    if (!routeToExport) {
      Alert.alert('Error', 'No route to export');
      return;
    }

    try {
      setLoading(true);

      const gpxContent = generateGPX(routeToExport);
      const fileName = `refuel_route_${Date.now()}.gpx`;

      // Get cache directory
      const cacheDir = cacheDirectory || documentDirectory || '';
      const fileUri = `${cacheDir}${fileName}`;

      await writeAsStringAsync(fileUri, gpxContent);

      // Share the file
      await Share.share({
        url: fileUri,
        message: 'Here is my Refuel route',
      });

      Alert.alert('Success', `Route exported as ${fileName}`);
    } catch (error) {
      console.error('Error exporting GPX:', error);
      Alert.alert('Error', 'Failed to export GPX. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayRoute = showModifiedRoute && modifiedRoute ? modifiedRoute : originalRoute;

  if (!originalRoute) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1">
        <Stack.Screen options={{ title: 'Route Map' }} />

        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: originalRoute.points[0].lat,
            longitude: originalRoute.points[0].lon,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
          loadingEnabled={true}
          loadingIndicatorColor="#2563eb"
          loadingBackgroundColor="#f9fafb">
          {/* Original Route */}
          {!showModifiedRoute && originalRoute && (
            <Polyline
              coordinates={originalRoute.points.map((p) => ({
                latitude: p.lat,
                longitude: p.lon,
              }))}
              strokeColor="#2563eb"
              strokeWidth={3}
            />
          )}

          {/* Modified Route */}
          {showModifiedRoute && modifiedRoute && (
            <Polyline
              coordinates={modifiedRoute.points.map((p) => ({
                latitude: p.lat,
                longitude: p.lon,
              }))}
              strokeColor="#16a34a"
              strokeWidth={3}
            />
          )}

          {/* POI Markers */}
          {pois.map((poi) => (
            <Marker
              key={poi.id}
              coordinate={{ latitude: poi.lat, longitude: poi.lon }}
              title={poi.name}
              description={`${poi.type} • At ${poi.distanceAlongRoute.toFixed(1)}km • ${poi.distanceFromRoute.toFixed(1)}km off route`}
              pinColor={poi.selected ? '#16a34a' : '#ef4444'}
              onPress={() => togglePOI(poi.id)}
            />
          ))}

          {/* Start Marker */}
          {displayRoute && displayRoute.points.length > 0 && (
            <Marker
              coordinate={{
                latitude: displayRoute.points[0].lat,
                longitude: displayRoute.points[0].lon,
              }}
              title="Start"
              pinColor="#10b981"
            />
          )}

          {/* End Marker */}
          {displayRoute && displayRoute.points.length > 1 && (
            <Marker
              coordinate={{
                latitude: displayRoute.points[displayRoute.points.length - 1].lat,
                longitude: displayRoute.points[displayRoute.points.length - 1].lon,
              }}
              title="End"
              pinColor="#ef4444"
            />
          )}
        </MapView>

        <BottomSheet ref={bottomSheetRef} index={1} snapPoints={snapPoints}>
          <BottomSheetScrollView className="flex-1 px-4">
            <View className="mb-4">
              <Text className="mb-2 text-xl font-bold text-gray-900">
                Points of Interest ({pois.length})
              </Text>
              {loadingPOIs ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text className="mt-4 text-gray-600">Loading POIs...</Text>
                </View>
              ) : pois.length === 0 ? (
                <View className="rounded-lg bg-yellow-50 p-4 py-8">
                  <Text className="text-center text-gray-700">
                    No POIs found within {maxDeviation}km of your route. Try increasing the maximum
                    deviation.
                  </Text>
                </View>
              ) : (
                <>
                  <Text className="mb-4 text-sm text-gray-600">
                    {pois.filter((p) => p.selected).length} selected • Tap markers on map or check
                    boxes below
                  </Text>

                  {pois.map((poi) => (
                    <TouchableOpacity
                      key={poi.id}
                      className={
                        poi.selected
                          ? 'mb-2 flex-row items-center rounded-lg border border-green-500 bg-green-50 p-3'
                          : 'mb-2 flex-row items-center rounded-lg border border-gray-200 bg-white p-3'
                      }
                      onPress={() => togglePOI(poi.id)}>
                      <View
                        className={
                          poi.selected
                            ? 'mr-3 h-5 w-5 items-center justify-center rounded border-2 border-green-500 bg-green-500'
                            : 'mr-3 h-5 w-5 items-center justify-center rounded border-2 border-gray-300 bg-white'
                        }>
                        {poi.selected && <Text className="text-xs font-bold text-white">✓</Text>}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={
                            poi.selected ? 'font-semibold text-gray-900' : 'text-gray-900'
                          }>
                          {poi.name}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {poi.type} • At {poi.distanceAlongRoute.toFixed(1)}km •{' '}
                          {poi.distanceFromRoute.toFixed(1)}km off route
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>

            <View className="mb-4 gap-3">
              {pois.filter((p) => p.selected).length > 0 && (
                <>
                  <Button
                    title={
                      loading
                        ? 'Generating...'
                        : showModifiedRoute
                          ? '✓ Route Generated'
                          : '🗺️ Generate New Route'
                    }
                    onPress={handleGenerateRoute}
                    disabled={loading}
                  />
                  {showModifiedRoute && (
                    <Button
                      title="👁️ Show Original Route"
                      onPress={() => setShowModifiedRoute(false)}
                    />
                  )}
                </>
              )}

              <Button
                title={loading ? 'Exporting...' : '💾 Export GPX'}
                onPress={handleExportGPX}
                disabled={loading}
              />

              <View className="h-8" />
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}
