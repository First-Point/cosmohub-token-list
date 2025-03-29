#!/usr/bin/env node

/**
 * Logo URL Validator
 * 
 * This script validates all logoURI URLs in tokenlist files in two ways:
 * 1. For GitHub URLs: Checks if the URLs are accessible via HTTP requests
 * 2. For local paths: Verifies that the referenced logo files actually exist in the assets directory
 * 
 * Features:
 * - HTTP validation with timeout and retry logic
 * - Local file system validation
 * - Deep verification of both the URL accessibility AND file existence
 * - Identifies missing logo files that should exist based on token addresses
 * - Detailed error reporting categorized by error type
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const REPO_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
const TOKENLISTS_DIR = path.join(REPO_ROOT, 'tokenlists');
const USER_AGENT = 'LogoURLValidator/1.0';
const TIMEOUT_MS = 15000; // 15 seconds timeout
const MAX_RETRIES = 2; // Number of retry attempts for failed requests
const CONCURRENT_REQUESTS = 5; // Number of concurrent HTTP requests
const DELAY_BETWEEN_BATCHES_MS = 1000; // Delay between request batches
const RETRY_DELAY_MS = 2000; // Delay before retrying a failed request

// Stats tracking
const stats = {
  totalTokenListFiles: 0,
  totalAssetFiles: 0,
  totalTokens: 0,
  totalLogos: 0,
  // HTTP validation
  checkedUrls: 0,
  workingUrls: 0,
  brokenUrls: 0,
  retriedUrls: 0,
  timeoutUrls: 0,
  // Local file validation
  checkedLocalPaths: 0,
  existingLocalFiles: 0,
  missingLocalFiles: 0,
  invalidLocalPaths: 0,
  errors: []
};

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Record an error in stats
 * @param {string} identifier - The URL or path that had an error
 * @param {string} message - Error message
 * @param {string} type - Error type (http, file, etc)
 * @param {Object} metadata - Additional metadata about the error
 */
function recordError(identifier, message, type, metadata = {}) {
  stats.errors.push({ 
    identifier, 
    message, 
    type, 
    ...metadata 
  });
  
  let icon = '❌';
  if (type === 'timeout') icon = '⏱️';
  else if (type === 'redirect') icon = '🔄';
  
  console.log(`${icon} ${type.toUpperCase()}: ${identifier} (${message})`);
}

/**
 * Fetch a URL and check if it's accessible with retry capability
 * @param {string} url - The URL to check
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<boolean>} - True if URL returns 200, false otherwise
 */
async function checkUrl(url, retryCount = 0) {
  return new Promise(async (resolve) => {
    // Skip non-HTTP URLs - these will be checked by the file system validator
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      resolve(true);
      return;
    }

    try {
      const parsedUrl = new URL(url);
      const requestModule = parsedUrl.protocol === 'https:' ? https : http;
      
      const request = requestModule.get(url, {
        headers: { 
          'User-Agent': USER_AGENT,
          'Accept': 'image/png,image/*'
        },
        timeout: TIMEOUT_MS
      }, (response) => {
        // Consume the response data to release memory
        let data = [];
        response.on('data', chunk => data.push(chunk));
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            stats.workingUrls++;
            resolve(true);
          } else if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            // Handle redirects
            if (retryCount < MAX_RETRIES) {
              stats.retriedUrls++;
              setTimeout(() => {
                checkUrl(response.headers.location, retryCount + 1).then(resolve);
              }, RETRY_DELAY_MS);
            } else {
              recordError(url, `Too many redirects: ${response.statusCode}`, 'redirect');
              stats.brokenUrls++;
              resolve(false);
            }
          } else {
            recordError(url, `HTTP ${response.statusCode} ${response.statusMessage}`, 'http');
            stats.brokenUrls++;
            
            // Retry on server errors (5xx) or specific client errors
            if (retryCount < MAX_RETRIES && 
                (response.statusCode >= 500 || 
                 response.statusCode === 429)) {
              scheduleRetry(url, retryCount, resolve);
            } else {
              resolve(false);
            }
          }
        });
      });

      request.on('error', (error) => {
        recordError(url, error.message, 'http');
        stats.brokenUrls++;
        
        if (retryCount < MAX_RETRIES) {
          scheduleRetry(url, retryCount, resolve);
        } else {
          resolve(false);
        }
      });

      request.on('timeout', () => {
        request.destroy();
        stats.timeoutUrls++;
        recordError(url, 'Request timed out', 'timeout');
        stats.brokenUrls++;
        
        if (retryCount < MAX_RETRIES) {
          scheduleRetry(url, retryCount, resolve);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      recordError(url, `Invalid URL: ${error.message}`, 'http');
      stats.brokenUrls++;
      resolve(false);
    }
  });
}

/**
 * Schedule a retry attempt
 * @param {string} url - The URL to retry
 * @param {number} retryCount - Current retry attempt
 * @param {function} resolve - Promise resolve function
 */
