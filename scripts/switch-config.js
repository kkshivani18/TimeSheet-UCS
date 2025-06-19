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

// Get command line arguments
const args = process.argv.slice(2);
const mode = args[0]?.toLowerCase();

if (mode !== 'minimal' && mode !== 'full') {
  console.log(`${colors.red}Invalid mode. Usage: node switch-config.js [minimal|full]${colors.reset}`);
  console.log(`${colors.yellow}  - minimal: Use minimal configuration for troubleshooting${colors.reset}`);
  console.log(`${colors.yellow}  - full: Use full configuration for normal operation${colors.reset}`);
  process.exit(1);
}

// Paths
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appMinimalJsonPath = path.join(__dirname, '..', 'app.minimal.json');
const appFullJsonPath = path.join(__dirname, '..', 'app.full.json');

// Backup current app.json if needed
if (mode === 'minimal' && !fs.existsSync(appFullJsonPath) && fs.existsSync(appJsonPath)) {
  console.log(`${colors.blue}Backing up current app.json to app.full.json...${colors.reset}`);
  fs.copyFileSync(appJsonPath, appFullJsonPath);
  console.log(`${colors.green}Backup created successfully!${colors.reset}`);
}

// Switch to minimal mode
if (mode === 'minimal') {
  if (!fs.existsSync(appMinimalJsonPath)) {
    console.log(`${colors.red}app.minimal.json not found!${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.magenta}Switching to minimal configuration...${colors.reset}`);
  fs.copyFileSync(appMinimalJsonPath, appJsonPath);
  console.log(`${colors.green}Now using minimal configuration!${colors.reset}`);
  console.log(`${colors.cyan}This configuration disables some plugins to help with troubleshooting.${colors.reset}`);
}

// Switch to full mode
if (mode === 'full') {
  if (!fs.existsSync(appFullJsonPath)) {
    console.log(`${colors.red}app.full.json not found! Run in minimal mode first to create a backup.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.magenta}Switching to full configuration...${colors.reset}`);
  fs.copyFileSync(appFullJsonPath, appJsonPath);
  console.log(`${colors.green}Now using full configuration!${colors.reset}`);
}

console.log(`${colors.cyan}Configuration switched successfully!${colors.reset}`);
