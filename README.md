# Cosmohub Token List

This repository contains the token lists used by [Cosmohub](https://cosmohub.ai) for various blockchain networks. It serves as a central source of truth for token information and metadata across different chains.

## Supported Networks

Currently, we support the following networks:

- Ethereum (ETH)
- Avalanche (AVAX)

## Directory Structure

```
cosmohub-token-list/
│── tokenlists/           # JSON files containing token information
│   ├── common_eth.json   # Ethereum tokens
│   ├── common_avax.json  # Avalanche tokens
│── images/               # Token logos
│   ├── eth/             # Ethereum token images
│   ├── avax/            # Avalanche token images
```

## Token List Schema

Each token list file contains an array of tokens with the following structure:

```json
{
  "tokens": [
    {
      "chainId": 1, // The chain ID of the network
      "address": "0x...", // The token contract address
      "name": "Token Name", // The name of the token
      "symbol": "TKN", // The token symbol
      "decimals": 18, // The number of decimals for the token
      "logoURI": "https://..." // URL to the token logo
    }
  ]
}
```

### Chain IDs

- Ethereum (ETH): 1
- Avalanche (AVAX): 43114

## Image Requirements

- Format: PNG
- Background: Transparent
- Dimensions: 120x120 pixels
- File naming: `{token_address}.png`
- Location: Place in the corresponding network folder under `images/`

## How to Contribute

1. Fork this repository
2. Create a new branch for your changes
3. Add your token information to the appropriate JSON file
4. Add your token logo to the correct network folder
5. Ensure your changes meet our requirements
6. Submit a pull request

For detailed contribution guidelines, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Validation

Before submitting a pull request, please ensure:

- Your JSON files are properly formatted and valid
- Token logos meet the specified requirements
- All required fields are present in token entries
- The token contract address is valid and verified

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions, issues, or suggestions:

- Open an issue in this repository
- Contact the Cosmohub team through our official channels

## Security

If you discover any security-related issues, please email security@cosmohub.ai instead of using the issue tracker.