function scheduleRetry(url, retryCount, resolve) {
  const nextRetry = retryCount + 1;
  const delay = RETRY_DELAY_MS * (nextRetry);
  
  stats.retriedUrls++;
  console.log(`🔄 Retrying (${nextRetry}/${MAX_RETRIES}): ${url} in ${delay}ms`);
  
  setTimeout(() => {
    checkUrl(url, nextRetry).then(resolve);
  }, delay);
}

/**
 * Process URLs in batches to avoid overloading
 * @param {string[]} urls - Array of URLs to check
 * @returns {Promise<void>}
 */
async function processBatch(urls) {
  for (let i = 0; i < urls.length; i += CONCURRENT_REQUESTS) {
    const batch = urls.slice(i, i + CONCURRENT_REQUESTS);
    await Promise.all(batch.map(url => {
      stats.checkedUrls++;
      return checkUrl(url);
    }));
    
    // Add a delay between batches to prevent rate limiting
    if (i + CONCURRENT_REQUESTS < urls.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
    
    // Show progress
    const progress = Math.min(stats.checkedUrls / urls.length * 100, 100).toFixed(1);
    process.stdout.write(`\rHTTP Progress: ${progress}% (${stats.checkedUrls}/${urls.length}) | ✅ ${stats.workingUrls} | ❌ ${stats.brokenUrls} | 🔄 ${stats.retriedUrls}`);
  }
  process.stdout.write('\n');
}

/**
 * Extracts all token information from tokenlist files
 * @returns {Object[]} - Array of token objects with logoURI info
 */
function extractAllTokensWithLogos() {
  const tokens = [];
  
  // Get all JSON files in the tokenlists directory
  const files = fs.readdirSync(TOKENLISTS_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(TOKENLISTS_DIR, file));
  
  stats.totalTokenListFiles = files.length;
  console.log(`Found ${stats.totalTokenListFiles} tokenlist files`);
  
  // Process each file
  for (const file of files) {
    try {
      const fileContent = fs.readFileSync(file, 'utf8');
      const tokenList = JSON.parse(fileContent);
      
      if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
        console.warn(`Warning: No tokens array in ${path.basename(file)}`);
        continue;
      }
      
      // Add file info to each token for better error reporting
      const tokensFromFile = tokenList.tokens.map(token => ({
        ...token,
        _source: path.basename(file)
      }));
      
      tokens.push(...tokensFromFile);
      console.log(`${path.basename(file)}: ${tokensFromFile.length} tokens`);
    } catch (error) {
      console.error(`Error processing file ${file}: ${error.message}`);
    }
  }
  
  return tokens;
}

/**
 * Extracts all unique logoURI values from tokens
 * @param {Object[]} tokens - Array of token objects
 * @returns {string[]} - Array of unique logoURI values
 */
function extractUniqueLogoURIs(tokens) {
  // Use Set to track unique URLs
  const urlSet = new Set();
  
  for (const token of tokens) {
    if (token.logoURI && typeof token.logoURI === 'string') {
      urlSet.add(token.logoURI);
    }
  }
  
  return Array.from(urlSet);
}

/**
 * Check if local logo file exists based on token data
 * @param {Object} token - Token object containing chainId and address
 * @returns {Object} - Validation result with status and details
 */
function validateLocalLogoFile(token) {
  if (!token.chainId || !token.address) {
    return {
      isValid: false,
      message: 'Missing chainId or address',
      type: 'invalid_token'
    };
  }
  
  // Clean address (ensure lowercase)
  const address = token.address.toLowerCase();
  const chainId = token.chainId.toString();
  
  // Expected logo path in assets directory
  const expectedLogoPath = path.join(ASSETS_DIR, chainId, 'logos', `${address}.png`);
  stats.checkedLocalPaths++;
  
  // Check if the file exists
  if (fs.existsSync(expectedLogoPath)) {
    stats.existingLocalFiles++;
    return {
      isValid: true,
      path: expectedLogoPath
    };
  } else {
    stats.missingLocalFiles++;
    return {
      isValid: false,
      message: `Logo file doesn't exist at expected path: ${expectedLogoPath}`,
      type: 'missing_file',
      path: expectedLogoPath
    };
  }
}

/**
 * Verify that local logo references in logoURI actually point to existing files
 * @param {Object[]} tokens - Array of token objects
 */
