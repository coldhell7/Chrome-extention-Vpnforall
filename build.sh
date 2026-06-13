#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     VPN for All - Build Script         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
EXTENSION_SRC="$ROOT_DIR/extension"
NATIVE_SRC="$ROOT_DIR/native-host"

# Clean
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Step 1: Build Go native host for all platforms
echo -e "${YELLOW}Step 1: Building native host binaries...${NC}"

cd "$NATIVE_SRC"

# Linux amd64
echo "  Building linux/amd64..."
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o "$DIST_DIR/vpnforall-host-linux-amd64" .
echo -e "${GREEN}  ✓ linux/amd64${NC}"

# Linux arm64
echo "  Building linux/arm64..."
GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o "$DIST_DIR/vpnforall-host-linux-arm64" .
echo -e "${GREEN}  ✓ linux/arm64${NC}"

# macOS amd64
echo "  Building darwin/amd64..."
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o "$DIST_DIR/vpnforall-host-darwin-amd64" .
echo -e "${GREEN}  ✓ darwin/amd64${NC}"

# macOS arm64 (Apple Silicon)
echo "  Building darwin/arm64..."
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o "$DIST_DIR/vpnforall-host-darwin-arm64" .
echo -e "${GREEN}  ✓ darwin/arm64${NC}"

# Windows amd64
echo "  Building windows/amd64..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o "$DIST_DIR/vpnforall-host-windows-amd64.exe" .
echo -e "${GREEN}  ✓ windows/amd64${NC}"

cd "$ROOT_DIR"
echo ""

# Step 2: Copy installer scripts
echo -e "${YELLOW}Step 2: Copying installer scripts...${NC}"
cp "$NATIVE_SRC/install.sh" "$DIST_DIR/"
cp "$NATIVE_SRC/install.ps1" "$DIST_DIR/"
cp "$NATIVE_SRC/com.vpnforall.native.json" "$DIST_DIR/"
chmod +x "$DIST_DIR/install.sh"
echo -e "${GREEN}✓ Installers copied${NC}"
echo ""

# Step 3: Create the CRX file
echo -e "${YELLOW}Step 3: Building CRX extension...${NC}"

if command -v npx &> /dev/null; then
  # Generate private key if not exists
  KEY_FILE="$DIST_DIR/key.pem"
  if [ ! -f "$KEY_FILE" ]; then
    echo "  Generating private key..."
    openssl genrsa -out "$KEY_FILE" 2048 2>/dev/null || true
  fi

  # Use crx3 to pack
  npx -y crx3 \
    --crx "$DIST_DIR/vpnforall.crx" \
    --zip "$DIST_DIR/vpnforall.zip" \
    --directory "$EXTENSION_SRC" \
    --privateKey "$KEY_FILE" 2>&1 || {
    echo -e "${YELLOW}  crx3 failed, creating ZIP instead...${NC}"
    cd "$EXTENSION_SRC"
    zip -r "$DIST_DIR/vpnforall.zip" . -x "*.git*"
    cd "$ROOT_DIR"
  }
  echo -e "${GREEN}✓ CRX/ZIP created${NC}"
else
  echo -e "${YELLOW}  npx not available, creating ZIP only...${NC}"
  cd "$EXTENSION_SRC"
  zip -r "$DIST_DIR/vpnforall.zip" . -x "*.git*"
  cd "$ROOT_DIR"
  echo -e "${GREEN}✓ ZIP created${NC}"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Build Complete! 🎉             ║${NC}"
echo -e "${CYAN}╠════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Output: $DIST_DIR${NC}"
echo -e "${CYAN}║  CRX:    dist/vpnforall.crx             ║${NC}"
echo -e "${CYAN}║  ZIP:    dist/vpnforall.zip             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
ls -lh "$DIST_DIR/"
