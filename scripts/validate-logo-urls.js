#!/usr/bin/env node

/**
 * Logo URL Validator
 * 
 * This script checks all logoURI URLs in tokenlist files to ensure they are accessible.
 * It makes HTTP requests to each URL and reports any that are not working (non-200 responses).
 * 
 * Features:
 * - Increased timeout for slow connections
 * - Retry mechanism for failed requests
 * - Adaptive concurrency to avoid overwhelming servers
 * - Detailed error reporting
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const TOKENLISTS_DIR = path.join(__dirname, '../tokenlists');
const USER_AGENT = 'LogoURLValidator/1.0';
const TIMEOUT_MS = 15000; // Increased from 5000 to 15000ms
const MAX_RETRIES = 2; // Number of retry attempts for failed requests
const CONCURRENT_REQUESTS = 5; // Reduced from 10 to 5 to avoid overwhelming servers
const DELAY_BETWEEN_BATCHES_MS = 1000; // Increased delay between batches
const RETRY_DELAY_MS = 2000; // Delay before retrying a failed request

// Stats tracking
const stats = {
  totalFiles: 0,
  totalUrls: 0,
  checkedUrls: 0,
  workingUrls: 0,
  brokenUrls: 0,
  retriedUrls: 0,
  timeoutUrls: 0,
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
 * Fetch a URL and check if it's accessible with retry capability
 * @param {string} url - The URL to check
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<boolean>} - True if URL returns 200, false otherwise
 */
async function checkUrl(url, retryCount = 0) {
  return new Promise(async (resolve) => {
    // Skip non-HTTP URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.log(`Skipping non-HTTP URL: ${url}`);
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
              console.log(`🔄 Following redirect: ${url} → ${response.headers.location}`);
              setTimeout(() => {
                checkUrl(response.headers.location, retryCount + 1).then(resolve);
              }, RETRY_DELAY_MS);
            } else {
              recordError(url, `Too many redirects: ${response.statusCode}`);
              resolve(false);
            }
          } else {
            recordError(url, `HTTP ${response.statusCode} ${response.statusMessage}`);
            
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
        recordError(url, error.message);
        
        if (retryCount < MAX_RETRIES) {
          scheduleRetry(url, retryCount, resolve);
        } else {
          resolve(false);
        }
      });

      request.on('timeout', () => {
        request.destroy();
        stats.timeoutUrls++;
        recordError(url, 'Request timed out');
        
        if (retryCount < MAX_RETRIES) {
          scheduleRetry(url, retryCount, resolve);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      recordError(url, `Invalid URL: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Record an error in stats
 * @param {string} url - The URL that had an error
 * @param {string} message - Error message
 */
function recordError(url, message) {
  stats.brokenUrls++;
  stats.errors.push({ url, message });
  console.log(`❌ Error: ${url} (${message})`);
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
    const progress = Math.min(stats.checkedUrls / stats.totalUrls * 100, 100).toFixed(1);
    process.stdout.write(`\rProgress: ${progress}% (${stats.checkedUrls}/${stats.totalUrls}) | ✅ ${stats.workingUrls} | ❌ ${stats.brokenUrls} | 🔄 ${stats.retriedUrls}`);
  }
  process.stdout.write('\n');
}

/**
 * Extract unique logoURI values from a token list
 * @param {Object} tokenList - The token list object
 * @returns {string[]} - Array of unique logoURI values
 */
function extractLogoUrls(tokenList) {
  if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
    return [];
  }
  
  // Use Set to track unique URLs
  const urlSet = new Set();
  
  for (const token of tokenList.tokens) {
    if (token.logoURI && typeof token.logoURI === 'string') {
      urlSet.add(token.logoURI);
    }
  }
  
  return Array.from(urlSet);
}

/**
 * Main function to process all token list files
 */
async function main() {
  try {
    console.log('Logo URL Validator (Enhanced)');
    console.log('=============================');
    console.log(`Timeout: ${TIMEOUT_MS}ms | Concurrent requests: ${CONCURRENT_REQUESTS} | Max retries: ${MAX_RETRIES}`);
    
    // Get all JSON files in the tokenlists directory
    const files = fs.readdirSync(TOKENLISTS_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(TOKENLISTS_DIR, file));
    
    stats.totalFiles = files.length;
    console.log(`Found ${stats.totalFiles} tokenlist files`);
    
    // Collect all logoURI values from all files
    const allUrls = [];
    
    for (const file of files) {
      try {
        const fileContent = fs.readFileSync(file, 'utf8');
        const tokenList = JSON.parse(fileContent);
        const urls = extractLogoUrls(tokenList);
        
        console.log(`${path.basename(file)}: ${urls.length} unique logo URLs`);
        allUrls.push(...urls);
      } catch (error) {
        console.error(`Error processing file ${file}: ${error.message}`);
      }
    }
    
    // Remove duplicates across files
    const uniqueUrls = [...new Set(allUrls)];
    stats.totalUrls = uniqueUrls.length;
    
    console.log(`\nTotal unique logo URLs to check: ${stats.totalUrls}`);
    console.log('\nChecking URLs...');
    
    // Process all URLs
    await processBatch(uniqueUrls);
    
    // Print summary
    console.log('\n=============================');
    console.log('Results Summary:');
    console.log('=============================');
    console.log(`Total URLs checked: ${stats.checkedUrls}`);
    console.log(`Working URLs: ${stats.workingUrls}`);
    console.log(`Broken URLs: ${stats.brokenUrls}`);
    console.log(`Retried URLs: ${stats.retriedUrls}`);
    console.log(`Timeout URLs: ${stats.timeoutUrls}`);
    
    if (stats.brokenUrls > 0) {
      console.log('\n=============================');
      console.log('Broken URLs:');
      console.log('=============================');
      
      // Group errors by error message
      const errorsByMessage = {};
      stats.errors.forEach(error => {
        if (!errorsByMessage[error.message]) {
          errorsByMessage[error.message] = [];
        }
        errorsByMessage[error.message].push(error.url);
      });
      
      // Print errors grouped by message type
      for (const [message, urls] of Object.entries(errorsByMessage)) {
        console.log(`\n${message} (${urls.length} URLs):`);
        urls.forEach(url => console.log(`- ${url}`));
      }
    }
    
    process.exit(stats.brokenUrls > 0 ? 1 : 0);
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