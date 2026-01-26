#!/bin/bash
# Run script for WebGLHost Native Demo (macOS/Linux)

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEMO_DIR"

echo "========================================"
echo "Running WebGLHost Native Demo"
echo "========================================"
echo ""

# Check if demo exists
if [ ! -f "build/bin/demo" ]; then
    echo "Demo executable not found!"
    echo "Please build first: ./scripts/build.sh"
    exit 1
fi

# Check if library exists
if [[ "$OSTYPE" == "darwin"* ]]; then
    LIB_NAME="libwebglhost_export.dylib"
else
    LIB_NAME="libwebglhost_export.so"
fi

if [ ! -f "host/${LIB_NAME}" ]; then
    echo "[WARNING] Library not found: host/${LIB_NAME}"
    echo "The demo may fail to load the library."
    echo ""
fi

# Run from build/bin directory where relative paths work
cd build/bin
./demo
