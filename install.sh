#!/usr/bin/env bash
#
# Open3DInspection — environment setup
# Installs Node.js dependencies and verifies the project builds.
#
# Usage:
#   ./install.sh           # install deps + run build check
#   ./install.sh --dev     # install deps only (faster, for local dev)
#   ./install.sh --help
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MIN_NODE_MAJOR=18
SKIP_BUILD=0

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Open3DInspection install script

Installs npm dependencies for this Vite + React + TypeScript app.
No .env file is required — the app runs entirely in the browser.

Options:
  --dev       Install dependencies only (skip production build check)
  --help      Show this help

Requirements:
  - Node.js >= 18 (20 LTS recommended)
  - npm >= 9 (bundled with Node)

After install:
  npm run dev      Start dev server (http://localhost:5173)
  npm run build    Production build
  npm run preview  Preview production build
EOF
}

for arg in "$@"; do
  case "$arg" in
    --dev) SKIP_BUILD=1 ;;
    --help|-h) usage; exit 0 ;;
    *) err "Unknown option: $arg (try --help)" ;;
  esac
done

# --- Prerequisites -----------------------------------------------------------

log "Checking prerequisites…"

if ! command -v node >/dev/null 2>&1; then
  cat >&2 <<'EOF'
error: Node.js is not installed.

Install Node.js 20 LTS, then re-run this script:
  macOS (Homebrew):  brew install node@20
  Ubuntu/Debian:     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
  nvm:               nvm install 20 && nvm use 20
  https://nodejs.org/
EOF
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  err "npm is not installed. Install Node.js (npm is included) and re-run."
fi

NODE_VERSION="$(node -p "process.versions.node")"
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
NPM_VERSION="$(npm -v)"

if [[ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]]; then
  err "Node.js $NODE_VERSION found; need >= $MIN_NODE_MAJOR. Upgrade Node and re-run."
fi

log "Node.js $NODE_VERSION · npm $NPM_VERSION"

# --- Install dependencies ----------------------------------------------------

if [[ ! -f package.json ]]; then
  err "package.json not found. Run this script from the project root."
fi

if [[ -f package-lock.json ]]; then
  log "Installing dependencies (npm ci)…"
  npm ci
else
  warn "package-lock.json missing — using npm install"
  log "Installing dependencies (npm install)…"
  npm install
fi

# --- Verify build ------------------------------------------------------------

if [[ "$SKIP_BUILD" -eq 1 ]]; then
  log "Skipping build check (--dev)"
else
  log "Verifying TypeScript compile and Vite build…"
  npm run build
fi

# --- Done --------------------------------------------------------------------

printf '\n\033[1;32m✓ Open3DInspection is ready.\033[0m\n\n'
cat <<'EOF'
  Start development server:
    npm run dev

  Open in browser:
    http://localhost:5173

  Stack: Vite · React · Three.js · Zustand
  Data is stored locally in the browser (IndexedDB + localStorage).

EOF
