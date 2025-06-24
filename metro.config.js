const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'js', 'jsx', 'ts', 'tsx', 'json', 'mjs'])];
config.resolver.unstable_enablePackageExports = false;

// config.resolver.extraNodeModules = {
//   'firebase/auth': require.resolve('firebase/auth'),
//   'firebase/firestore': require.resolve('firebase/firestore'),
// };

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

