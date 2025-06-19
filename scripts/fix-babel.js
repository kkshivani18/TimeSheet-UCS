const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}=== Babel Configuration Fixer ====${colors.reset}`);
console.log(`${colors.cyan}This script will fix Babel warnings related to loose option and assumptions${colors.reset}`);

// Path to the babel.config.js file
const babelConfigPath = path.join(__dirname, '..', 'babel.config.js');

// Check if babel.config.js exists
if (!fs.existsSync(babelConfigPath)) {
  console.log(`${colors.red}babel.config.js not found!${colors.reset}`);
  process.exit(1);
}

// Create a fixed babel.config.js
const fixedBabelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Ensure proper order of plugins
      'react-native-reanimated/plugin',
      ['module:react-native-dotenv'],
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
`;

// Write the new content to babel.config.js
console.log(`${colors.yellow}Updating babel.config.js...${colors.reset}`);
fs.writeFileSync(babelConfigPath, fixedBabelConfig, 'utf8');
console.log(`${colors.green}babel.config.js updated successfully!${colors.reset}`);

// Final instructions
console.log(`\n${colors.green}=== Babel Configuration Fix Complete ===${colors.reset}`);
console.log(`${colors.cyan}To apply the changes, run:${colors.reset}`);
console.log(`${colors.yellow}npm run clear-cache${colors.reset}`);
console.log(`${colors.yellow}npm run start-metro-fix${colors.reset}`);
