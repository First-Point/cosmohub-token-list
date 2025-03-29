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