import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Share, ScrollView, Dimensions, useWindowDimensions } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { cacheDirectory, documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import { Download, Route as RouteIcon, Eye } from 'lucide-react-native';
import { useStore } from '@/store/store';
import { fetchPOIsAlongRoute } from '@/utils/poiService';
import { generateRouteWithPOIs, calculateRouteDistance } from '@/utils/routeGenerator';
import { generateGPX } from '@/utils/gpxParser';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TABLET_BREAKPOINT = 768;

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { width } = useWindowDimensions();
  const isTabletLandscape = width >= TABLET_BREAKPOINT;

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

  const renderHeaderRight = () => {
    if (!isTabletLandscape) return null;
    
    return (
      <View className="flex-row gap-2 pr-4">
        {pois.filter((p) => p.selected).length > 0 && (
          <>
            <TouchableOpacity
              className={`flex-row items-center justify-center rounded-lg px-4 py-2 ${
                loading ? 'bg-gray-300' : showModifiedRoute ? 'bg-green-500' : 'bg-blue-500'
              }`}
              activeOpacity={0.7}
              onPress={handleGenerateRoute}
              disabled={loading}>
              {!loading && <RouteIcon size={16} color="#ffffff" style={{ marginRight: 6 }} />}
              <Text className="text-sm font-semibold text-white">
                {loading ? 'Generating...' : showModifiedRoute ? 'Regenerate' : 'Generate'}
              </Text>
            </TouchableOpacity>
            {showModifiedRoute && (
              <TouchableOpacity
                className="flex-row items-center justify-center rounded-lg bg-gray-100 px-4 py-2"
                activeOpacity={0.7}
                onPress={() => setShowModifiedRoute(false)}>
                <Eye size={16} color="#6b7280" style={{ marginRight: 6 }} />
                <Text className="text-sm font-medium text-gray-600">Original</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <TouchableOpacity
          className={`flex-row items-center justify-center rounded-lg px-4 py-2 ${
            loading ? 'bg-gray-300' : 'bg-gray-100'
          }`}
          activeOpacity={0.7}
          onPress={handleExportGPX}
          disabled={loading}>
          {!loading && <Download size={16} color="#6b7280" style={{ marginRight: 6 }} />}
          <Text className={`text-sm font-semibold ${loading ? 'text-gray-500' : 'text-gray-600'}`}>
            Export
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <Stack.Screen 
        options={{ 
          title: 'Route Map',
          headerRight: renderHeaderRight,
        }} 
      />

      {isTabletLandscape ? (
        // Tablet Landscape: Side-by-side layout with max-width container
        <View className="mx-auto w-full flex-1 flex-row gap-4 py-4" style={{ maxWidth: 1280 }}>
          {/* Map Section - Left Side */}
          <View className="flex-1 overflow-hidden rounded-lg">
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
          </View>

          {/* POI List Section - Right Side */}
          <ScrollView className="flex-1 overflow-hidden rounded-lg bg-white px-4">
            <View className="mb-4 mt-4">
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
          </ScrollView>
        </View>
      ) : (
        // Mobile: Scrollable layout with map at top
        <>
          <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
            {/* Map Section - Takes half screen initially but scrolls away */}
            <View style={{ height: SCREEN_HEIGHT * 0.5 }}>
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
            </View>

            {/* POI List Section */}
            <View className="bg-white px-4">
              <View className="mb-4 mt-4">
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
              {/* Extra padding at bottom to ensure content isn't hidden behind FABs */}
              <View className="h-40" />
            </View>
          </ScrollView>

          {/* Floating Action Buttons - Mobile Only */}
          <View className="absolute bottom-6 right-6 gap-3">
            {pois.filter((p) => p.selected).length > 0 && (
              <>
                <TouchableOpacity
                  className={`flex-row items-center justify-center rounded-full px-6 py-4 shadow-lg ${
                    loading ? 'bg-gray-300' : showModifiedRoute ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  activeOpacity={0.7}
                  onPress={handleGenerateRoute}
                  disabled={loading}>
                  {!loading && <RouteIcon size={20} color="#ffffff" style={{ marginRight: 8 }} />}
                  <Text className="font-semibold text-white">
                    {loading
                      ? 'Generating...'
                      : showModifiedRoute
                        ? 'Regenerate'
                        : 'Generate Route'}
                  </Text>
                </TouchableOpacity>
                {showModifiedRoute && (
                  <TouchableOpacity
                    className="flex-row items-center justify-center rounded-full bg-white px-6 py-3 shadow-lg"
                    activeOpacity={0.7}
                    onPress={() => setShowModifiedRoute(false)}>
                    <Eye size={18} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text className="font-medium text-gray-600">Show Original</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity
              className={`flex-row items-center justify-center rounded-full px-6 py-3 shadow-lg ${
                loading ? 'bg-gray-300' : 'bg-white'
              }`}
              activeOpacity={0.7}
              onPress={handleExportGPX}
              disabled={loading}>
              {!loading && <Download size={20} color="#6b7280" style={{ marginRight: 8 }} />}
              <Text className={`font-semibold ${loading ? 'text-gray-500' : 'text-gray-600'}`}>
                {loading ? 'Exporting...' : 'Export GPX'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
