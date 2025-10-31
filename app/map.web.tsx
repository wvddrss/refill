import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Download, Route as RouteIcon, Eye } from 'lucide-react-native';
import LeafletMap from '@/components/LeafletMap';
import { useStore } from '@/store/store';
import { fetchPOIsAlongRoute } from '@/utils/poiService';
import { generateRouteWithPOIs, calculateRouteDistance } from '@/utils/routeGenerator';
import { generateGPX } from '@/utils/gpxParser';

export default function MapScreen() {
  const router = useRouter();

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

      // Create blob and download for web
      const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Alert.alert('Success', `Route exported as ${fileName}`);
    } catch (error) {
      console.error('Error exporting GPX:', error);
      Alert.alert('Error', 'Failed to export GPX. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!originalRoute) {
    return null;
  }

  const renderHeaderRight = () => {
    return (
      <View className="hidden flex-row gap-2 pr-4 md:flex">
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

      {/* Tablet/Desktop: Side-by-side layout with max-width container */}
      <div className="mx-auto hidden h-full w-full max-w-screen-xl gap-4 py-4 flex-row md:flex">
        {/* Map Section - Left Side */}
        <div className="flex-1 overflow-hidden rounded-lg">
          <LeafletMap
            originalRoute={originalRoute}
            modifiedRoute={modifiedRoute}
            showModifiedRoute={showModifiedRoute}
            pois={pois}
            onTogglePOI={togglePOI}
          />
        </div>

        {/* POI List Section - Right Side */}
        <div className="flex-1 overflow-y-auto overflow-hidden rounded-lg bg-white" style={{ padding: '16px' }}>
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
        </div>
      </div>

      {/* Mobile: Single scrollable container with map at top */}
      <div className="h-full md:hidden" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Map Section - Takes half screen initially but scrolls away */}
        <div style={{ height: '50vh', width: '100%' }}>
          <LeafletMap
            originalRoute={originalRoute}
            modifiedRoute={modifiedRoute}
            showModifiedRoute={showModifiedRoute}
            pois={pois}
            onTogglePOI={togglePOI}
          />
        </div>

        {/* POI List Section */}
        <div style={{ backgroundColor: 'white', padding: '16px', minHeight: '50vh' }}>
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
          {/* Extra padding at bottom to ensure content isn't hidden behind FABs */}
          <View style={{ height: 160 }} />
        </div>
      </div>

      {/* Floating Action Buttons - Mobile Only */}
      <div className="md:hidden" style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1000 }}>
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
      </div>
    </View>
  );
}
