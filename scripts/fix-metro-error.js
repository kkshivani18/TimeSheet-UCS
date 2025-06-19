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

console.log(`${colors.cyan}=== Metro Error Fixer ====${colors.reset}`);
console.log(`${colors.cyan}This script will fix the "store.clear is not a function" error${colors.reset}`);

// Path to the metro.config.js file
const metroConfigPath = path.join(__dirname, '..', 'metro.config.js');

// Check if metro.config.js exists
if (!fs.existsSync(metroConfigPath)) {
  console.log(`${colors.red}metro.config.js not found!${colors.reset}`);
  process.exit(1);
}

// Read the current content of metro.config.js
const currentContent = fs.readFileSync(metroConfigPath, 'utf8');

// Create a simple metro.config.js that works with SDK 53
const newContent = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Use a simple configuration that's compatible with SDK 53
module.exports = config;
`;

// Write the new content to metro.config.js
console.log(`${colors.yellow}Updating metro.config.js...${colors.reset}`);
fs.writeFileSync(metroConfigPath, newContent, 'utf8');
console.log(`${colors.green}metro.config.js updated successfully!${colors.reset}`);

// Path to the package.json file
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
  console.log(`${colors.red}package.json not found!${colors.reset}`);
  process.exit(1);
}

// Read the current content of package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add a new script to package.json
if (!packageJson.scripts) {
  packageJson.scripts = {};
}

packageJson.scripts['start-metro-fix'] = 'npx expo start --clear --no-dev';

// Write the updated package.json
console.log(`${colors.yellow}Updating package.json...${colors.reset}`);
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
console.log(`${colors.green}package.json updated successfully!${colors.reset}`);

// Final instructions
console.log(`\n${colors.green}=== Metro Error Fix Complete ===${colors.reset}`);
console.log(`${colors.cyan}To start your app with the fixed configuration, run:${colors.reset}`);
console.log(`${colors.yellow}npm run start-metro-fix${colors.reset}`);
console.log(`\n${colors.cyan}If you still have issues, try:${colors.reset}`);
console.log(`${colors.yellow}1. npm run clear-cache${colors.reset}`);
console.log(`${colors.yellow}2. npm run fix-deps${colors.reset}`);
console.log(`${colors.yellow}3. npm run start-metro-fix${colors.reset}`);
