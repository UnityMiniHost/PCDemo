#!/bin/bash
# Build and run script for WebGLHost Native Demo (macOS/Linux)

set -e

echo "========================================"
echo "Build and Run WebGLHost Native Demo"
echo "========================================"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEMO_DIR"

# Parse arguments
BUILD_TYPE="Release"
CLEAN_BUILD=false
BUILD_SDK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            BUILD_TYPE="Debug"
            shift
            ;;
        --release)
            BUILD_TYPE="Release"
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --with-sdk)
            BUILD_SDK=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --debug      Build and run debug version"
            echo "  --release    Build and run release version (default)"
            echo "  --clean      Clean build before building"
            echo "  --with-sdk   Also build the SDK library first"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build
BUILD_ARGS=""
if [ "$BUILD_TYPE" = "Debug" ]; then
    BUILD_ARGS="$BUILD_ARGS --debug"
fi
if [ "$CLEAN_BUILD" = true ]; then
    BUILD_ARGS="$BUILD_ARGS --clean"
fi
if [ "$BUILD_SDK" = true ]; then
    BUILD_ARGS="$BUILD_ARGS --with-sdk"
fi

"$SCRIPT_DIR/build.sh" $BUILD_ARGS

# Run
echo ""
echo "========================================"
echo "Running Demo"
echo "========================================"
echo ""

cd "$DEMO_DIR/build/bin"
./demo
