#!/usr/bin/env bash
set -e

# VPN for All - Native Host Installer
# This script installs the native messaging host and Xray core

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     VPN for All - Native Host Setup    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)   OS_TYPE="linux" ;;
  Darwin)  OS_TYPE="darwin" ;;
  *)       echo -e "${RED}Unsupported OS: $OS${NC}"; exit 1 ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH_TYPE="64" ;;
  aarch64|arm64) ARCH_TYPE="arm64-v8a" ;;
  *)        echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
esac

echo -e "${YELLOW}Detected:${NC} $OS ($OS_TYPE) / $ARCH ($ARCH_TYPE)"
echo ""

# Determine install directory
if [ "$OS_TYPE" = "darwin" ]; then
  INSTALL_DIR="$HOME/Library/Application Support/VPNForAll"
  NATIVE_MESSAGING_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
  [ -d "$HOME/Library/Application Support/Chromium" ] && NATIVE_MESSAGING_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
else
  INSTALL_DIR="$HOME/.vpnforall"
  NATIVE_MESSAGING_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
  [ -d "$HOME/.config/chromium" ] && NATIVE_MESSAGING_DIR="$HOME/.config/chromium/NativeMessagingHosts"
  [ -d "$HOME/.config/brave" ] && NATIVE_MESSAGING_DIR="$HOME/.config/brave/NativeMessagingHosts"
  [ -d "$HOME/.config/edge" ] && NATIVE_MESSAGING_DIR="$HOME/.config/edge/NativeMessagingHosts"
fi

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$NATIVE_MESSAGING_DIR"

echo -e "${YELLOW}Step 1: Installing native host binary...${NC}"

# Build Go native host
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if command -v go &> /dev/null; then
  echo "Building native host from source..."
  go build -o "$INSTALL_DIR/vpnforall-host" "$SCRIPT_DIR"
else
  echo -e "${RED}Go is not installed. Please install Go first: https://go.dev/doc/install${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Native host installed to $INSTALL_DIR/vpnforall-host${NC}"
echo ""

echo -e "${YELLOW}Step 2: Downloading Xray core...${NC}"
XRAY_VERSION="25.12.8"
XRAY_URL="https://github.com/XTLS/Xray-core/releases/download/v${XRAY_VERSION}/Xray-${OS_TYPE}-${ARCH_TYPE}.zip"
XRAY_DIR="$INSTALL_DIR/xray-core"

mkdir -p "$XRAY_DIR"

if [ ! -f "$XRAY_DIR/xray" ]; then
  echo "Downloading Xray $XRAY_VERSION..."
  TMP_ZIP="/tmp/xray-${XRAY_VERSION}.zip"
  
  if command -v curl &> /dev/null; then
    curl -L -o "$TMP_ZIP" "$XRAY_URL"
  elif command -v wget &> /dev/null; then
    wget -O "$TMP_ZIP" "$XRAY_URL"
  else
    echo -e "${RED}Please install curl or wget${NC}"
    exit 1
  fi

  if command -v unzip &> /dev/null; then
    unzip -o "$TMP_ZIP" -d "$XRAY_DIR"
  else
    echo -e "${RED}Please install unzip${NC}"
    exit 1
  fi

  chmod +x "$XRAY_DIR/xray"
  rm -f "$TMP_ZIP"
  echo -e "${GREEN}✓ Xray downloaded to $XRAY_DIR${NC}"
else
  echo -e "${GREEN}✓ Xray already installed at $XRAY_DIR${NC}"
fi

ln -sf "$XRAY_DIR/xray" "$INSTALL_DIR/xray"
echo ""

echo -e "${YELLOW}Step 3: Registering native messaging host...${NC}"
echo -e "Please enter your Chrome Extension ID (from chrome://extensions):"
read -p "Extension ID: " EXT_ID

if [ -z "$EXT_ID" ]; then
  echo -e "${RED}Extension ID is required${NC}"
  exit 1
fi

cat > "$NATIVE_MESSAGING_DIR/com.vpnforall.native.json" << EOF
{
  "name": "com.vpnforall.native",
  "description": "VPN for All - Native Messaging Host for V2Ray/Xray Core",
  "path": "${INSTALL_DIR}/vpnforall-host",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://${EXT_ID}/"
  ]
}
EOF

echo -e "${GREEN}✓ Native messaging host registered${NC}"
echo ""

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Setup Complete! 🎉             ║${NC}"
echo -e "${CYAN}╠════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Now reload the extension in Chrome    ║${NC}"
echo -e "${CYAN}║  and click Connect!                     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
