#!/usr/bin/env node

/**
 * Fix Logo Addresses Script
 * 
 * This script scans all logo files in the assets directory and renames
 * any files with uppercase characters in their names to lowercase.
 * 
 * It helps ensure consistency across the codebase by enforcing the
 * standard that all token addresses (and thus logo filenames) should
 * be in lowercase format.
 * 
 * Usage:
 *   node fix-logo-addresses.js             # Rename all uppercase logo files to lowercase
 *   node fix-logo-addresses.js --dry-run   # Show what would be renamed without making changes
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REPO_ROOT = path.resolve(__dirname, '../');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
const LOGOS_DIR_NAME = 'logos';
const DRY_RUN = process.argv.includes('--dry-run');

// Stats tracking
const stats = {
  directoriesProcessed: 0,
  filesScanned: 0,
  filesRenamed: 0,
  errors: 0
};

/**
 * Checks if a filename has uppercase characters (excluding file extension)
 * @param {string} filename - Filename to check
 * @returns {boolean} - True if filename has uppercase characters
 */
function hasUppercase(filename) {
  // Extract the part of the filename without extension (assumed to be an address)
  const address = path.parse(filename).name;
  
  // Check if the address has uppercase characters
  return address.toLowerCase() !== address;
}

/**
 * Processes a logos directory, renaming any uppercase logo files to lowercase
 * @param {string} logosDir - Path to the logos directory
 */
function processLogosDirectory(logosDir) {
  try {
    console.log(`Processing directory: ${logosDir}`);
    stats.directoriesProcessed++;
    
    // Get all files in the logos directory
    const files = fs.readdirSync(logosDir);
    
    for (const file of files) {
      stats.filesScanned++;
      
      // Skip if not a PNG file
      if (!file.toLowerCase().endsWith('.png')) {
        continue;
      }
      
      // Check if the filename has uppercase characters
      if (hasUppercase(file)) {
        const oldPath = path.join(logosDir, file);
        const newPath = path.join(logosDir, file.toLowerCase());
        
        if (DRY_RUN) {
          console.log(`Would rename: ${file} -> ${file.toLowerCase()}`);
          stats.filesRenamed++;
        } else {
          try {
            fs.renameSync(oldPath, newPath);
            console.log(`Renamed: ${file} -> ${file.toLowerCase()}`);
            stats.filesRenamed++;
          } catch (error) {
            console.error(`Error renaming ${file}: ${error.message}`);
            stats.errors++;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${logosDir}: ${error.message}`);
    stats.errors++;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Logo Address Fixer`);
  console.log('=========================================');
  
  try {
    // Check if assets directory exists
    if (!fs.existsSync(ASSETS_DIR)) {
      throw new Error(`Assets directory not found: ${ASSETS_DIR}`);
    }
    
    // Get all chain directories
    const chainDirs = fs.readdirSync(ASSETS_DIR);
    
    for (const chainDir of chainDirs) {
      const chainPath = path.join(ASSETS_DIR, chainDir);
      
      // Skip if not a directory
      if (!fs.statSync(chainPath).isDirectory()) {
        continue;
      }
      
      // Check if logos directory exists for this chain
      const logosDir = path.join(chainPath, LOGOS_DIR_NAME);
      if (fs.existsSync(logosDir)) {
        processLogosDirectory(logosDir);
      }
    }
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Directories processed: ${stats.directoriesProcessed}`);
    console.log(`Files scanned: ${stats.filesScanned}`);
    console.log(`Files ${DRY_RUN ? 'to be ' : ''}renamed: ${stats.filesRenamed}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (DRY_RUN && stats.filesRenamed > 0) {
      console.log('\nThis was a dry run. To actually rename the files, run:');
      console.log('node scripts/fix-logo-addresses.js');
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