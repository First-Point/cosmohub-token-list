#!/usr/bin/env node

/**
 * Logo URL Validator
 * 
 * This script checks all logoURI URLs in tokenlist files to ensure they are accessible.
 * It makes HTTP requests to each URL and reports any that are not working (non-200 responses).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const TOKENLISTS_DIR = path.join(__dirname, '../tokenlists');
const USER_AGENT = 'LogoURLValidator/1.0';
const TIMEOUT_MS = 5000;
const CONCURRENT_REQUESTS = 10; // Limit concurrent requests to avoid rate limiting

// Stats tracking
const stats = {
  totalFiles: 0,
  totalUrls: 0,
  checkedUrls: 0,
  workingUrls: 0,
  brokenUrls: 0,
  errors: []
};

/**
 * Fetch a URL and check if it's accessible
 * @param {string} url - The URL to check
 * @returns {Promise<boolean>} - True if URL returns 200, false otherwise
 */
function checkUrl(url) {
  return new Promise((resolve) => {
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
        headers: { 'User-Agent': USER_AGENT },
        timeout: TIMEOUT_MS
      }, (response) => {
        if (response.statusCode === 200) {
          stats.workingUrls++;
          resolve(true);
        } else {
          stats.brokenUrls++;
          stats.errors.push({
            url,
            statusCode: response.statusCode,
            message: `HTTP ${response.statusCode} ${response.statusMessage}`
          });
          console.log(`❌ Broken URL: ${url} (HTTP ${response.statusCode})`);
          resolve(false);
        }
      });

      request.on('error', (error) => {
        stats.brokenUrls++;
        stats.errors.push({
          url,
          message: error.message
        });
        console.log(`❌ Error checking URL: ${url} (${error.message})`);
        resolve(false);
      });

      request.on('timeout', () => {
        request.abort();
        stats.brokenUrls++;
        stats.errors.push({
          url,
          message: 'Request timed out'
        });
        console.log(`❌ Timeout checking URL: ${url}`);
        resolve(false);
      });
    } catch (error) {
      stats.brokenUrls++;
      stats.errors.push({
        url,
        message: `Invalid URL: ${error.message}`
      });
      console.log(`❌ Invalid URL: ${url} (${error.message})`);
      resolve(false);
    }
  });
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
    
    // Add a small delay between batches to prevent rate limiting
    if (i + CONCURRENT_REQUESTS < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Show progress
    const progress = Math.min(stats.checkedUrls / stats.totalUrls * 100, 100).toFixed(1);
    process.stdout.write(`\rProgress: ${progress}% (${stats.checkedUrls}/${stats.totalUrls})`);
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
    console.log('Logo URL Validator');
    console.log('=================');
    
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
    console.log('\n=================');
    console.log('Results Summary:');
    console.log('=================');
    console.log(`Total URLs checked: ${stats.checkedUrls}`);
    console.log(`Working URLs: ${stats.workingUrls}`);
    console.log(`Broken URLs: ${stats.brokenUrls}`);
    
    if (stats.brokenUrls > 0) {
      console.log('\n=================');
      console.log('Broken URLs:');
      console.log('=================');
      
      for (const error of stats.errors) {
        console.log(`${error.url}\n  - Error: ${error.message}`);
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