import { Stack, useRouter } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import Slider from '@react-native-community/slider';
import {
  Droplets,
  Store,
  UtensilsCrossed,
  Sliders as SlidersIcon,
  ArrowRight,
} from 'lucide-react-native';
import { useStore } from '@/store/store';

const POI_ICONS = {
  water: Droplets,
  store: Store,
  food: UtensilsCrossed,
};

export default function POISelection() {
  const router = useRouter();
  const { poiTypes, maxDeviation, togglePOIType, setMaxDeviation, originalRoute } = useStore();
  const [radius, setRadius] = useState(maxDeviation);

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
    setMaxDeviation(radius);

    // Navigate to map
    router.push('/map');
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ title: 'Find Along The Way', headerBackTitle: 'Back' }} />

      <ScrollView className="flex-1">
        <View className="mx-auto w-full px-4" style={{ maxWidth: 480 }}>
        {/* Header Info */}
        <View className="mt-4 rounded-xl bg-blue-50 p-4">
          <Text className="text-center text-sm leading-6 text-blue-700">
            Select what you want to find along your route
          </Text>
        </View>

        {/* Amenities Selection */}
        <View className="mt-4 rounded-xl bg-gray-50 p-4">
          <Text className="mb-3 font-medium text-gray-700">Find Along the Way</Text>

          {poiTypes.map((poiType) => {
            const IconComponent = POI_ICONS[poiType.id as keyof typeof POI_ICONS];
            return (
              <TouchableOpacity
                key={poiType.id}
                className="flex-row items-center border-b border-gray-200 py-3"
                onPress={() => togglePOIType(poiType.id)}>
                <View
                  className={`h-5 w-5 items-center justify-center rounded border ${
                    poiType.enabled ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                  }`}>
                  {poiType.enabled && <Text className="text-xs text-white">✓</Text>}
                </View>
                <IconComponent
                  size={20}
                  color="#3b82f6"
                  strokeWidth={2}
                  style={{ marginLeft: 12 }}
                />
                <Text className="ml-2 flex-1 text-gray-600">{poiType.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Radius Selector */}
        <View className="mt-4 rounded-xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-medium text-gray-700">Search Radius</Text>
            <View className="flex-row items-center">
              <Text className="font-bold text-blue-500">{radius.toFixed(1)}</Text>
              <Text className="ml-1 text-gray-500">km</Text>
            </View>
          </View>
          <View className="mt-2 flex-row items-center">
            <SlidersIcon size={20} color="#60a5fa" strokeWidth={2} style={{ marginRight: 8 }} />
            <View className="flex-1">
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={1}
                maximumValue={20}
                value={radius}
                onValueChange={setRadius}
                minimumTrackTintColor="#3b82f6"
                maximumTrackTintColor="#dbeafe"
                thumbTintColor="#3b82f6"
                step={0.5}
              />
            </View>
          </View>
          <Text className="mt-1 text-xs text-gray-500">
            Adjust how far from your route to search for stops
          </Text>
        </View>

        {/* Action Button */}
        <View className="my-6">
          <TouchableOpacity
            className="flex-row items-center justify-center rounded-xl bg-blue-500 py-4"
            activeOpacity={0.7}
            onPress={handleNext}>
            <Text className="font-semibold text-white">Find Points of Interest</Text>
            <ArrowRight size={20} color="#ffffff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}
