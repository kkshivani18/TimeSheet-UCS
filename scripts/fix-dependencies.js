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

console.log(`${colors.cyan}=== SDK 53 Dependency Fixer ====${colors.reset}`);
console.log(`${colors.cyan}This script will fix dependency issues with SDK 53${colors.reset}`);

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

// Step 1: Clean up existing node_modules and caches
console.log(`\n${colors.magenta}Step 1: Cleaning up existing files${colors.reset}`);

// Delete node_modules
deleteDirectoryIfExists('node_modules', 'node_modules directory');

// Delete the .expo directory
deleteDirectoryIfExists('.expo', '.expo directory');

// Delete package-lock.json to ensure clean install
if (fs.existsSync('package-lock.json')) {
  console.log(`${colors.yellow}Removing package-lock.json...${colors.reset}`);
  fs.unlinkSync('package-lock.json');
  console.log(`${colors.green}Successfully removed package-lock.json${colors.reset}`);
}

// Delete yarn.lock if it exists
if (fs.existsSync('yarn.lock')) {
  console.log(`${colors.yellow}Removing yarn.lock...${colors.reset}`);
  fs.unlinkSync('yarn.lock');
  console.log(`${colors.green}Successfully removed yarn.lock${colors.reset}`);
}

// Delete the Metro bundler cache
const tempDir = os.tmpdir();
deleteDirectoryIfExists(path.join(tempDir, 'metro-cache'), 'Metro cache');
deleteDirectoryIfExists(path.join(tempDir, 'haste-map-metro-*'), 'Haste map');
deleteDirectoryIfExists(path.join(tempDir, 'react-*'), 'React native cache');

// Step 2: Install dependencies with legacy-peer-deps flag
console.log(`\n${colors.magenta}Step 2: Installing dependencies with legacy-peer-deps${colors.reset}`);
executeCommand('npm install --legacy-peer-deps', 'Failed to install dependencies with legacy-peer-deps');

// Step 3: Install global expo-cli
console.log(`\n${colors.magenta}Step 3: Installing global expo-cli${colors.reset}`);
executeCommand('npm install -g expo-cli', 'Failed to install global expo-cli', true);

// Step 4: Install specific expo packages that might be missing
console.log(`\n${colors.magenta}Step 4: Installing specific expo packages${colors.reset}`);
executeCommand('npm install expo-router@~5.0.5 --legacy-peer-deps', 'Failed to install expo-router', true);
executeCommand('npm install expo@~53.0.0 --legacy-peer-deps', 'Failed to install expo', true);

// Step 5: Verify installation
console.log(`\n${colors.magenta}Step 5: Verifying installation${colors.reset}`);
if (fs.existsSync('node_modules/expo') && fs.existsSync('node_modules/expo-router')) {
  console.log(`${colors.green}Expo packages are installed correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}Some Expo packages are missing. You may need to run this script again.${colors.reset}`);
}

// Step 6: Final instructions
console.log(`\n${colors.green}=== Dependency Fix Complete ===${colors.reset}`);
console.log(`${colors.cyan}To start your app, run:${colors.reset}`);
console.log(`${colors.yellow}npx expo start --clear${colors.reset}`);
console.log(`\n${colors.cyan}If you still have issues, try:${colors.reset}`);
console.log(`${colors.yellow}1. npx expo doctor${colors.reset}`);
console.log(`${colors.yellow}2. npx expo-doctor${colors.reset}`);
console.log(`${colors.yellow}3. npx expo start --no-dev --minify${colors.reset}`);
