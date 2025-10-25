import { Stack, useRouter } from 'expo-router';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { useStore } from '@/store/store';

export default function POISelection() {
  const router = useRouter();
  const { poiTypes, maxDeviation, togglePOIType, setMaxDeviation, originalRoute } = useStore();
  const [deviationInput, setDeviationInput] = useState(maxDeviation.toString());

  const handleNext = () => {
    if (!originalRoute) {
      Alert.alert('Error', 'No route loaded. Please go back and load a GPX file.');
      return;
    }

    const enabledCount = poiTypes.filter((p) => p.enabled).length;
    if (enabledCount === 0) {
      Alert.alert('Notice', 'No POI types selected. Please select at least one type.');
      return;
    }

    // Update max deviation
    const deviation = parseFloat(deviationInput);
    if (isNaN(deviation) || deviation <= 0) {
      Alert.alert('Error', 'Please enter a valid deviation distance (greater than 0).');
      return;
    }
    setMaxDeviation(deviation);

    // Navigate to map
    router.push('/map');
  };

  return (
    <View className="flex flex-1 bg-gray-50">
      <Stack.Screen options={{ title: 'Find Along The Way' }} />
      <Container>
        <ScrollView className="flex-1">
          <View className="flex-1 p-6">
            <Text className="mb-2 text-2xl font-bold text-gray-900">What do you want to find?</Text>
            <Text className="mb-6 text-base text-gray-600">Select the types of stops you need</Text>

            <View className="mb-8">
              {poiTypes.map((poiType) => (
                <TouchableOpacity
                  key={poiType.id}
                  className={
                    poiType.enabled
                      ? 'mb-3 flex-row items-center rounded-lg border-2 border-blue-500 bg-blue-50 p-4 active:bg-blue-100'
                      : 'mb-3 flex-row items-center rounded-lg border border-gray-200 bg-white p-4 active:bg-gray-50'
                  }
                  onPress={() => togglePOIType(poiType.id)}>
                  <View className="mr-3 h-6 w-6 items-center justify-center rounded border-2 border-gray-300 bg-white">
                    {poiType.enabled && <Text className="text-lg font-bold text-blue-600">✓</Text>}
                  </View>
                  <Text
                    className={
                      poiType.enabled
                        ? 'flex-1 text-base font-semibold text-gray-900'
                        : 'flex-1 text-base text-gray-700'
                    }>
                    {poiType.label}
                  </Text>
                  {poiType.id === 'water' && (
                    <View className="rounded bg-orange-500 px-2 py-1">
                      <Text className="text-xs font-semibold text-white">Important</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View className="mb-8">
              <Text className="mb-2 text-lg font-semibold text-gray-900">Maximum Deviation</Text>
              <Text className="mb-4 text-sm text-gray-600">
                How far from your route should we search?
              </Text>

              <View className="flex-row items-center rounded-lg border border-gray-300 bg-white p-4">
                <TextInput
                  className="flex-1 text-lg"
                  value={deviationInput}
                  onChangeText={setDeviationInput}
                  keyboardType="numeric"
                  placeholder="5"
                />
                <Text className="ml-2 text-lg text-gray-600">km</Text>
              </View>
            </View>

            <View className="mb-8">
              <Button title="Next" onPress={handleNext} />
            </View>
          </View>
        </ScrollView>
      </Container>
    </View>
  );
}
