import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Share, ScrollView, Dimensions, useWindowDimensions } from 'react-native';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import MapView, { Polyline, Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { cacheDirectory, documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import { Download, Eye } from 'lucide-react-native';
import { useStore, POI } from '@/store/store';
import { fetchPOIsAlongRoute } from '@/utils/poiService';
import { generateRouteWithPOIs, calculateRouteDistance } from '@/utils/routeGenerator';
import { generateGPX } from '@/utils/gpxParser';
import RouteStatsOverlay from '@/components/RouteStatsOverlay';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TABLET_BREAKPOINT = 768;

// Get icon for POI type
const getIconForPOIType = (type: string): string => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('water')) return '💧';
  if (lowerType.includes('store') || lowerType.includes('shop')) return '🛒';
  if (lowerType.includes('food') || lowerType.includes('resto') || lowerType.includes('restaurant') || lowerType.includes('cafe')) return '🍽️';
  return '📍';
};

// Custom marker component for POIs
const POIMarker = ({ poi, onToggle }: { poi: POI; onToggle: () => void }) => {
  const markerRef = useRef<any>(null);
  const icon = getIconForPOIType(poi.type);
  const bgColor = poi.selected ? '#16a34a' : '#9ca3af';

  const handleToggle = () => {
    markerRef.current?.hideCallout();
    onToggle();
  };

  return (
    <Marker ref={markerRef} coordinate={{ latitude: poi.lat, longitude: poi.lon }}>
      <View
        style={{
          backgroundColor: bgColor,
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 3,
          borderColor: 'white',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 3,
          elevation: 5,
        }}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <Callout onPress={handleToggle}>
        <View style={{ minWidth: 200, padding: 8 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
            {poi.name}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            {poi.type} • At {poi.distanceAlongRoute.toFixed(1)}km •{' '}
            {poi.distanceFromRoute.toFixed(1)}km off route
          </Text>
          <View
            style={{
              backgroundColor: poi.selected ? '#9ca3af' : '#16a34a',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 4,
              alignItems: 'center',
            }}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
              {poi.selected ? '✓ Remove' : '+ Add to Route'}
            </Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
};

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
  const [lastGeneratedCount, setLastGeneratedCount] = useState(0);

  const selectedPOICount = useMemo(() => pois.filter((p) => p.selected).length, [pois]);

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

  const handleGenerateRoute = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!originalRoute) return;

      const selectedCount = selectedPOICount;
      if (selectedCount === 0) {
        Alert.alert('Notice', 'Please select at least one POI to generate a new route.');
        return;
      }

      setLoading(true);

      try {
        const newRoute = await generateRouteWithPOIs(originalRoute, pois);
        setModifiedRoute(newRoute);
        setShowModifiedRoute(true);
        setLastGeneratedCount(selectedCount);

        const originalDistance = calculateRouteDistance(originalRoute);
        const newDistance = calculateRouteDistance(newRoute);
        const additionalDistance = newDistance - originalDistance;

        if (!silent) {
          Alert.alert(
            'Route Generated',
            `New route created with ${selectedCount} stops.\n\n` +
              `Original: ${originalDistance.toFixed(1)} km\n` +
              `New: ${newDistance.toFixed(1)} km\n` +
              `Additional: ${additionalDistance.toFixed(1)} km`
          );
        }
      } catch (error) {
        console.error('Error generating route:', error);
        Alert.alert('Error', 'Failed to generate route. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [originalRoute, pois, selectedPOICount, setModifiedRoute, setShowModifiedRoute]
  );

  useEffect(() => {
    if (!originalRoute) return;

    if (selectedPOICount === 0) {
      if (lastGeneratedCount !== 0) {
        setLastGeneratedCount(0);
      }
      return;
    }

    if (loading) return;
    if (selectedPOICount === lastGeneratedCount) return;

    handleGenerateRoute({ silent: true }).catch((error) =>
      console.error('Auto route generation failed', error)
    );
  }, [
    originalRoute,
    selectedPOICount,
    lastGeneratedCount,
    loading,
    handleGenerateRoute,
  ]);

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
        {showModifiedRoute && (
          <TouchableOpacity
            className="flex-row items-center justify-center rounded-lg bg-gray-100 px-4 py-2"
            activeOpacity={0.7}
            onPress={() => setShowModifiedRoute(false)}>
            <Eye size={16} color="#6b7280" style={{ marginRight: 6 }} />
            <Text className="text-sm font-medium text-gray-600">Original</Text>
          </TouchableOpacity>
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
                {originalRoute && (
                  <Polyline
                    key={`original-${originalRoute.points.length}-${showModifiedRoute ? 'dim' : 'full'}`}
                    coordinates={originalRoute.points.map((p) => ({
                      latitude: p.lat,
                      longitude: p.lon,
                    }))}
                    strokeColor="#2563eb"
                    strokeWidth={3}
                    zIndex={showModifiedRoute ? 1 : 2}
                    lineDashPattern={showModifiedRoute ? [8, 8] : undefined}
                  />
                )}

                {/* Modified Route */}
                {modifiedRoute && (
                  <Polyline
                    key={`modified-${modifiedRoute.points.length}-${showModifiedRoute ? 'full' : 'dim'}`}
                    coordinates={modifiedRoute.points.map((p) => ({
                      latitude: p.lat,
                      longitude: p.lon,
                    }))}
                    strokeColor="#16a34a"
                    strokeWidth={showModifiedRoute ? 5 : 2}
                    zIndex={showModifiedRoute ? 3 : 1}
                  />
                )}

              {/* POI Markers */}
              {pois.map((poi) => (
                <POIMarker key={poi.id} poi={poi} onToggle={() => togglePOI(poi.id)} />
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

            {/* Route Stats Overlay */}
            <View
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                zIndex: 1000,
              }}>
              <RouteStatsOverlay
                originalRoute={originalRoute}
                modifiedRoute={modifiedRoute}
                showModifiedRoute={showModifiedRoute}
              />
            </View>
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
                {originalRoute && (
                  <Polyline
                    key={`original-${originalRoute.points.length}-${showModifiedRoute ? 'dim' : 'full'}`}
                    coordinates={originalRoute.points.map((p) => ({
                      latitude: p.lat,
                      longitude: p.lon,
                    }))}
                    strokeColor="#2563eb"
                    strokeWidth={3}
                    zIndex={showModifiedRoute ? 1 : 2}
                    lineDashPattern={showModifiedRoute ? [8, 8] : undefined}
                  />
                )}

                {/* Modified Route */}
                {modifiedRoute && (
                  <Polyline
                    key={`modified-${modifiedRoute.points.length}-${showModifiedRoute ? 'full' : 'dim'}`}
                    coordinates={modifiedRoute.points.map((p) => ({
                      latitude: p.lat,
                      longitude: p.lon,
                    }))}
                    strokeColor="#16a34a"
                    strokeWidth={showModifiedRoute ? 5 : 2}
                    zIndex={showModifiedRoute ? 3 : 1}
                  />
                )}

                {/* POI Markers */}
                {pois.map((poi) => (
                  <POIMarker key={poi.id} poi={poi} onToggle={() => togglePOI(poi.id)} />
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

              {/* Route Stats Overlay */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  zIndex: 1000,
                }}>
                <RouteStatsOverlay
                  originalRoute={originalRoute}
                  modifiedRoute={modifiedRoute}
                  showModifiedRoute={showModifiedRoute}
                />
              </View>
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
            {showModifiedRoute ? (
              <TouchableOpacity
                className="flex-row items-center justify-center rounded-full bg-white px-6 py-3 shadow-lg"
                activeOpacity={0.7}
                onPress={() => setShowModifiedRoute(false)}>
                <Eye size={18} color="#6b7280" style={{ marginRight: 8 }} />
                <Text className="font-medium text-gray-600">Show Original</Text>
              </TouchableOpacity>
            ): (
              <TouchableOpacity
                className="flex-row items-center justify-center rounded-full bg-white px-6 py-3 shadow-lg"
                activeOpacity={0.7}
                onPress={() => setShowModifiedRoute(true)}>
                <Eye size={18} color="#6b7280" style={{ marginRight: 8 }} />
                <Text className="font-medium text-gray-600">Show Modified</Text>
              </TouchableOpacity>
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
