#!/usr/bin/env node

/**
 * Sync Token Validation Config
 * 
 * This script updates the configuration across all the token sync scripts
 * to ensure consistent handling of token addresses in lowercase format.
 * 
 * It modifies:
 * 1. The normalizeAddress functions to ensure they convert to lowercase
 * 2. The logoURI paths to use lowercase addresses
 * 3. Any validation code that might be comparing addresses
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REPO_ROOT = path.resolve(__dirname, '../');
const TOKEN_SYNC_DIR = path.join(REPO_ROOT, 'token-sync');
const DRY_RUN = process.argv.includes('--dry-run');

// Stats tracking
const stats = {
  processedFiles: 0,
  modifiedFiles: 0,
  errors: 0
};

/**
 * Find all sync script files
 * @returns {string[]} - Array of script file paths
 */
function findSyncScripts() {
  const scripts = [];
  
  // Function to recursively search for JS files
  function searchDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        searchDir(itemPath);
      } else if (stat.isFile() && item.endsWith('.js') && item.startsWith('sync-')) {
        scripts.push(itemPath);
      }
    }
  }
  
  // Start search from token-sync directory
  searchDir(TOKEN_SYNC_DIR);
  
  return scripts;
}

/**
 * Updates code to ensure address normalization converts to lowercase
 * @param {string} code - Original code content
 * @returns {Object} - Modified code and whether changes were made
 */
function ensureAddressNormalization(code) {
  let modified = false;
  let updatedCode = code;
  
  // Pattern 1: Find normalizeAddress function
  const normalizeFunctionPattern = /function\s+normalizeAddress\s*\(\s*addr\s*\)\s*{\s*[^}]+}/g;
  const normalizeFunctionReplacement = 'function normalizeAddress(addr) {\n  return addr.toLowerCase();\n}';
  
  if (normalizeFunctionPattern.test(updatedCode)) {
    updatedCode = updatedCode.replace(normalizeFunctionPattern, normalizeFunctionReplacement);
    modified = true;
  }
  
  // Pattern 2: Check for inline address normalization
  const inlineNormalizePattern = /const\s+normalizeAddress\s*=\s*.*=>.*/g;
  if (inlineNormalizePattern.test(updatedCode)) {
    updatedCode = updatedCode.replace(inlineNormalizePattern, 'const normalizeAddress = addr => addr.toLowerCase()');
    modified = true;
  }
  
  // Pattern 3: Check ethers.getAddress usage for logo filenames
  const ethersAddressPattern = /(const\s+\w+\s*=\s*ethers\.getAddress\([^)]+\))(\s*;[\s\n]+.*\.png)/g;
  if (ethersAddressPattern.test(updatedCode)) {
    updatedCode = updatedCode.replace(ethersAddressPattern, '$1.toLowerCase()$2');
    modified = true;
  }
  
  // Pattern 4: Check direct address usage in logoURI
  const logoUriPattern = /(logoURI\s*:\s*`[^`]*\$\{)([^}]+)(\}\.png)/g;
  if (logoUriPattern.test(updatedCode)) {
    updatedCode = updatedCode.replace(logoUriPattern, '$1$2.toLowerCase()$3');
    modified = true;
  }
  
  return { code: updatedCode, modified };
}

/**
 * Process a sync script file
 * @param {string} filePath - Path to the script file
 */
function processSyncScript(filePath) {
  console.log(`Processing: ${filePath}`);
  stats.processedFiles++;
  
  try {
    // Read file content
    const originalCode = fs.readFileSync(filePath, 'utf8');
    
    // Update code to ensure address normalization
    const { code: updatedCode, modified } = ensureAddressNormalization(originalCode);
    
    // Save changes if modified
    if (modified && !DRY_RUN) {
      fs.writeFileSync(filePath, updatedCode, 'utf8');
      stats.modifiedFiles++;
      console.log(`Updated: ${filePath}`);
    } else if (modified) {
      stats.modifiedFiles++;
      console.log(`Would update (dry run): ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    stats.errors++;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Sync Token Validation Config');
  console.log('===========================');
  console.log(DRY_RUN ? 'DRY RUN MODE - No files will be modified' : 'LIVE MODE - Files will be updated');
  
  try {
    // Find all sync scripts
    const syncScripts = findSyncScripts();
    console.log(`Found ${syncScripts.length} sync scripts.`);
    
    // Process each script
    for (const script of syncScripts) {
      processSyncScript(script);
    }
    
    // Print summary
    console.log('\nProcessing Complete!');
    console.log('===================');
    console.log(`Files processed: ${stats.processedFiles}`);
    console.log(`Files modified: ${stats.modifiedFiles}`);
    console.log(`Errors encountered: ${stats.errors}`);
    
    if (DRY_RUN) {
      console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
    }
    
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 