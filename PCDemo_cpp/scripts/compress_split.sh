#!/bin/bash
# Split compression script for macOS
# Compresses directories and splits into chunks of max 50MB

set -e

# Default parameters
SOURCE_DIR=""
OUTPUT_DIR=""
ARCHIVE_NAME=""
CHUNK_SIZE_MB=50

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --source)
            SOURCE_DIR="$2"
            shift 2
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --name)
            ARCHIVE_NAME="$2"
            shift 2
            ;;
        --chunk-size)
            CHUNK_SIZE_MB="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate parameters
if [ -z "$SOURCE_DIR" ] || [ -z "$OUTPUT_DIR" ] || [ -z "$ARCHIVE_NAME" ]; then
    echo "Usage: $0 --source <dir> --output <dir> --name <archive_name> [--chunk-size <MB>]"
    exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
    echo "[ERROR] Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Create output directory if not exists
mkdir -p "$OUTPUT_DIR"

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Compress to temp location
TEMP_TAR="$TEMP_DIR/${ARCHIVE_NAME}.tar.gz"
echo "Compressing $SOURCE_DIR to temporary location..."

# Save current directory
ORIG_DIR=$(pwd)
cd "$SOURCE_DIR"
tar -czf "$TEMP_TAR" .
cd "$ORIG_DIR"

# Get file size
FILE_SIZE=$(stat -f%z "$TEMP_TAR" 2>/dev/null || stat -c%s "$TEMP_TAR" 2>/dev/null)
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc)
echo "Compressed size: ${FILE_SIZE_MB} MB"

# Calculate chunk size in bytes
CHUNK_SIZE_BYTES=$((CHUNK_SIZE_MB * 1048576))

if [ "$FILE_SIZE" -le "$CHUNK_SIZE_BYTES" ]; then
    # No splitting needed
    echo "File is smaller than ${CHUNK_SIZE_MB} MB, no splitting needed."
    DEST_FILE="$OUTPUT_DIR/${ARCHIVE_NAME}.tar.gz"
    mv "$TEMP_TAR" "$DEST_FILE"
    echo "Archive saved to: $DEST_FILE"
    
    # Output size
    FINAL_SIZE=$(stat -f%z "$DEST_FILE" 2>/dev/null || stat -c%s "$DEST_FILE" 2>/dev/null)
    FINAL_SIZE_MB=$(echo "scale=2; $FINAL_SIZE / 1048576" | bc)
    echo "Final size: ${FINAL_SIZE_MB} MB"
else
    # Split the file using split command
    echo "File exceeds ${CHUNK_SIZE_MB} MB, splitting into chunks..."
    
    # Use split with numeric suffix starting from 01
    # -b: size in bytes, -d: numeric suffixes, -a: suffix length
    split -b "${CHUNK_SIZE_BYTES}" "$TEMP_TAR" "$TEMP_DIR/${ARCHIVE_NAME}.tar.gz.part"
    
    # Rename and move chunks with proper naming (.01, .02, etc.)
    CHUNK_INDEX=1
    for chunk in "$TEMP_DIR/${ARCHIVE_NAME}.tar.gz.part"*; do
        if [ -f "$chunk" ]; then
            NEW_NAME="$OUTPUT_DIR/${ARCHIVE_NAME}.tar.gz.$(printf '%02d' $CHUNK_INDEX)"
            mv "$chunk" "$NEW_NAME"
            
            CHUNK_SIZE=$(stat -f%z "$NEW_NAME" 2>/dev/null || stat -c%s "$NEW_NAME" 2>/dev/null)
            CHUNK_SIZE_DISPLAY=$(echo "scale=2; $CHUNK_SIZE / 1048576" | bc)
            echo "Created chunk $CHUNK_INDEX: $(basename $NEW_NAME) (${CHUNK_SIZE_DISPLAY} MB)"
            
            CHUNK_INDEX=$((CHUNK_INDEX + 1))
        fi
    done
    
    echo "Split into $((CHUNK_INDEX - 1)) chunks"
fi

echo "Compression completed successfully!"
