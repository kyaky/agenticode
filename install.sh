#!/usr/bin/env bash
# AgentiCode installer — downloads prebuilt binary for your platform
# Usage: curl -fsSL https://raw.githubusercontent.com/kyaky/agenticode/master/install.sh | bash
set -euo pipefail

REPO="kyaky/agenticode"
NAME="agenticode"
INSTALL_DIR="${AGENTICODE_INSTALL_DIR:-${XDG_BIN_DIR:-$HOME/.local/bin}}"

# Detect platform
case "$(uname -s)" in
  Linux*)  PLATFORM="linux" ;;
  Darwin*) PLATFORM="darwin" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
  *) echo "Unsupported OS: $(uname -s)"; exit 1 ;;
esac

# Detect architecture
case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

SUFFIX=""
[ "$PLATFORM" = "windows" ] && SUFFIX=".exe"
BINARY="${NAME}-${PLATFORM}-${ARCH}${SUFFIX}"

# Get latest release URL
echo "Detecting latest AgentiCode release..."
RELEASE_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download
echo "Downloading ${BINARY}..."
curl -fsSL -o "${INSTALL_DIR}/${NAME}${SUFFIX}" "$RELEASE_URL"
chmod +x "${INSTALL_DIR}/${NAME}${SUFFIX}"

# Add to PATH if needed
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  SHELL_CONFIG=""
  case "$SHELL" in
    */zsh)  SHELL_CONFIG="$HOME/.zshrc" ;;
    */bash) SHELL_CONFIG="$HOME/.bashrc" ;;
    */fish) SHELL_CONFIG="$HOME/.config/fish/config.fish" ;;
  esac

  if [ -n "$SHELL_CONFIG" ]; then
    echo "" >> "$SHELL_CONFIG"
    echo "# AgentiCode" >> "$SHELL_CONFIG"
    echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "$SHELL_CONFIG"
    echo "Added ${INSTALL_DIR} to PATH in ${SHELL_CONFIG}"
  fi
fi

echo ""
echo "AgentiCode installed to ${INSTALL_DIR}/${NAME}${SUFFIX}"
echo "Restart your terminal, then run: agenticode"
