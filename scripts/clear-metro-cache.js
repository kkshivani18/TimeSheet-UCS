const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const rimraf = require('rimraf');

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

console.log(`${colors.cyan}=== Metro Cache Cleaner ====${colors.reset}`);
console.log(`${colors.cyan}This script will clear all Metro bundler caches${colors.reset}`);

// Function to delete a directory if it exists
function deleteDirectoryIfExists(dirPath, dirName) {
  if (fs.existsSync(dirPath)) {
    console.log(`${colors.yellow}Removing ${dirName}...${colors.reset}`);
    try {
      if (os.platform() === 'win32') {
        // On Windows, use rimraf
        rimraf.sync(dirPath);
      } else {
        // On Unix-like systems
        execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
      }
      console.log(`${colors.green}Successfully removed ${dirName}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Failed to remove ${dirName}: ${error.message}${colors.reset}`);
    }
  } else {
    console.log(`${colors.blue}${dirName} does not exist, skipping...${colors.reset}`);
  }
}

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

// Step 1: Clear Metro cache in temp directory
console.log(`\n${colors.magenta}Step 1: Clearing Metro cache in temp directory${colors.reset}`);
const tempDir = os.tmpdir();
deleteDirectoryIfExists(path.join(tempDir, 'metro-cache'), 'Metro cache in temp directory');
deleteDirectoryIfExists(path.join(tempDir, 'haste-map-metro-*'), 'Haste map in temp directory');
deleteDirectoryIfExists(path.join(tempDir, 'react-*'), 'React native cache in temp directory');

// Step 2: Clear Metro cache in project
console.log(`\n${colors.magenta}Step 2: Clearing Metro cache in project${colors.reset}`);
deleteDirectoryIfExists(path.join(__dirname, '..', 'node_modules', '.cache', 'metro'), 'Metro cache in node_modules');
deleteDirectoryIfExists(path.join(__dirname, '..', '.expo'), '.expo directory');

// Step 3: Clear watchman watches if available
console.log(`\n${colors.magenta}Step 3: Clearing Watchman watches${colors.reset}`);
executeCommand('watchman watch-del-all || echo "Watchman not installed or command failed, continuing..."', 
  'Failed to clear Watchman watches', true);

// Step 4: Final instructions
console.log(`\n${colors.green}=== Metro Cache Clearing Complete ===${colors.reset}`);
console.log(`${colors.cyan}To start your app with a clean cache, run:${colors.reset}`);
console.log(`${colors.yellow}npx expo start --clear${colors.reset}`);
