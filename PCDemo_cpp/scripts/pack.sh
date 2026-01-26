#!/bin/bash
# Pack script for host and runtime directories (macOS)
# This script compresses host and runtime directories into native_sdk/mac
# Runtime is split into chunks of max 50MB for easier distribution

set -e

echo "========================================"
echo "Packing host and runtime directories"
echo "========================================"

# Get script directory and demo directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEMO_DIR"

# Check if host directory exists
if [ ! -d "host" ]; then
    echo "[ERROR] host directory not found!"
    echo "Please ensure the host directory exists before packing."
    exit 1
fi

# Check if runtime directory exists
if [ ! -d "runtime" ]; then
    echo "[WARNING] runtime directory not found!"
    echo "Will only pack host directory."
fi

# Create native_sdk/mac directory for macOS builds
OUTPUT_DIR="native_sdk/mac"
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "[INFO] Creating $OUTPUT_DIR directory..."
    mkdir -p "$OUTPUT_DIR"
fi

echo ""
echo "[INFO] Compressing host directory..."

# Compress host directory using split compression
bash "$SCRIPT_DIR/compress_split.sh" \
    --source "host" \
    --output "$OUTPUT_DIR" \
    --name "host" \
    --chunk-size 50

echo "[OK] host directory compressed successfully"
echo ""

# Compress runtime directory if it exists
if [ -d "runtime" ] && [ "$(ls -A runtime 2>/dev/null)" ]; then
    # Compress each architecture separately
    if [ -d "runtime/arm64" ]; then
        echo "[INFO] Compressing runtime/arm64 directory..."
        bash "$SCRIPT_DIR/compress_split.sh" \
            --source "runtime/arm64" \
            --output "$OUTPUT_DIR" \
            --name "runtime-arm64" \
            --chunk-size 50
        echo "[OK] runtime-arm64 compressed successfully"
        echo ""
    fi
    
    if [ -d "runtime/x64" ]; then
        echo "[INFO] Compressing runtime/x64 directory..."
        bash "$SCRIPT_DIR/compress_split.sh" \
            --source "runtime/x64" \
            --output "$OUTPUT_DIR" \
            --name "runtime-x64" \
            --chunk-size 50
        echo "[OK] runtime-x64 compressed successfully"
        echo ""
    fi
else
    echo "[INFO] Skipping runtime compression (directory empty or not found)"
fi

echo ""
echo "========================================"
echo "Packing completed successfully!"
echo "========================================"
echo ""
echo "Compressed archives are located in: $OUTPUT_DIR/"
ls -la "$OUTPUT_DIR/"
echo ""
