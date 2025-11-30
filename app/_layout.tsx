import '../global.css';

import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { useStore } from '@/store/store';
import { parseGPX } from '@/utils/gpxParser';

export default function Layout() {
  const router = useRouter();
  const { setOriginalRoute } = useStore();

  useEffect(() => {
    // Handle initial URL when app is opened with a file
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleFileIntent(initialUrl);
      }
    };

    // Handle URL events when app is already running
    const subscription = Linking.addEventListener('url', async (event) => {
      if (event.url) {
        await handleFileIntent(event.url);
      }
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleFileIntent = async (url: string) => {
    try {
      // Only process file intents, not normal app launch URLs
      // Skip URLs that are app schemes without file data
      if (url.startsWith('exp://') || url.startsWith('http://') || url.startsWith('https://')) {
        return;
      }

      // The URL will be in format: content://... or file://...
      // For Android intents, we get the file URI directly
      let fileUri = url;

      // For our app scheme, check if it contains file data
      if (url.startsWith('refill://')) {
        const parsed = Linking.parse(url);
        if (parsed.queryParams?.uri) {
          fileUri = parsed.queryParams.uri as string;
        } else {
          // No file data in the URL, skip processing
          return;
        }
      }

      // Validate that we have a proper file URI
      if (!fileUri.startsWith('content://') && !fileUri.startsWith('file://')) {
        // Not a file URI, skip processing
        return;
      }

      // Read file content
      const content = await readAsStringAsync(fileUri);

      // Parse GPX
      const route = parseGPX(content);

      if (!route.points || route.points.length === 0) {
        Alert.alert('Error', 'No valid route found in GPX file');
        return;
      }

      // Extract filename from URI
      const fileName = fileUri.split('/').pop() || 'route.gpx';

      // Save to store
      setOriginalRoute(route, fileName);

      // Navigate to POI selection
      router.push('/poi-selection');
    } catch (error) {
      console.error('Error loading GPX from intent:', error);
      Alert.alert('Error', 'Failed to load GPX file. Please try again.');
    }
  };

  return <Stack />;
}
