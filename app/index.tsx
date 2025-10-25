import { Stack, useRouter } from 'expo-router';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { useStore } from '@/store/store';
import { parseGPX } from '@/utils/gpxParser';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { setOriginalRoute, gpxFileName, reset } = useStore();

  const handleSelectGPX = async () => {
    try {
      setLoading(true);

      // Open document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];

      // Read file content
      const content = await readAsStringAsync(file.uri);

      // Parse GPX
      const route = parseGPX(content);

      if (!route.points || route.points.length === 0) {
        Alert.alert('Error', 'No valid route found in GPX file');
        setLoading(false);
        return;
      }

      // Save to store
      setOriginalRoute(route, file.name);

      setLoading(false);

      // Navigate to POI selection
      router.push('/poi-selection');
    } catch (error) {
      console.error('Error loading GPX:', error);
      Alert.alert('Error', 'Failed to load GPX file. Please try again.');
      setLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    Alert.alert('Success', 'App data has been reset');
  };

  return (
    <View className="flex flex-1 bg-gray-50">
      <Stack.Screen options={{ title: 'Refuel' }} />
      <Container>
        <View className="flex-1 justify-center px-4">
          <View className="mb-8 items-center">
            <Text className="mb-2 text-4xl font-bold text-gray-900">🗺️ Refuel</Text>
            <Text className="text-center text-lg text-gray-600">
              Plan your route with essential stops
            </Text>
          </View>

          <View className="mb-8 rounded-lg bg-blue-50 p-4">
            <Text className="text-center leading-6 text-gray-700">
              Load a GPX file to find water supplies, stores, and restaurants along your route.
            </Text>
          </View>

          {gpxFileName && (
            <View className="mb-8 rounded-lg bg-green-50 p-4">
              <Text className="mb-1 text-sm text-gray-600">Current GPX:</Text>
              <Text className="text-base font-semibold text-green-700">{gpxFileName}</Text>
            </View>
          )}

          <View className="gap-3">
            {loading ? (
              <ActivityIndicator size="large" color="#2563eb" />
            ) : (
              <>
                <Button title="📁 Load GPX File" onPress={handleSelectGPX} />
                {gpxFileName && (
                  <>
                    <View style={{ height: 12 }} />
                    <Button title="Continue" onPress={() => router.push('/poi-selection')} />
                    <View style={{ height: 12 }} />
                    <Button title="Reset" onPress={handleReset} />
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Container>
    </View>
  );
}
