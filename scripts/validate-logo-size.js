#!/usr/bin/env node

/**
 * Logo File Size Validator
 * 
 * This script checks all logo files in the assets directory to ensure
 * they don't exceed the maximum allowed size (100KB).
 * 
 * Oversized logo files can cause performance issues and slow loading times
 * for applications using the token list.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ASSETS_DIR = path.resolve(__dirname, '../assets');
const LOGOS_DIR = 'logos';
const MAX_FILE_SIZE_KB = 100; // Maximum file size in KB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_KB * 1024;

// Stats tracking
const stats = {
  processedDirectories: 0,
  totalLogoFiles: 0,
  oversizedFiles: 0,
  errors: []
};

/**
 * Get file size in KB
 * @param {string} filePath - Path to file
 * @returns {number} - File size in KB
 */
function getFileSizeKB(filePath) {
  const stats = fs.statSync(filePath);
  return Math.round(stats.size / 1024 * 10) / 10; // Round to 1 decimal place
}

/**
 * Validates logo files in a directory
 * @param {string} logosDir - Logos directory path
 * @param {string} chainId - Chain ID for context
 */
function validateLogoDirectory(logosDir, chainId) {
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
        const filePath = path.join(logosDir, logoFile);
        const fileSizeKB = getFileSizeKB(filePath);
        
        // Check if file size exceeds the limit
        if (fileSizeKB > MAX_FILE_SIZE_KB) {
          stats.oversizedFiles++;
          
          const error = {
            chainId,
            logoFile,
            filePath,
            fileSizeKB,
            message: `Logo file exceeds maximum size of ${MAX_FILE_SIZE_KB}KB`
          };
          
          stats.errors.push(error);
          
          console.log(`❌ Oversized logo: ${logoFile} (${fileSizeKB}KB)`);
        }
      } catch (error) {
        console.error(`Error processing file ${logoFile}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${logosDir}: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Logo File Size Validator');
  console.log('=======================');
  console.log(`Maximum allowed size: ${MAX_FILE_SIZE_KB}KB`);
  
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
        validateLogoDirectory(logosDir, chainDir);
      }
    }
    
    // Print summary
    console.log('\nValidation Complete!');
    console.log('===================');
    console.log(`Directories processed: ${stats.processedDirectories}`);
    console.log(`Total logo files: ${stats.totalLogoFiles}`);
    console.log(`Oversized logo files: ${stats.oversizedFiles}`);
    
    if (stats.oversizedFiles > 0) {
      console.log('\nOversized Logo Files:');
      console.log('====================');
      
      // Group errors by chain ID for better readability
      const groupedErrors = {};
      stats.errors.forEach(error => {
        if (!groupedErrors[error.chainId]) {
          groupedErrors[error.chainId] = [];
        }
        groupedErrors[error.chainId].push(error);
      });
      
      // Print each error by chain
      for (const chainId in groupedErrors) {
        console.log(`\nChain ID: ${chainId}`);
        groupedErrors[chainId].forEach(error => {
          console.log(`- ${error.logoFile}: ${error.fileSizeKB}KB (limit: ${MAX_FILE_SIZE_KB}KB)`);
        });
      }
      
      process.exit(1); // Exit with error if oversized files are found
    }
    
    console.log('\nAll logo files are within the size limit.');
    process.exit(0);
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