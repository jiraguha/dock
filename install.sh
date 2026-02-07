#!/bin/bash
set -e

# Dock CLI Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/jiraguha/dock/main/install.sh | bash

REPO="jiraguha/dock"
INSTALL_DIR="${DOCK_INSTALL_DIR:-/usr/local/bin}"
DOCK_HOME="${HOME}/.dock"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Detect OS and architecture
detect_platform() {
  OS="$(uname -s)"
  ARCH="$(uname -m)"

  case "$OS" in
    Linux)  OS="linux" ;;
    Darwin) OS="darwin" ;;
    *)      error "Unsupported OS: $OS" ;;
  esac

  case "$ARCH" in
    x86_64|amd64)  ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *)             error "Unsupported architecture: $ARCH" ;;
  esac

  PLATFORM="${OS}-${ARCH}"
  info "Detected platform: $PLATFORM"
}

# Get latest release version
get_latest_version() {
  VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
  if [ -z "$VERSION" ]; then
    error "Could not determine latest version"
  fi
  info "Latest version: $VERSION"
}

# Download and install
install() {
  BINARY_NAME="dock-${PLATFORM}"
  DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${BINARY_NAME}"

  info "Downloading from: $DOWNLOAD_URL"

  # Create temp directory
  TMP_DIR=$(mktemp -d)
  trap "rm -rf $TMP_DIR" EXIT

  # Download binary
  if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/dock"; then
    error "Failed to download binary"
  fi

  # Make executable
  chmod +x "$TMP_DIR/dock"

  # Verify it runs
  if ! "$TMP_DIR/dock" --version > /dev/null 2>&1; then
    error "Downloaded binary failed to execute"
  fi

  # Install to target directory
  if [ -w "$INSTALL_DIR" ]; then
    mv "$TMP_DIR/dock" "$INSTALL_DIR/dock"
  else
    info "Installing to $INSTALL_DIR requires sudo..."
    sudo mv "$TMP_DIR/dock" "$INSTALL_DIR/dock"
  fi

  info "Installed dock to $INSTALL_DIR/dock"
}

# Create dock home directory
setup_dock_home() {
  if [ ! -d "$DOCK_HOME" ]; then
    mkdir -p "$DOCK_HOME"
    info "Created $DOCK_HOME"
  fi
}

# Verify installation
verify() {
  if command -v dock &> /dev/null; then
    INSTALLED_VERSION=$(dock --version)
    info "Successfully installed: $INSTALLED_VERSION"
  else
    warn "dock installed but not in PATH"
    warn "Add $INSTALL_DIR to your PATH:"
    warn "  export PATH=\"$INSTALL_DIR:\$PATH\""
  fi
}

# Set up shell integration
setup_shell_integration() {
  if command -v dock &> /dev/null; then
    info "Setting up shell integration..."
    dock init
    echo ""
  fi
}

main() {
  echo ""
  echo "  ____             _    "
  echo " |  _ \\  ___   ___| | __"
  echo " | | | |/ _ \\ / __| |/ /"
  echo " | |_| | (_) | (__|   < "
  echo " |____/ \\___/ \\___|_|\\_\\"
  echo ""
  echo " Disposable Remote Development Environment"
  echo ""

  detect_platform
  get_latest_version
  install
  setup_dock_home
  verify
  setup_shell_integration

  echo ""
  info "Installation complete!"
  echo ""
  echo "Get started:"
  echo "  1. Set up your Scaleway credentials in ~/.dock/.env"
  echo "  2. Run: dock create"
  echo ""
  echo "Shell integration has been added. Restart your terminal or run:"
  echo "  source ~/.dock/dock.init"
  echo ""
  echo "For help: dock --help"
  echo ""
}

main
