#!/bin/bash

# Token List Synchronization Script
# This script fetches and updates token lists from multiple sources

echo "======================================================="
echo "CosmoHub Token List Synchronization"
echo "======================================================="

# Processing Uniswap Token Repository
echo -e "\n=== Processing Uniswap Token Repository ==="
cd token-sync/uniswap
if [ ! -d "default-token-list" ]; then
  echo "Cloning Uniswap token repository..."
  git clone https://github.com/Uniswap/default-token-list.git
else
  echo "Updating Uniswap token repository..."
  cd default-token-list
  git pull
  cd ..
fi
echo "Running Uniswap token synchronization..."
node sync-uniswap.js
cd ../..

# Processing TraderJoe Token Repository
echo -e "\n=== Processing TraderJoe Token Repository ==="
cd token-sync/traderjoe
echo "Running TraderJoe token synchronization..."
node sync-joe.js
cd ../..

# Processing Pangolin Token Repository
echo -e "\n=== Processing Pangolin Token Repository ==="
cd token-sync/pangolin
echo "Running Pangolin token synchronization..."
node sync-pangolin.js
cd ../..

# Processing TrustWallet Token Repository
echo -e "\n=== Processing TrustWallet Token Repository ==="
cd token-sync/trustwallet
echo "Running TrustWallet token synchronization..."
node sync-trustwallet.js
cd ../..

# Updating popular tokens based on market cap
echo -e "\n=== Updating Popular Tokens Based on Market Cap ==="
echo "Running popular token update script..."
node update-popular-tokens.js

echo -e "\n=== All token lists have been updated successfully! ===" 