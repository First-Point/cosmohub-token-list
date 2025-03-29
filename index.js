/**
 * CosmosHub Token List
 * 
 * This file exposes the token lists as a module.
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

/**
 * Get all supported chain IDs
 * @returns {Promise<Array<number>>} Array of supported chain IDs
 */
async function getChainIds() {
  const chainDirs = await glob('assets/*/', { posix: true });
  return chainDirs.map(dir => {
    const chainId = path.basename(path.dirname(dir));
    return parseInt(chainId, 10);
  }).filter(chainId => !isNaN(chainId));
}

/**
 * Get all tokens for a specific chain
 * @param {number} chainId The chain ID to get tokens for
 * @returns {Promise<Array<Object>>} Array of token objects
 */
async function getTokens(chainId) {
  const commonPath = path.join(__dirname, 'assets', chainId.toString(), 'common.json');
  
  try {
    const commonData = await fs.readJson(commonPath);
    return commonData.tokens || [];
  } catch (error) {
    throw new Error(`Failed to load tokens for chain ${chainId}: ${error.message}`);
  }
}

/**
 * Get popular tokens for a specific chain
 * @param {number} chainId The chain ID to get popular tokens for
 * @returns {Promise<Array<Object>>} Array of popular token objects
 */
async function getPopularTokens(chainId) {
  const popularPath = path.join(__dirname, 'assets', chainId.toString(), 'popular.json');
  
  try {
    const popularData = await fs.readJson(popularPath);
    return popularData.tokens || [];
  } catch (error) {
    throw new Error(`Failed to load popular tokens for chain ${chainId}: ${error.message}`);
  }
}

/**
 * Get a token by its address for a specific chain
 * @param {number} chainId The chain ID
 * @param {string} address The token address
 * @returns {Promise<Object|null>} The token object or null if not found
 */
async function getTokenByAddress(chainId, address) {
  const tokens = await getTokens(chainId);
  
  // Normalize address for comparison
  const normalizedAddress = address.toLowerCase();
  
  return tokens.find(token => token.address.toLowerCase() === normalizedAddress) || null;
}

/**
 * Get all token lists for all chains
 * @returns {Promise<Object>} Object with chain IDs as keys and token arrays as values
 */
async function getAllTokens() {
  const chainIds = await getChainIds();
  const result = {};
  
  for (const chainId of chainIds) {
    result[chainId] = await getTokens(chainId);
  }
  
  return result;
}

module.exports = {
  getChainIds,
  getTokens,
  getPopularTokens,
  getTokenByAddress,
  getAllTokens
}; 