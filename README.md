# CosmosHub Token List

This repository contains the official token list for [Cosmohub.ai](https://cosmohub.ai/) - a blockchain AI agent marketplace for DeFi and gaming. The token lists are organized by blockchain networks and provide standardized information for various tokens used within the Cosmohub ecosystem.

A comprehensive token list repository for multiple blockchain networks. This repository contains standardized token information for various chains, organized by chain ID.

## Structure

The repository is organized by chain ID, with each chain having its own directory containing token lists:

```
assets/
└── <chainId>/
    ├── common.json     # All tokens (detailed list)
    ├── popular.json    # Popular tokens (subset, same format)
    └── logos/          # Token logo images
```

## Token Format

Each token entry includes the following fields:

```json
{
  "chainId": 43114,     // Chain ID (number)
  "address": "0x5b...", // Token contract address (lowercase)
  "name": "Token Name", // Token name (string)
  "symbol": "TKN",      // Token symbol (string)
  "decimals": 18,       // Decimal precision (integer)
  "logoURI": "./logos/0x5b....png" // Path to token logo image
}
```

## Token Address Format

All token addresses in this repository are standardized to lowercase format:

1. In JSON files (token lists), all addresses are stored in lowercase format
2. Logo filenames in the `assets/{chainId}/logos/` directories use lowercase addresses
3. In the logoURI fields, addresses are consistently lowercase

This standardization ensures:
- Consistent behavior across different case-sensitivity environments
- Predictable paths for accessing logo files 
- Simplified address comparison logic
- Improved compatibility with case-insensitive file systems

If you're contributing to this repository, please ensure:
- All token addresses are in lowercase format
- Logo files are named using lowercase addresses (e.g., `0x1234abcd...png`)
- All scripts maintain this consistency

**Important Notes:**
- While Ethereum addresses can be represented in checksum format (mixed case) for display purposes in user interfaces, all addresses in this repository's files must be lowercase.
- Our synchronization scripts automatically convert addresses to lowercase when importing from external sources.
- The validation scripts will flag any addresses that don't conform to the lowercase standard.

## Supported Networks

The following blockchain networks are currently supported:

| Network | Chain ID | Description |
|---------|----------|-------------|
| Ethereum | 1 | Ethereum Mainnet |
| Avalanche | 43114 | Avalanche C-Chain Mainnet |
| Avalanche Fuji | 43113 | Avalanche Fuji Testnet |

## Using the Package

### Installation

```bash
npm install cosmohub-token-list
```

### Usage Examples

```javascript
const tokenList = require('cosmohub-token-list');

// Get all supported chain IDs
const chainIds = await tokenList.getChainIds();

// Get all tokens for Ethereum
const ethereumTokens = await tokenList.getTokens(1);

// Get popular tokens for Avalanche
const avalanchePopularTokens = await tokenList.getPopularTokens(43114);

// Get a specific token by address
const usdcToken = await tokenList.getTokenByAddress(43114, '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e');

// Check if a token exists
const exists = await tokenList.hasToken(43114, '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e');
```

## Features

- **Comprehensive Token Lists**: Detailed information for thousands of tokens across multiple networks
- **Popular Token Selection**: Curated lists of the most important tokens for each network
- **Standardized Format**: Consistent token data structure across all chains
- **High-Quality Logos**: All tokens include high-resolution logo images
- **Regular Updates**: Token lists are regularly maintained and updated
- **Validation**: All token data is validated for accuracy and completeness

## Data Sources

This token list aggregates data from multiple trusted sources to provide the most comprehensive and accurate token information. Our primary sources include:

- **TraderJoe**: [traderjoe-xyz/joe-tokenlists](https://github.com/traderjoe-xyz/joe-tokenlists) - Popular tokens from the TraderJoe DEX ecosystem
- **Pangolin**: 
  - [pangolindex/tokenlists](https://github.com/pangolindex/tokenlists) - Token lists from the Pangolin Exchange
  - [pangolindex/tokens](https://github.com/pangolindex/tokens) - Token assets and metadata from Pangolin
- **Uniswap**: [Uniswap/default-token-list](https://github.com/Uniswap/default-token-list) - The default token list used by the Uniswap interface
- **TrustWallet**: [trustwallet/assets](https://github.com/trustwallet/assets) - A comprehensive, up-to-date collection of token information

Our synchronization process ensures that token data is regularly updated from these sources while maintaining consistency in format and validation across all networks.

## Validation and Quality Control

All token lists in this repository go through rigorous validation to ensure:

- Valid JSON structure with required fields
- Correct token contract addresses (lowercase format)
- Accurate token information (name, symbol, decimals)
- Existence and validity of logo images
- No duplicate tokens within a network
- Proper subset relationships between popular and common token lists

## Contributing

To add or update tokens, please follow these steps:

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes (add/update tokens)
4. Ensure all validation checks pass
5. Submit a pull request

## License

[MIT License](LICENSE) 