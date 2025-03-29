#!/usr/bin/env node

/**
 * Token List Address Normalizer
 * 
 * This script updates all token lists in both assets and tokenlists directories
 * to ensure token addresses are consistently in lowercase format.
 * 
 * It processes:
 * 1. All JSON files in assets/{chainId}/ directories
 * 2. All JSON files in the tokenlists/ directory
 * 
 * For each token list, it converts the token address field to lowercase
 * and updates the logoURI to use the lowercase address.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REPO_ROOT = path.resolve(__dirname, '../');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
const TOKENLISTS_DIR = path.join(REPO_ROOT, 'tokenlists');
const LOGOS_DIR = 'logos';
const DRY_RUN = process.argv.includes('--dry-run');

// Stats tracking
const stats = {
  processedFiles: 0,
  modifiedFiles: 0,
  tokensProcessed: 0,
  addressesChanged: 0,
  logoURIsChanged: 0,
  errors: 0
};

/**
 * Normalizes a token address to lowercase
 * @param {string} address - Token address
 * @returns {string} - Normalized address (lowercase)
 */
function normalizeAddress(address) {
  if (!address) return address;
  return address.toLowerCase();
}

/**
 * Updates logoURI to use lowercase address
 * @param {string} logoURI - Original logo URI
 * @param {string} address - Original address
 * @returns {string} - Updated logo URI with lowercase address
 */
function updateLogoURI(logoURI, address) {
  if (!logoURI || !address) return logoURI;
  
  // Only update if the address is part of the logoURI
  const addressLower = normalizeAddress(address);
  if (logoURI.includes(address) && addressLower !== address) {
    return logoURI.replace(address, addressLower);
  }
  
  return logoURI;
}

/**
 * Processes a token list file
 * @param {string} filePath - Path to the token list JSON file
 */
function processTokenList(filePath) {
  console.log(`Processing: ${filePath}`);
  stats.processedFiles++;
  
  try {
    // Read token list file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let tokenList = JSON.parse(fileContent);
    
    // Skip if no tokens field
    if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
      console.warn(`No tokens array found in ${filePath}, skipping.`);
      return;
    }
    
    let modified = false;
    stats.tokensProcessed += tokenList.tokens.length;
    
    // Process each token
    tokenList.tokens = tokenList.tokens.map(token => {
      if (!token.address) return token;
      
      const originalAddress = token.address;
      const normalizedAddress = normalizeAddress(originalAddress);
      
      // Clone the token object
      const updatedToken = { ...token };
      
      // Update address to lowercase if needed
      if (normalizedAddress !== originalAddress) {
        updatedToken.address = normalizedAddress;
        stats.addressesChanged++;
        modified = true;
      }
      
      // Update logoURI to use lowercase address if needed
      if (token.logoURI) {
        const updatedLogoURI = updateLogoURI(token.logoURI, originalAddress);
        if (updatedLogoURI !== token.logoURI) {
          updatedToken.logoURI = updatedLogoURI;
          stats.logoURIsChanged++;
          modified = true;
        }
      }
      
      return updatedToken;
    });
    
    // Save the updated token list
    if (modified && !DRY_RUN) {
      fs.writeFileSync(filePath, JSON.stringify(tokenList, null, 2), 'utf8');
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
 * Processes all token lists in a directory
 * @param {string} dir - Directory path
 */
function processDirectory(dir) {
  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(dir, file));
  
  for (const file of files) {
    processTokenList(file);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Token List Address Normalizer');
  console.log('============================');
  console.log(DRY_RUN ? 'DRY RUN MODE - No files will be modified' : 'LIVE MODE - Files will be updated');
  
  try {
    // 1. Process tokenlists directory
    console.log('\nProcessing tokenlists directory...');
    if (fs.existsSync(TOKENLISTS_DIR)) {
      processDirectory(TOKENLISTS_DIR);
    }
    
    // 2. Process assets/{chainId} directories
    console.log('\nProcessing assets directory...');
    if (fs.existsSync(ASSETS_DIR)) {
      // Get all chain directories
      const chainDirs = fs.readdirSync(ASSETS_DIR)
        .filter(dir => {
          const fullPath = path.join(ASSETS_DIR, dir);
          return fs.statSync(fullPath).isDirectory() && /^\d+$/.test(dir);
        });
      
      // Process each chain directory
      for (const chainDir of chainDirs) {
        const chainDirPath = path.join(ASSETS_DIR, chainDir);
        processDirectory(chainDirPath);
      }
    }
    
    // Print summary
    console.log('\nProcessing Complete!');
    console.log('===================');
    console.log(`Files processed: ${stats.processedFiles}`);
    console.log(`Files modified: ${stats.modifiedFiles}`);
    console.log(`Tokens processed: ${stats.tokensProcessed}`);
    console.log(`Addresses changed to lowercase: ${stats.addressesChanged}`);
    console.log(`Logo URIs updated: ${stats.logoURIsChanged}`);
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