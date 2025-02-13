# Contributing to Cosmohub Token List

Thank you for your interest in contributing to the Cosmohub Token List! This document provides guidelines and instructions for contributing.

## Adding a New Token

### Prerequisites

Before submitting a new token, ensure:

1. The token is deployed on a supported network
2. The token contract is verified on the network's block explorer
3. The token has genuine trading activity
4. You have a high-quality logo image ready

### Token List Structure

Each token list file follows this structure:

```json
{
  "tokens": [
    {
      "chainId": "Network specific chain ID",
      "address": "Token contract address",
      "name": "Official token name",
      "symbol": "Token symbol",
      "decimals": "Number of decimals",
      "logoURI": "URL to the token logo"
    }
  ]
}
```

### Chain IDs for Supported Networks

- Ethereum (ETH): 1
- Avalanche (AVAX): 43114

### Logo Requirements

1. **Format**: PNG with transparent background
2. **Dimensions**: 120x120 pixels
3. **File size**: Maximum 50KB
4. **File name**: Must match the token's contract address (e.g., `0x123...abc.png`)
5. **Location**: Place in the appropriate network folder under `images/`

### Step-by-Step Guide

1. Fork the Repository

   ```bash
   git clone https://github.com/YOUR_USERNAME/cosmohub-token-list.git
   cd cosmohub-token-list
   git checkout -b add-token-NAME
   ```

2. Add Token Logo

   - Place your token logo in the appropriate network folder
   - Ensure it meets all image requirements

3. Add Token Information

   - Open the appropriate token list file in `tokenlists/`
   - Add your token information to the `tokens` array
   - Maintain alphabetical ordering by symbol
   - Ensure proper JSON formatting with the array structure

4. Validate Your Changes

   - Ensure JSON is properly formatted
   - Verify all required fields are present
   - Check that the logo meets requirements
   - Verify the chainId matches the network

5. Submit Pull Request
   - Push your changes to your fork
   - Create a pull request to the main repository
   - Fill out the pull request template completely

## Pull Request Requirements

Your pull request description should include:

- Token contract address
- Link to the verified contract on the block explorer
- Brief description of the token
- Any additional relevant information

## Review Process

1. Automated checks will verify:

   - JSON format and structure
   - Image requirements
   - Required fields presence
   - Chain ID correctness

2. Manual review will check:
   - Token legitimacy
   - Contract verification
   - Trading activity
   - Logo quality

## Code Style

- Use 2 spaces for indentation in JSON files
- Maintain alphabetical ordering of tokens by symbol within the tokens array
- Follow existing formatting in the repository
- Always include the `tokens` array wrapper in the JSON files

## Questions or Issues?

If you have questions or run into issues:

1. Check existing issues and pull requests
2. Open a new issue if needed
3. Join our community channels for support

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
