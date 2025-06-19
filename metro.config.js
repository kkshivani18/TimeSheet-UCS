// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add additional extensions for Firebase
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs'];

config.resolver.extraNodeModules = {
  'firebase/auth': require.resolve('firebase/auth'),
  'firebase/firestore': require.resolve('firebase/firestore'),
};

// Optimize transformer
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
