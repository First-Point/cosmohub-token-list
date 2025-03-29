#!/usr/bin/env node

/**
 * Update Token Lists Script
 * 
 * This script processes all JSON token list files in both the assets
 * and tokenlists directories, converting token addresses to lowercase
 * and updating the logoURI fields to use lowercase addresses.
 * 
 * It helps ensure consistency across the codebase by enforcing the
 * standard that all token addresses should be in lowercase format.
 * 
 * Usage:
 *   node update-token-lists.js             # Update all token lists
 *   node update-token-lists.js --dry-run   # Show what would be updated without making changes
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REPO_ROOT = path.resolve(__dirname, '../');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
const TOKENLISTS_DIR = path.join(REPO_ROOT, 'tokenlists');
const LOGOS_DIR_NAME = 'logos';
const DRY_RUN = process.argv.includes('--dry-run');

// Stats tracking
const stats = {
  filesProcessed: 0,
  tokensUpdated: 0,
  errors: 0
};

/**
 * Converts a token address to lowercase
 * @param {string} address - Token address
 * @returns {string} - Lowercase address
 */
function normalizeAddress(address) {
  if (!address || typeof address !== 'string') return address;
  return address.toLowerCase();
}

/**
 * Updates a logo URI to use lowercase address
 * @param {string} logoURI - Original logo URI
 * @returns {string} - Updated logo URI with lowercase address
 */
function normalizeLogoURI(logoURI) {
  if (!logoURI || typeof logoURI !== 'string') return logoURI;
  
  // For GitHub raw URLs
  if (logoURI.includes('githubusercontent.com')) {
    // Extract the address part from the URL
    const addressMatch = logoURI.match(/\/([0-9a-fA-F]{40})\.png/);
    if (addressMatch && addressMatch[1]) {
      const address = addressMatch[1];
      const lowercaseAddress = normalizeAddress(address);
      return logoURI.replace(`/${address}.png`, `/${lowercaseAddress}.png`);
    }
  }
  
  // For relative paths (./logos/0x...)
  if (logoURI.includes('/logos/')) {
    const addressMatch = logoURI.match(/\/logos\/([0-9a-fA-F]{40})\.png/);
    if (addressMatch && addressMatch[1]) {
      const address = addressMatch[1];
      const lowercaseAddress = normalizeAddress(address);
      return logoURI.replace(`/logos/${address}.png`, `/logos/${lowercaseAddress}.png`);
    }
  }
  
  return logoURI;
}

/**
 * Processes a token list file, normalizing addresses and logo URIs
 * @param {string} filePath - Path to token list file
 * @returns {boolean} - True if successful
 */
function processTokenListFile(filePath) {
  try {
    console.log(`Processing file: ${filePath}`);
    stats.filesProcessed++;
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let tokenList;
    
    try {
      tokenList = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error parsing JSON in ${filePath}: ${error.message}`);
      stats.errors++;
      return false;
    }
    
    // Check if the file has a tokens array
    if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
      console.warn(`Warning: No tokens array found in ${filePath}`);
      return true;
    }
    
    let tokensUpdated = 0;
    
    // Process each token
    for (const token of tokenList.tokens) {
      let tokenUpdated = false;
      
      // Update token address if needed
      if (token.address && token.address !== normalizeAddress(token.address)) {
        if (!DRY_RUN) {
          token.address = normalizeAddress(token.address);
        }
        tokenUpdated = true;
      }
      
      // Update logo URI if needed
      if (token.logoURI) {
        const normalizedLogoURI = normalizeLogoURI(token.logoURI);
        if (normalizedLogoURI !== token.logoURI) {
          if (!DRY_RUN) {
            token.logoURI = normalizedLogoURI;
          }
          tokenUpdated = true;
        }
      }
      
      if (tokenUpdated) {
        tokensUpdated++;
      }
    }
    
    if (tokensUpdated > 0) {
      console.log(`  ${tokensUpdated} tokens would be updated in ${filePath}`);
      stats.tokensUpdated += tokensUpdated;
      
      // Save the updated file
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, JSON.stringify(tokenList, null, 2), 'utf8');
        console.log(`  File updated successfully with ${tokensUpdated} changes`);
      }
    } else {
      console.log(`  No updates needed for ${filePath}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    stats.errors++;
    return false;
  }
}

/**
 * Processes all JSON files in a directory
 * @param {string} directory - Directory to process
 */
function processDirectory(directory) {
  try {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Skip the logos directory
        if (item === LOGOS_DIR_NAME) continue;
        
        // Recursively process subdirectories
        processDirectory(itemPath);
      } else if (stat.isFile() && item.endsWith('.json')) {
        // Process JSON files
        processTokenListFile(itemPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}: ${error.message}`);
    stats.errors++;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Token List Updater`);
  console.log('==========================================');
  
  try {
    // Process both assets and tokenlists directories
    console.log('\nProcessing assets directory:');
    processDirectory(ASSETS_DIR);
    
    console.log('\nProcessing tokenlists directory:');
    processDirectory(TOKENLISTS_DIR);
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Tokens ${DRY_RUN ? 'to be ' : ''}updated: ${stats.tokensUpdated}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (DRY_RUN && stats.tokensUpdated > 0) {
      console.log('\nThis was a dry run. To actually update the files, run:');
      console.log('node scripts/update-token-lists.js');
    }
    
    console.log('\nDone!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
}); 