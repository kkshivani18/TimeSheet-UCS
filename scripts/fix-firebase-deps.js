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

console.log(`${colors.cyan}=== Firebase Dependencies Fixer ===${colors.reset}`);
console.log(`${colors.cyan}This script will fix Firebase and AsyncStorage native module issues${colors.reset}`);

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

// Step 1: Install specific versions of dependencies
console.log(`\n${colors.magenta}Step 1: Installing Firebase and AsyncStorage${colors.reset}`);

// Install firebase@11.3.1
executeCommand('npm install firebase@11.3.1 --save-exact --legacy-peer-deps', 'Failed to install firebase');

// Install @react-native-async-storage/async-storage@1.24.0
executeCommand(
  'npm install @react-native-async-storage/async-storage@1.24.0 --save-exact --legacy-peer-deps',
  'Failed to install async-storage'
);

// Step 2: Update android/app/build.gradle
console.log(`\n${colors.magenta}Step 2: Updating android/app/build.gradle${colors.reset}`);

const gradlePath = path.join(__dirname, '../android/app/build.gradle');
if (!fs.existsSync(gradlePath)) {
  console.error(`${colors.red}android/app/build.gradle not found!${colors.reset}`);
} else {
  try {
    let gradleContent = fs.readFileSync(gradlePath, 'utf8');

    // Add Firebase and AsyncStorage dependencies
    if (!gradleContent.includes('com.google.firebase:firebase-bom')) {
      gradleContent = gradleContent.replace(
        /dependencies\s*{/,
        `dependencies {
          implementation platform('com.google.firebase:firebase-bom:32.3.1')
          implementation 'com.google.firebase:firebase-auth'
          implementation 'com.google.firebase:firebase-firestore'
          implementation project(':react-native-async-storage_async-storage')
      `
      );
      fs.writeFileSync(gradlePath, gradleContent);
      console.log(`${colors.green}Updated build.gradle with Firebase and AsyncStorage${colors.reset}`);
    } else {
      console.log(`${colors.blue}Firebase dependencies already present in build.gradle${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Failed to update build.gradle: ${error.message}${colors.reset}`);
  }
}

// Step 3: Create metro.config.js
console.log(`\n${colors.magenta}Step 3: Updating metro.config.js${colors.reset}`);

const metroConfigPath = path.join(__dirname, '..', 'metro.config.js');
const metroConfigContent = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add additional extensions for Firebase
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs'];

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
`;

try {
  fs.writeFileSync(metroConfigPath, metroConfigContent);
  console.log(`${colors.green}Updated metro.config.js successfully!${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Failed to update metro.config.js: ${error.message}${colors.reset}`);
}

// Step 4: Clear caches
console.log(`\n${colors.magenta}Step 4: Clearing caches${colors.reset}`);

executeCommand('npm run clear-cache', 'Failed to clear cache', true);

// Final instructions
console.log(`\n${colors.green}=== Firebase Dependencies Fix Complete ===${colors.reset}`);
console.log(`${colors.cyan}Next steps:${colors.reset}`);
console.log(`${colors.yellow}1. Run: npx expo prebuild --clean${colors.reset}`);
console.log(`${colors.yellow}2. Run: npx expo run:android${colors.reset}`);
console.log(`${colors.yellow}3. Start Metro: npx expo start --dev-client --clear${colors.reset}`);
console.log(`\n${colors.cyan}If issues persist, check adb logcat and share logs.${colors.reset}`);