const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to execute commands and handle errors
function executeCommand(command, errorMessage) {
  try {
    console.log(`${colors.yellow}Executing: ${command}${colors.reset}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${colors.red}${errorMessage}: ${error.message}${colors.reset}`);
    return false;
  }
}

// Function to ask a question and get user input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main function
async function main() {
  console.log(`${colors.cyan}=== Expo SDK 53 App Bundling Helper ===${colors.reset}`);
  console.log(`${colors.cyan}This script will help you bundle your Expo SDK 53 app${colors.reset}`);
  
  // Step 1: Clean the project
  console.log(`\n${colors.magenta}Step 1: Clean the project${colors.reset}`);
  const shouldClean = await askQuestion(`${colors.yellow}Do you want to clean the project first? (y/n) ${colors.reset}`);
  
  if (shouldClean.toLowerCase() === 'y') {
    console.log(`${colors.blue}Cleaning project...${colors.reset}`);
    executeCommand('npx expo start --clear', 'Failed to clear cache');
    executeCommand('watchman watch-del-all || echo "Watchman not installed or command failed, continuing..."', 
      'Failed to clear Watchman watches');
  }
  
  // Step 2: Choose platform
  console.log(`\n${colors.magenta}Step 2: Choose platform${colors.reset}`);
  console.log(`${colors.blue}1. Android${colors.reset}`);
  console.log(`${colors.blue}2. iOS${colors.reset}`);
  console.log(`${colors.blue}3. Web${colors.reset}`);
  
  const platformChoice = await askQuestion(`${colors.yellow}Enter your choice (1-3): ${colors.reset}`);
  
  let platform;
  switch (platformChoice) {
    case '1':
      platform = 'android';
      break;
    case '2':
      platform = 'ios';
      break;
    case '3':
      platform = 'web';
      break;
    default:
      console.log(`${colors.red}Invalid choice. Defaulting to Android.${colors.reset}`);
      platform = 'android';
  }
  
  // Step 3: Choose build type
  console.log(`\n${colors.magenta}Step 3: Choose build type${colors.reset}`);
  console.log(`${colors.blue}1. Development${colors.reset}`);
  console.log(`${colors.blue}2. Production${colors.reset}`);
  
  const buildTypeChoice = await askQuestion(`${colors.yellow}Enter your choice (1-2): ${colors.reset}`);
  
  const isProduction = buildTypeChoice === '2';
  
  // Step 4: Start bundling
  console.log(`\n${colors.magenta}Step 4: Start bundling${colors.reset}`);
  console.log(`${colors.blue}Bundling for ${platform} in ${isProduction ? 'production' : 'development'} mode...${colors.reset}`);
  
  // Construct the command
  let bundleCommand;
  
  if (platform === 'web') {
    bundleCommand = `npx expo export:web`;
  } else {
    // For native platforms
    bundleCommand = `npx expo export`;
    
    // Add platform-specific flags
    if (platform === 'android') {
      bundleCommand += ` --platform android`;
    } else if (platform === 'ios') {
      bundleCommand += ` --platform ios`;
    }
    
    // Add production flag if needed
    if (isProduction) {
      bundleCommand += ` --release`;
    } else {
      bundleCommand += ` --dev`;
    }
  }
  
  // Execute the bundle command
  const success = executeCommand(bundleCommand, 'Failed to bundle the app');
  
  if (success) {
    console.log(`\n${colors.green}Bundling completed successfully!${colors.reset}`);
    
    if (platform === 'web') {
      console.log(`${colors.blue}Web build output is in the 'web-build' directory${colors.reset}`);
    } else {
      console.log(`${colors.blue}Native build output is in the 'dist' directory${colors.reset}`);
    }
  } else {
    console.log(`\n${colors.red}Bundling failed. Please check the error messages above.${colors.reset}`);
    console.log(`${colors.yellow}Try running 'node ./scripts/reset-project.js' to reset the project and try again.${colors.reset}`);
  }
  
  // Close the readline interface
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}An error occurred: ${error.message}${colors.reset}`);
  rl.close();
});
