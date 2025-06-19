module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Ensure proper order of plugins
      'react-native-reanimated/plugin',
      ['module:react-native-dotenv', { moduleName: '@env', path: '.env' }],
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-private-methods',
      '@babel/plugin-transform-private-property-in-object',
    ],
    // Use recommended assumptions instead of loose option
    assumptions: {
      setPublicClassFields: true,
      privateFieldsAsSymbols: true,
    },
    // Add specific handling for SDK 53 compatibility
    overrides: [
      {
        // Apply these settings to all node_modules
        test: /node_modules/,
        compact: true,
      },
    ],
  };
};
