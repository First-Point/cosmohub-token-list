#!/usr/bin/env node

/**
 * Token Logo Address Normalizer
 * 
 * This script converts all token logo filenames to lowercase format.
 * It walks through the assets directory structure, finds all logo files
 * with mixed-case (checksum) addresses, and renames them to lowercase.
 * 
 * This ensures consistency across the project for logo filenames.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ASSETS_DIR = path.resolve(__dirname, '../assets');
const LOGOS_DIR = 'logos';
const DRY_RUN = process.argv.includes('--dry-run');

// Stats tracking
const stats = {
  processedDirectories: 0,
  totalLogoFiles: 0,
  renamedFiles: 0,
  errors: 0
};

/**
 * Converts an address to lowercase
 * @param {string} address - Token address
 * @returns {string} - Lowercase address
 */
function normalizeAddress(address) {
  if (!address) return address;
  return address.toLowerCase();
}

/**
 * Processes logo files in a directory
 * @param {string} logosDir - Logos directory path
 */
function processLogoDirectory(logosDir) {
  console.log(`\nProcessing directory: ${logosDir}`);
  
  try {
    stats.processedDirectories++;
    
    // Get all PNG files in the directory
    const logoFiles = fs.readdirSync(logosDir)
      .filter(file => file.endsWith('.png'));
    
    stats.totalLogoFiles += logoFiles.length;
    
    // Process each logo file
    for (const logoFile of logoFiles) {
      try {
        // Skip files that are already lowercase
        if (logoFile === logoFile.toLowerCase()) {
          continue;
        }
        
        // Extract the address part (remove .png extension)
        const address = logoFile.slice(0, -4);
        const lowercaseAddress = normalizeAddress(address);
        
        // If the address is not the same in lowercase, rename the file
        if (lowercaseAddress !== address) {
          const sourcePath = path.join(logosDir, logoFile);
          const targetPath = path.join(logosDir, `${lowercaseAddress}.png`);
          
          console.log(`Renaming: ${logoFile} -> ${lowercaseAddress}.png`);
          
          if (!DRY_RUN) {
            fs.renameSync(sourcePath, targetPath);
          }
          
          stats.renamedFiles++;
        }
      } catch (error) {
        console.error(`Error processing file ${logoFile}: ${error.message}`);
        stats.errors++;
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
  console.log('Token Logo Address Normalizer');
  console.log('============================');
  console.log(DRY_RUN ? 'DRY RUN MODE - No files will be modified' : 'LIVE MODE - Files will be renamed');
  
  try {
    // Get all chain directories in assets
    const chainDirs = fs.readdirSync(ASSETS_DIR)
      .filter(dir => {
        const fullPath = path.join(ASSETS_DIR, dir);
        return fs.statSync(fullPath).isDirectory() && /^\d+$/.test(dir);
      });
    
    // Process each chain directory
    for (const chainDir of chainDirs) {
      const logosDir = path.join(ASSETS_DIR, chainDir, LOGOS_DIR);
      
      if (fs.existsSync(logosDir)) {
        processLogoDirectory(logosDir);
      }
    }
    
    // Print summary
    console.log('\nProcessing Complete!');
    console.log('===================');
    console.log(`Directories processed: ${stats.processedDirectories}`);
    console.log(`Total logo files: ${stats.totalLogoFiles}`);
    console.log(`Files renamed to lowercase: ${stats.renamedFiles}`);
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