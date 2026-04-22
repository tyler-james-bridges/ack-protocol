#!/bin/bash
# ACP Seller runtime wrapper for launchctl
cd /Users/tjb/code/ack-protocol/services/acp-seller
exec /opt/homebrew/bin/npx tsx src/seller/runtime/seller.ts
