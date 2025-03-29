#!/usr/bin/env node

/**
 * Token List Tests
 * 
 * Runs basic tests on the token lists and validation/generation scripts.
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const { ethers } = require('ethers');
const chalk = require('chalk');
const { execSync } = require('child_process');

// Track test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0
};

/**
 * Run a test and log the result
 * @param {string} name The test name
 * @param {Function} testFn The test function, should throw if failed
 */
async function runTest(name, testFn) {
  stats.total++;
  console.log(chalk.cyan(`Running test: ${name}`));
  
  try {
    await testFn();
    console.log(chalk.green('  PASSED'));
    stats.passed++;
  } catch (error) {
    console.error(chalk.red(`  FAILED: ${error.message}`));
    stats.failed++;
  }
}

/**
 * Test that all chain directories have required files
 */
async function testDirectoryStructure() {
  const chainDirs = await glob('assets/*/', { posix: true });
  
  if (chainDirs.length === 0) {
    throw new Error('No chain directories found');
  }
  
  for (const chainDir of chainDirs) {
    const commonPath = path.join(chainDir, 'common.json');
    const popularPath = path.join(chainDir, 'popular.json');
    
    if (!await fs.pathExists(commonPath)) {
      throw new Error(`Missing common.json in ${chainDir}`);
    }
    
    if (!await fs.pathExists(popularPath)) {
      throw new Error(`Missing popular.json in ${chainDir}`);
    }
  }
}

/**
 * Test that all JSON files are valid
 */
async function testValidJson() {
  const jsonFiles = await glob('assets/**/*.json', { posix: true });
  
  for (const file of jsonFiles) {
    try {
      const content = await fs.readFile(file, 'utf8');
      JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in ${file}: ${error.message}`);
    }
  }
}

/**
 * Test that all token lists have the correct structure
 */
async function testTokenListStructure() {
  const jsonFiles = await glob('assets/**/*.json', { posix: true });
  
  for (const file of jsonFiles) {
    const content = await fs.readFile(file, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.tokens || !Array.isArray(data.tokens)) {
      throw new Error(`Missing tokens array in ${file}`);
    }
  }
}

/**
 * Test that all addresses are in checksum format
 */
async function testAddressChecksum() {
  const jsonFiles = await glob('assets/**/*.json', { posix: true });
  
  for (const file of jsonFiles) {
    const content = await fs.readFile(file, 'utf8');
    const data = JSON.parse(content);
    
    for (const token of data.tokens) {
      if (!token.address) {
        throw new Error(`Token missing address in ${file}`);
      }
      
      const checksumAddress = ethers.getAddress(token.address);
      if (token.address !== checksumAddress) {
        throw new Error(`Address not in checksum format in ${file}: ${token.address}`);
      }
    }
  }
}

/**
 * Test that popular tokens are a subset of common tokens
 */
async function testPopularSubset() {
  const chainDirs = await glob('assets/*/', { posix: true });
  
  for (const chainDir of chainDirs) {
    const commonPath = path.join(chainDir, 'common.json');
    const popularPath = path.join(chainDir, 'popular.json');
    
    const commonContent = await fs.readFile(commonPath, 'utf8');
    const popularContent = await fs.readFile(popularPath, 'utf8');
    
    const common = JSON.parse(commonContent);
    const popular = JSON.parse(popularContent);
    
    // Create a map of addresses in common.json
    const commonAddresses = new Set();
    for (const token of common.tokens) {
      commonAddresses.add(token.address.toLowerCase());
    }
    
    // Check if each token in popular.json exists in common.json
    for (const token of popular.tokens) {
      const address = token.address.toLowerCase();
      if (!commonAddresses.has(address)) {
        throw new Error(`Token ${token.address} in ${popularPath} not found in common.json`);
      }
    }
  }
}

/**
 * Test that the validate script works
 */
async function testValidateScript() {
  try {
    execSync('node scripts/validate.js', { stdio: 'ignore' });
  } catch (error) {
    throw new Error(`Validation script failed with exit code ${error.status}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(chalk.blue('Starting tests...'));
  
  await runTest('Directory structure', testDirectoryStructure);
  await runTest('Valid JSON', testValidJson);
  await runTest('Token list structure', testTokenListStructure);
  await runTest('Address checksum', testAddressChecksum);
  await runTest('Popular subset', testPopularSubset);
  await runTest('Validate script', testValidateScript);
  
  // Print summary
  console.log(chalk.blue('\n-----------------------------------'));
  console.log(chalk.blue('Test Summary:'));
  console.log(chalk.blue('-----------------------------------'));
  console.log(`Total tests: ${stats.total}`);
  console.log(`Passed: ${chalk.green(stats.passed)}`);
  console.log(`Failed: ${chalk.red(stats.failed)}`);
  
  // Exit with error if any tests failed
  if (stats.failed > 0) {
    process.exit(1);
  }
}

// Run all tests
runAllTests(); 