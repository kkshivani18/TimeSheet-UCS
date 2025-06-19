const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

console.log(`${colors.cyan}=== IDB Package Fixer ====${colors.reset}`);
console.log(`${colors.cyan}This script will fix the idb package issues${colors.reset}`);

// Function to execute commands and handle errors
function executeCommand(command, errorMessage, ignoreError = false) {
  try {
    console.log(`${colors.yellow}Executing: ${command}${colors.reset}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${colors.red}${errorMessage}: ${error.message}${colors.reset}`);
    if (!ignoreError) {
      console.log(`${colors.yellow}Continuing despite error...${colors.reset}`);
    }
    return false;
  }
}

// Step 1: Remove the idb package
console.log(`\n${colors.magenta}Step 1: Removing idb package${colors.reset}`);
const idbDir = path.join(__dirname, '..', 'node_modules', 'idb');
if (fs.existsSync(idbDir)) {
  try {
    console.log(`${colors.yellow}Removing idb directory...${colors.reset}`);
    fs.rmSync(idbDir, { recursive: true, force: true });
    console.log(`${colors.green}Successfully removed idb directory${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to remove idb directory: ${error.message}${colors.reset}`);
  }
}

// Step 2: Install a specific version of idb
console.log(`\n${colors.magenta}Step 2: Installing idb@7.0.1${colors.reset}`);
executeCommand('npm install idb@7.0.1 --save-exact --legacy-peer-deps', 'Failed to install idb');

// Step 3: Create the missing build directory and files if needed
console.log(`\n${colors.magenta}Step 3: Creating missing files${colors.reset}`);
const idbBuildDir = path.join(idbDir, 'build');
if (!fs.existsSync(idbBuildDir)) {
  try {
    console.log(`${colors.yellow}Creating build directory...${colors.reset}`);
    fs.mkdirSync(idbBuildDir, { recursive: true });
    console.log(`${colors.green}Successfully created build directory${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to create build directory: ${error.message}${colors.reset}`);
  }
}

// Create index.cjs file
const indexCjsPath = path.join(idbBuildDir, 'index.cjs');
if (!fs.existsSync(indexCjsPath)) {
  try {
    console.log(`${colors.yellow}Creating index.cjs file...${colors.reset}`);
    // Simple CommonJS wrapper for idb
    const indexCjsContent = `
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// Re-export from the actual idb implementation
const idb = require('../lib/index.js');

// Export all properties
Object.keys(idb).forEach(key => {
  if (key === 'default' || key === '__esModule') return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return idb[key];
    }
  });
});

exports.default = idb.default || idb;
`;
    fs.writeFileSync(indexCjsPath, indexCjsContent);
    console.log(`${colors.green}Successfully created index.cjs file${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to create index.cjs file: ${error.message}${colors.reset}`);
  }
}

// Step 4: Fix the package.json
console.log(`\n${colors.magenta}Step 4: Fixing package.json${colors.reset}`);
const packageJsonPath = path.join(idbDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    console.log(`${colors.yellow}Updating package.json...${colors.reset}`);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Update the exports field
    packageJson.exports = {
      ".": {
        "import": "./lib/index.js",
        "require": "./build/index.cjs"
      }
    };
    
    // Add main field if it doesn't exist
    if (!packageJson.main) {
      packageJson.main = "./build/index.cjs";
    }
    
    // Add module field if it doesn't exist
    if (!packageJson.module) {
      packageJson.module = "./lib/index.js";
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`${colors.green}Successfully updated package.json${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to update package.json: ${error.message}${colors.reset}`);
  }
}

// Step 5: Update metro.config.js to handle idb
console.log(`\n${colors.magenta}Step 5: Updating metro.config.js${colors.reset}`);
const metroConfigPath = path.join(__dirname, '..', 'metro.config.js');
const metroConfigContent = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add extraNodeModules to resolve problematic dependencies
config.resolver.extraNodeModules = {
  // Ensure idb is properly resolved
  'idb': path.resolve(__dirname, 'node_modules/idb'),
};

// Add additional extensions for better compatibility
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs'];

// Add specific aliases for Firebase
config.resolver.alias = {
  ...config.resolver.alias,
  '@firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app'),
  '@firebase/util': path.resolve(__dirname, 'node_modules/@firebase/util'),
};

module.exports = config;
`;

try {
  fs.writeFileSync(metroConfigPath, metroConfigContent);
  console.log(`${colors.green}Successfully updated metro.config.js${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Failed to update metro.config.js: ${error.message}${colors.reset}`);
}

// Final instructions
console.log(`\n${colors.green}=== IDB Package Fix Complete ===${colors.reset}`);
console.log(`${colors.cyan}To start your app with the fixed configuration, run:${colors.reset}`);
console.log(`${colors.yellow}npm run clear-cache${colors.reset}`);
console.log(`${colors.yellow}npm run start-metro-fix${colors.reset}`);
