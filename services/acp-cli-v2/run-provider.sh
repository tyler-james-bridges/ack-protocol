#!/bin/bash
set -e
cd "$(dirname "$0")"
exec /opt/homebrew/bin/npm run provider
