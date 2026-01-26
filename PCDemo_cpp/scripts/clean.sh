#!/bin/bash
# Clean script for WebGLHost Native Demo (macOS/Linux)

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEMO_DIR"

echo "========================================"
echo "Cleaning WebGLHost Native Demo"
echo "========================================"

if [ -d "build" ]; then
    echo "Removing build directory..."
    rm -rf build
    echo "[OK] Build directory removed"
else
    echo "Build directory does not exist"
fi

echo ""
echo "Done!"
