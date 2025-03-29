#!/usr/bin/env node

/**
 * Token List Validator
 * 
 * Validates all token list files in the assets directory according to requirements:
 * 1. Both common.json and popular.json are valid JSON objects with a tokens array
 * 2. Each token entry has required fields: chainId, address, name, symbol, decimals, logoURI
 * 3. Popular.json only contains tokens from common.json
 * 4. No duplicates by address in the same file
 * 5. Address casing is consistent (checksum)
 * 6. Files are formatted with 2-space indentation
 * 7. Logo files exist and are valid image files
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const { ethers } = require('ethers');
const chalk = require('chalk');

// Schema validation
const requiredFields = ['chainId', 'address', 'name', 'symbol', 'decimals', 'logoURI'];

// Track validation statistics
const stats = {
  totalFiles: 0,
  validFiles: 0,
  invalidFiles: 0,
  missingLogoFiles: 0,
  invalidLogoFiles: 0,
  errors: []
};

/**
 * Validates that an address is a valid Ethereum address in checksum format
 * @param {string} address The address to validate
 * @param {number} chainId The chain ID for context in error messages
 * @returns {boolean} Whether the address is valid
 */
function isValidChecksumAddress(address, chainId) {
  try {
    // Check if it's a valid Ethereum address
    if (!ethers.isAddress(address)) {
      return false;
    }
    
    // Check if it's in checksum format
    return address === ethers.getAddress(address);
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a file exists and is a valid image (by checking the file signature)
 * @param {string} filePath The path to the image file
 * @returns {Promise<boolean>} Whether the file exists and is a valid image
 */
async function isValidImageFile(filePath) {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return false;
    }
    
    // Read the first few bytes to check image signature
    const buffer = await fs.readFile(filePath, { length: 8 });
    
    // Check for PNG signature (89 50 4E 47 0D 0A 1A 0A)
    if (buffer.length >= 8 && 
        buffer[0] === 0x89 && 
        buffer[1] === 0x50 && 
        buffer[2] === 0x4E && 
        buffer[3] === 0x47 && 
        buffer[4] === 0x0D && 
        buffer[5] === 0x0A && 
        buffer[6] === 0x1A && 
        buffer[7] === 0x0A) {
      return true;
    }
    
    // Check for JPEG signature (FF D8)
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
      return true;
    }
    
    // Not a supported image format
    return false;
  } catch (error) {
    console.error(`Error checking image file ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Resolves a logo URI to a local file path
 * @param {string} logoURI The logo URI from the token list
 * @param {number} chainId The chain ID
 * @returns {string|null} The resolved file path or null if it's an external URL
 */
function resolveLogoPath(logoURI, chainId) {
  if (logoURI.startsWith('http')) {
    // External URL, we don't validate these
    return null;
  }
  
  // Handle relative paths in asset directory: "./logos/0x..."
  if (logoURI.startsWith('./logos/')) {
    return path.join('assets', chainId.toString(), logoURI.substring(2));
  }
  
  // Handle absolute paths: "/assets/43114/logos/0x..."
  if (logoURI.startsWith('/assets/')) {
    return logoURI.substring(1); // Remove leading slash
  }
  
  // Handle GitHub raw URLs for our repo
  if (logoURI.includes('github.com/First-Point/cosmohub-token-list/') && 
      logoURI.includes(`assets/${chainId}/logos/`)) {
    // Extract the path part after 'assets/'
    const match = logoURI.match(/assets\/.*$/);
    if (match) {
      return match[0];
    }
  }
  
  // Can't resolve the path
  return null;
}

/**
 * Validates a token entry has all required fields with correct types
 * @param {Object} token The token object to validate
 * @param {string} file The filename for context in error messages
 * @returns {Promise<boolean>} Whether the token is valid
 */
async function validateToken(token, file) {
  const errors = [];

  // Check required fields exist
  for (const field of requiredFields) {
    if (token[field] === undefined) {
      errors.push(`Missing required field '${field}'`);
    }
  }

  // If any fields are missing, return the errors
  if (errors.length > 0) {
    stats.errors.push({
      file,
      token: token.address || 'unknown',
      errors
    });
    return false;
  }

  // Validate field types
  if (typeof token.chainId !== 'number') {
    errors.push('chainId must be a number');
  }

  if (typeof token.address !== 'string') {
    errors.push('address must be a string');
  } else if (!isValidChecksumAddress(token.address, token.chainId)) {
    errors.push(`address '${token.address}' is not a valid checksum address`);
  }

  if (typeof token.name !== 'string') {
    errors.push('name must be a string');
  }

  if (typeof token.symbol !== 'string') {
    errors.push('symbol must be a string');
  }

  if (typeof token.decimals !== 'number' || !Number.isInteger(token.decimals)) {
    errors.push('decimals must be an integer');
  }

  if (typeof token.logoURI !== 'string') {
    errors.push('logoURI must be a string');
  } else if (!(token.logoURI.startsWith('http') || 
               token.logoURI.startsWith('./logos/') || 
               token.logoURI.startsWith('/assets/') ||
               token.logoURI.includes('github.com/First-Point/cosmohub-token-list/'))) {
    errors.push('logoURI must be a valid URL or a local file path (./logos/ or /assets/)');
  } else {
    // Validate that the logo file exists if it's a local path
    const logoPath = resolveLogoPath(token.logoURI, token.chainId);
    if (logoPath) {
      if (!await fs.pathExists(logoPath)) {
        errors.push(`Logo file does not exist: ${logoPath}`);
        stats.missingLogoFiles++;
      } else if (!await isValidImageFile(logoPath)) {
        errors.push(`Logo file is not a valid PNG or JPEG image: ${logoPath}`);
        stats.invalidLogoFiles++;
      }
    }
  }

  // If there are any errors, log them
  if (errors.length > 0) {
    stats.errors.push({
      file,
      token: token.address || 'unknown',
      errors
    });
    return false;
  }

  return true;
}

/**
 * Validate a token list file
 * @param {string} filePath Path to the token list file
 * @returns {Promise<boolean>} Whether the file is valid
 */
async function validateFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(chalk.blue(`Validating ${relativePath}...`));
  
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    // Check if file has 2-space indentation
    if (!fileContent.includes('\n  "')) {
      stats.errors.push({
        file: relativePath,
        errors: ['File is not formatted with 2-space indentation']
      });
      return false;
    }
    
    // Parse JSON
    let tokenList;
    try {
      tokenList = JSON.parse(fileContent);
    } catch (e) {
      stats.errors.push({
        file: relativePath,
        errors: [`Invalid JSON: ${e.message}`]
      });
      return false;
    }
    
    // Check if it has a tokens array
    if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
      stats.errors.push({
        file: relativePath,
        errors: ['Missing "tokens" array']
      });
      return false;
    }
    
    // No tokens is valid, but unusual
    if (tokenList.tokens.length === 0) {
      console.log(chalk.yellow(`  Warning: ${relativePath} has an empty tokens array`));
      return true;
    }
    
    // Check for duplicate addresses
    const addresses = new Set();
    const duplicates = [];
    
    // Validate each token
    let allTokensValid = true;
    
    // We need to check tokens sequentially to get accurate results
    for (const token of tokenList.tokens) {
      const isValid = await validateToken(token, relativePath);
      if (!isValid) {
        allTokensValid = false;
      }
      
      // Check for duplicates
      if (token.address) {
        const address = token.address.toLowerCase();
        if (addresses.has(address)) {
          duplicates.push(token.address);
        } else {
          addresses.add(address);
        }
      }
    }
    
    // Report duplicate addresses
    if (duplicates.length > 0) {
      stats.errors.push({
        file: relativePath,
        errors: [`Duplicate addresses found: ${duplicates.join(', ')}`]
      });
      allTokensValid = false;
    }
    
    // Check chainId consistency
    const chainIds = new Set(tokenList.tokens.map(token => token.chainId));
    if (chainIds.size > 1) {
      stats.errors.push({
        file: relativePath,
        errors: [`Multiple chainIds found: ${Array.from(chainIds).join(', ')}`]
      });
      allTokensValid = false;
    }
    
    return allTokensValid;
  } catch (error) {
    stats.errors.push({
      file: relativePath,
      errors: [`Error reading file: ${error.message}`]
    });
    return false;
  }
}

/**
 * Validate that popular.json tokens are a subset of common.json tokens
 * @param {string} commonPath Path to common.json
 * @param {string} popularPath Path to popular.json
 * @returns {Promise<boolean>} Whether popular.json is a valid subset
 */
async function validatePopularSubset(commonPath, popularPath) {
  try {
    const commonContent = await fs.readFile(commonPath, 'utf8');
    const popularContent = await fs.readFile(popularPath, 'utf8');
    
    const common = JSON.parse(commonContent);
    const popular = JSON.parse(popularContent);
    
    // Create a map of addresses in common.json
    const commonAddresses = new Map();
    for (const token of common.tokens) {
      commonAddresses.set(token.address.toLowerCase(), token);
    }
    
    // Check if each token in popular.json exists in common.json
    let isValidSubset = true;
    const invalidTokens = [];
    
    for (const token of popular.tokens) {
      const address = token.address.toLowerCase();
      if (!commonAddresses.has(address)) {
        invalidTokens.push(token.address);
        isValidSubset = false;
      }
    }
    
    if (!isValidSubset) {
      const relativePath = path.relative(process.cwd(), popularPath);
      stats.errors.push({
        file: relativePath,
        errors: [`Contains tokens not found in common.json: ${invalidTokens.join(', ')}`]
      });
    }
    
    return isValidSubset;
  } catch (error) {
    const relativePath = path.relative(process.cwd(), popularPath);
    stats.errors.push({
      file: relativePath,
      errors: [`Error validating popular subset: ${error.message}`]
    });
    return false;
  }
}

/**
 * Validate the logo directory for a chain
 * @param {string} chainDir Path to the chain directory
 * @returns {Promise<boolean>} Whether the logo directory is valid
 */
async function validateLogoDirectory(chainDir) {
  const logoDir = path.join(chainDir, 'logos');
  const relativePath = path.relative(process.cwd(), logoDir);
  
  try {
    // Check if the logo directory exists
    if (!await fs.pathExists(logoDir)) {
      console.log(chalk.red(`  Error: Logo directory not found: ${relativePath}`));
      stats.errors.push({
        file: relativePath,
        errors: ['Logo directory not found']
      });
      return false;
    }
    
    // Check the logo files
    console.log(chalk.blue(`Validating logo files in ${relativePath}...`));
    
    // Get all PNG files in the logo directory
    const logoFiles = await glob(path.join(logoDir, '*.png'));
    
    console.log(chalk.gray(`  Found ${logoFiles.length} logo files`));
    
    // Check each logo file
    let allLogosValid = true;
    let invalidCount = 0;
    
    for (const logoFile of logoFiles) {
      if (!await isValidImageFile(logoFile)) {
        const relativePath = path.relative(process.cwd(), logoFile);
        stats.errors.push({
          file: relativePath,
          errors: ['Not a valid PNG or JPEG image file']
        });
        allLogosValid = false;
        invalidCount++;
      }
    }
    
    if (invalidCount > 0) {
      console.log(chalk.red(`  ${invalidCount} invalid logo files found`));
      stats.invalidLogoFiles += invalidCount;
    }
    
    return allLogosValid;
  } catch (error) {
    console.error(chalk.red(`  Error validating logo directory: ${error.message}`));
    stats.errors.push({
      file: relativePath,
      errors: [`Error validating logo directory: ${error.message}`]
    });
    return false;
  }
}

/**
 * Main validation function
 */
async function validateTokenLists() {
  try {
    // Find all chain directories
    const chainDirs = await glob('assets/*/', { posix: true });
    
    console.log(chalk.green(`Found ${chainDirs.length} chain directories`));
    
    for (const chainDir of chainDirs) {
      const chainId = path.basename(chainDir);
      console.log(chalk.cyan(`\nValidating chain ID: ${chainId}`));
      
      const commonPath = path.join(chainDir, 'common.json');
      const popularPath = path.join(chainDir, 'popular.json');
      
      // Check if required files exist
      const commonExists = await fs.pathExists(commonPath);
      const popularExists = await fs.pathExists(popularPath);
      
      if (!commonExists) {
        console.log(chalk.red(`  Error: common.json not found in ${chainDir}`));
        stats.errors.push({
          file: chainDir,
          errors: ['common.json not found']
        });
        stats.invalidFiles++;
        continue;
      }
      
      if (!popularExists) {
        console.log(chalk.red(`  Error: popular.json not found in ${chainDir}`));
        stats.errors.push({
          file: chainDir,
          errors: ['popular.json not found']
        });
        stats.invalidFiles++;
        continue;
      }
      
      // Validate logo directory
      await validateLogoDirectory(chainDir);
      
      // Validate both files
      stats.totalFiles += 2;
      
      const commonValid = await validateFile(commonPath);
      const popularValid = await validateFile(popularPath);
      
      // Check that popular.json is a subset of common.json
      let popularSubsetValid = false;
      if (commonValid && popularValid) {
        popularSubsetValid = await validatePopularSubset(commonPath, popularPath);
      }
      
      if (commonValid) {
        stats.validFiles++;
      } else {
        stats.invalidFiles++;
      }
      
      if (popularValid && popularSubsetValid) {
        stats.validFiles++;
      } else {
        stats.invalidFiles++;
      }
    }
    
    // Print summary
    console.log(chalk.blue('\n-----------------------------------'));
    console.log(chalk.blue('Validation Summary:'));
    console.log(chalk.blue('-----------------------------------'));
    console.log(`Total files: ${stats.totalFiles}`);
    console.log(`Valid files: ${chalk.green(stats.validFiles)}`);
    console.log(`Invalid files: ${chalk.red(stats.invalidFiles)}`);
    console.log(`Missing logo files: ${chalk.yellow(stats.missingLogoFiles)}`);
    console.log(`Invalid logo files: ${chalk.red(stats.invalidLogoFiles)}`);
    
    if (stats.errors.length > 0) {
      console.log(chalk.red('\nErrors:'));
      for (const error of stats.errors) {
        console.log(chalk.yellow(`\nFile: ${error.file}`));
        if (error.token) {
          console.log(`Token: ${error.token}`);
        }
        for (const err of error.errors) {
          console.log(chalk.red(`  - ${err}`));
        }
      }
    }
    
    // Exit with error if any invalid files
    const hasErrors = stats.invalidFiles > 0 || stats.missingLogoFiles > 0 || stats.invalidLogoFiles > 0;
    if (hasErrors) {
      process.exit(1);
    } else {
      console.log(chalk.green('\nAll token lists and logo files are valid!'));
    }
  } catch (error) {
    console.error(chalk.red(`\nUnexpected error: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}

// Run validation
validateTokenLists(); 