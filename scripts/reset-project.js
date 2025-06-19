const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

console.log(`${colors.cyan}Starting project reset process...${colors.reset}`);

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

// Function to delete a directory if it exists
function deleteDirectoryIfExists(dirPath, dirName) {
  const fullPath = path.join(dirPath);
  if (fs.existsSync(fullPath)) {
    console.log(`${colors.yellow}Removing ${dirName}...${colors.reset}`);
    try {
      if (os.platform() === 'win32') {
        // On Windows, use rimraf or rd command
        execSync(`rmdir /s /q "${fullPath}"`, { stdio: 'ignore' });
      } else {
        // On Unix-like systems
        execSync(`rm -rf "${fullPath}"`, { stdio: 'ignore' });
      }
      console.log(`${colors.green}Successfully removed ${dirName}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Failed to remove ${dirName}: ${error.message}${colors.reset}`);
    }
  } else {
    console.log(`${colors.blue}${dirName} does not exist, skipping...${colors.reset}`);
  }
}

// Clear watchman watches
console.log(`${colors.magenta}Clearing Watchman watches...${colors.reset}`);
executeCommand('watchman watch-del-all || echo "Watchman not installed or command failed, continuing..."',
  'Failed to clear Watchman watches');

// Delete node_modules
deleteDirectoryIfExists('node_modules', 'node_modules directory');

// Delete the .expo directory
deleteDirectoryIfExists('.expo', '.expo directory');

// Delete the metro bundler cache
const tempDir = os.tmpdir();
deleteDirectoryIfExists(path.join(tempDir, 'metro-cache'), 'Metro cache');
deleteDirectoryIfExists(path.join(tempDir, 'haste-map-metro-*'), 'Haste map');
deleteDirectoryIfExists(path.join(tempDir, 'react-*'), 'React native cache');

// Delete the Babel cache
deleteDirectoryIfExists('node_modules/.cache', 'Babel cache');

// Delete the Android build directory
deleteDirectoryIfExists('android/app/build', 'Android build directory');
deleteDirectoryIfExists('android/.gradle', 'Android .gradle directory');

// Delete the iOS build directory
deleteDirectoryIfExists('ios/build', 'iOS build directory');
deleteDirectoryIfExists('ios/Pods', 'iOS Pods');

// Install dependencies with legacy-peer-deps to handle conflicts
console.log(`${colors.magenta}Installing dependencies with legacy-peer-deps...${colors.reset}`);
executeCommand('npm install --legacy-peer-deps', 'Failed to install dependencies');

// Install global expo-cli if needed
console.log(`${colors.magenta}Installing global expo-cli...${colors.reset}`);
executeCommand('npm install -g expo-cli', 'Failed to install global expo-cli', true);

// Install specific packages that might be problematic
console.log(`${colors.magenta}Installing specific packages...${colors.reset}`);
executeCommand('npm install expo-router@~5.0.5 --legacy-peer-deps', 'Failed to install expo-router', true);
executeCommand('npm install expo@~53.0.0 --legacy-peer-deps', 'Failed to install expo', true);

// Start the Metro bundler with a clean cache
console.log(`${colors.green}Project reset complete!${colors.reset}`);
console.log(`${colors.cyan}To start the app with a clean cache, run:${colors.reset}`);
console.log(`${colors.yellow}npx expo start -c${colors.reset}`);