function validateLocalLogoFiles(tokens) {
  console.log('\nValidating local logo files...');
  const failures = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Skip tokens without chainId, address, or logoURI
    if (!token.chainId || !token.address || !token.logoURI) continue;
    
    // Validate only if the logoURI is relative or refers to this repo
    if (token.logoURI.startsWith('http') && 
        !token.logoURI.includes('raw.githubusercontent.com/First-Point/cosmohub-token-list')) {
      continue;
    }
    
    const result = validateLocalLogoFile(token);
    if (!result.isValid) {
      failures.push({
        token,
        error: result
      });
      
      recordError(
        `${token.symbol || token.name || 'Unknown'} (${token.address})`, 
        result.message,
        'file',
        { 
          chainId: token.chainId,
          address: token.address,
          symbol: token.symbol,
          source: token._source,
          logoURI: token.logoURI
        }
      );
    }
    
    // Show progress every 100 tokens
    if (i % 100 === 0) {
      process.stdout.write(`\rFile Progress: ${i}/${tokens.length} | ✅ ${stats.existingLocalFiles} | ❌ ${stats.missingLocalFiles}`);
    }
  }
  
  process.stdout.write(`\rFile Progress: ${tokens.length}/${tokens.length} | ✅ ${stats.existingLocalFiles} | ❌ ${stats.missingLocalFiles}\n`);
  return failures;
}

/**
 * Main function to validate token logo URIs
 */
async function main() {
  try {
    console.log('Logo URL and File Validator');
    console.log('===========================');
    console.log(`HTTP Timeout: ${TIMEOUT_MS}ms | Concurrent requests: ${CONCURRENT_REQUESTS} | Max retries: ${MAX_RETRIES}`);
    
    // Extract all tokens from tokenlist files
    const allTokens = extractAllTokensWithLogos();
    stats.totalTokens = allTokens.length;
    
    // Extract unique logo URIs for HTTP validation
    const uniqueLogoURIs = extractUniqueLogoURIs(allTokens);
    stats.totalLogos = uniqueLogoURIs.length;
    
    console.log(`\nTotal tokens: ${stats.totalTokens}`);
    console.log(`Unique logo URIs: ${stats.totalLogos}`);
    
    // Phase 1: HTTP validation of remote URLs
    console.log('\nPhase 1: Validating HTTP accessibility of remote logo URLs...');
    await processBatch(uniqueLogoURIs);
    
    // Phase 2: Local file validation
    console.log('\nPhase 2: Validating existence of local logo files...');
    const localFileFailures = validateLocalLogoFiles(allTokens);
    
    // Print summary
    console.log('\n=============================');
    console.log('Results Summary:');
    console.log('=============================');
    console.log(`Total tokens: ${stats.totalTokens}`);
    console.log(`Unique logo URIs: ${stats.totalLogos}`);
    console.log('\nHTTP Validation:');
    console.log(`- URLs checked: ${stats.checkedUrls}`);
    console.log(`- Working URLs: ${stats.workingUrls}`);
    console.log(`- Broken URLs: ${stats.brokenUrls}`);
    console.log(`- Retried URLs: ${stats.retriedUrls}`);
    console.log(`- Timeout URLs: ${stats.timeoutUrls}`);
    console.log('\nLocal File Validation:');
    console.log(`- Paths checked: ${stats.checkedLocalPaths}`);
    console.log(`- Existing files: ${stats.existingLocalFiles}`);
    console.log(`- Missing files: ${stats.missingLocalFiles}`);
    
    if (stats.errors.length > 0) {
      console.log('\n=============================');
      console.log('Errors By Type:');
      console.log('=============================');
      
      // Group errors by type
      const errorTypes = {};
      stats.errors.forEach(error => {
        if (!errorTypes[error.type]) {
          errorTypes[error.type] = [];
        }
        errorTypes[error.type].push(error);
      });
      
      // Print errors grouped by type
      for (const [type, errors] of Object.entries(errorTypes)) {
        console.log(`\n${type.toUpperCase()} errors (${errors.length}):`);
        
        if (type === 'file') {
          // For file errors, group by chainId for better readability
          const byChain = {};
          errors.forEach(error => {
            const chainId = error.chainId || 'unknown';
            if (!byChain[chainId]) {
              byChain[chainId] = [];
            }
            byChain[chainId].push(error);
          });
          
          for (const [chainId, chainErrors] of Object.entries(byChain)) {
            console.log(`  Chain ID ${chainId} (${chainErrors.length} errors):`);
            chainErrors.slice(0, 10).forEach(error => {
              console.log(`  - ${error.symbol || 'Unknown'} (${error.address}): ${error.message}`);
            });
            if (chainErrors.length > 10) {
              console.log(`  ... and ${chainErrors.length - 10} more`);
            }
          }
        } else {
          // For HTTP errors, just show the broken URLs
          errors.slice(0, 10).forEach(error => {
            console.log(`  - ${error.identifier}: ${error.message}`);
          });
          if (errors.length > 10) {
            console.log(`  ... and ${errors.length - 10} more`);
          }
        }
      }
    }
    
    // Exit with error code if there are issues
    const hasIssues = stats.brokenUrls > 0 || stats.missingLocalFiles > 0;
    process.exit(hasIssues ? 1 : 0);
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
}); 