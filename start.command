#!/bin/bash
# Wumpa Rush launcher for macOS.
# Double-click this file in Finder (or run ./start.command in Terminal).
# It installs dependencies on first run, starts the dev server and opens your browser.

cd "$(dirname "$0")" || exit 1

# Finder launches scripts with a minimal PATH - add the usual Node locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

echo "=============================================="
echo "   WUMPA RUSH  -  Run wild. Smash everything."
echo "=============================================="

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo
  echo "Node.js (v18 or newer) is required but was not found."
  echo "Install it with Homebrew:   brew install node"
  echo "or download it from:        https://nodejs.org"
  echo
  read -r -p "Press Enter to close..." _
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node $(node -v) is too old. Please install Node 18 or newer (https://nodejs.org)."
  read -r -p "Press Enter to close..." _
  exit 1
fi

if [ ! -d node_modules ] || [ ! -d node_modules/three ] || [ ! -d node_modules/vite ]; then
  echo "Installing dependencies (first run only)..."
  if ! npm install --no-audit --no-fund; then
    echo
    echo "npm install failed. Check your internet connection and try again."
    read -r -p "Press Enter to close..." _
    exit 1
  fi
fi

echo
echo "Starting the game - your browser will open automatically."
echo "Keep this window open while you play. Press Ctrl+C to stop."
echo

exec npx vite --open
