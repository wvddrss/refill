// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);

// Configure resolver to handle platform-specific extensions properly
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'web'],
  sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
  resolveRequest: (context, moduleName, platform) => {
    // If we're on web and someone tries to import react-native-maps, return an empty module
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'node_modules/react-native-web/dist/index.js'),
        type: 'empty',
      };
    }

    if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
      //? Resolve to its CommonJS entry (fallback to main/index.js)
      return {
          type: 'sourceFile',
          //? require.resolve will pick up the CJS entry (index.js) since "exports" is bypassed
          filePath: require.resolve(moduleName),
      };
    }

    // Otherwise, use the default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
