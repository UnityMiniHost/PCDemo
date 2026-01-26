#!/bin/bash
# Build script for WebGLHost Native Demo (macOS/Linux)

set -e

echo "========================================"
echo "Building WebGLHost Native Demo"
echo "========================================"

# Get script directory and demo directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SDK_DIR="$(cd "$DEMO_DIR/.." && pwd)"

cd "$DEMO_DIR"

# Parse arguments
BUILD_TYPE="Release"
CLEAN_BUILD=false
BUILD_SDK=false
USE_DIRECT_COMPILE=false
BUILD_UNIVERSAL=false
BUILD_ARCH=""

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
        --direct)
            USE_DIRECT_COMPILE=true
            shift
            ;;
        --universal)
            BUILD_UNIVERSAL=true
            shift
            ;;
        --arch)
            BUILD_ARCH="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --debug      Build debug version"
            echo "  --release    Build release version (default)"
            echo "  --clean      Clean build directory before building"
            echo "  --with-sdk   Also build the SDK library first"
            echo "  --direct     Use direct clang compilation (no CMake needed)"
            echo "  --universal  Build universal binary (arm64 + x86_64) on macOS"
            echo "  --arch ARCH  Build for specific architecture (arm64, x86_64)"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Build type: $BUILD_TYPE"

# On macOS, default to universal build
if [[ "$OSTYPE" == "darwin"* ]] && [ -z "$BUILD_ARCH" ] && [ "$BUILD_UNIVERSAL" = false ]; then
    BUILD_UNIVERSAL=true
    echo "Defaulting to universal build on macOS"
fi

# Function to extract SDK files (macOS)
extract_sdk_mac() {
    echo ""
    echo "Extracting SDK files for macOS..."
    
    local SDK_MAC_DIR="$DEMO_DIR/native_sdk/mac"
    
    # Extract host library
    if [ ! -f "$DEMO_DIR/host/libwebglhost_export.dylib" ]; then
        mkdir -p "$DEMO_DIR/host"
        
        if [ -f "$SDK_MAC_DIR/host.tar.gz" ]; then
            echo "  Extracting host library from host.tar.gz..."
            tar -xzf "$SDK_MAC_DIR/host.tar.gz" -C "$DEMO_DIR/host/"
            echo "  [OK] Host library extracted"
        else
            echo "  [ERROR] host.tar.gz not found in native_sdk/mac/"
            echo "         Please ensure the SDK package is complete."
            echo "         Expected file: $SDK_MAC_DIR/host.tar.gz"
            return 1
        fi
    else
        echo "  [OK] Host library already exists"
    fi
    
    # Determine architecture for runtime
    local ARCH=$(uname -m)
    local RUNTIME_ARCH=""
    if [ "$ARCH" = "arm64" ]; then
        RUNTIME_ARCH="arm64"
    else
        RUNTIME_ARCH="x64"
    fi
    
    # Extract runtime
    if [ ! -d "$DEMO_DIR/runtime/$RUNTIME_ARCH/webglhost-runtime.app" ]; then
        mkdir -p "$DEMO_DIR/runtime/$RUNTIME_ARCH"
        
        # Check for split archives
        local SPLIT_BASE="$SDK_MAC_DIR/runtime-${RUNTIME_ARCH}.tar.gz"
        if [ -f "${SPLIT_BASE}.01" ]; then
            echo "  Extracting runtime ($RUNTIME_ARCH) from split archives..."
            # Combine split files and extract
            cat "${SPLIT_BASE}".* | tar -xzf - -C "$DEMO_DIR/runtime/$RUNTIME_ARCH/"
            echo "  [OK] Runtime ($RUNTIME_ARCH) extracted"
        elif [ -f "$SDK_MAC_DIR/runtime-${RUNTIME_ARCH}.tar.gz" ]; then
            echo "  Extracting runtime ($RUNTIME_ARCH) from single archive..."
            tar -xzf "$SDK_MAC_DIR/runtime-${RUNTIME_ARCH}.tar.gz" -C "$DEMO_DIR/runtime/$RUNTIME_ARCH/"
            echo "  [OK] Runtime ($RUNTIME_ARCH) extracted"
        else
            echo "  [WARNING] Runtime archive not found for $RUNTIME_ARCH"
            echo "            Expected files: ${SPLIT_BASE}.01, .02, ... or runtime-${RUNTIME_ARCH}.tar.gz"
        fi
    else
        echo "  [OK] Runtime ($RUNTIME_ARCH) already exists"
    fi
    
    return 0
}

# Auto-extract SDK files if needed
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ ! -f "$DEMO_DIR/host/libwebglhost_export.dylib" ] || [ ! -d "$DEMO_DIR/runtime" ]; then
        extract_sdk_mac
        if [ $? -ne 0 ]; then
            echo ""
            echo "[ERROR] SDK extraction failed. Cannot continue."
            echo "Please ensure native_sdk/mac/ contains all required files."
            exit 1
        fi
    fi
fi

# Build SDK first if requested
if [ "$BUILD_SDK" = true ]; then
    echo ""
    echo "Building SDK library first..."
    cd "$SDK_DIR"
    if [ "$BUILD_TYPE" = "Debug" ]; then
        ./build.sh --debug
    else
        ./build.sh --release
    fi
    cd "$DEMO_DIR"
fi

# Clean build directory if requested
if [ "$CLEAN_BUILD" = true ] && [ -d "build" ]; then
    echo "Cleaning existing build directory..."
    rm -rf build
fi

# Create build directory
mkdir -p build

# Check if cmake is available
CMAKE_CMD=""
if command -v cmake &> /dev/null; then
    CMAKE_CMD="cmake"
elif [ -f "/Applications/CMake.app/Contents/bin/cmake" ]; then
    CMAKE_CMD="/Applications/CMake.app/Contents/bin/cmake"
elif [ -f "/opt/homebrew/bin/cmake" ]; then
    CMAKE_CMD="/opt/homebrew/bin/cmake"
elif [ -f "/usr/local/bin/cmake" ]; then
    CMAKE_CMD="/usr/local/bin/cmake"
fi

# If no cmake and --direct not specified, use direct compilation on macOS
if [ -z "$CMAKE_CMD" ] || [ "$USE_DIRECT_COMPILE" = true ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo ""
        echo "CMake not found, using direct clang compilation..."
        USE_DIRECT_COMPILE=true
    else
        echo "CMake not found! Please install CMake:"
        echo "  macOS: brew install cmake"
        echo "  Ubuntu: sudo apt install cmake"
        exit 1
    fi
fi

if [ "$USE_DIRECT_COMPILE" = true ]; then
    # Direct compilation using clang (macOS)
    echo ""
    echo "Compiling demo with clang..."
    
    mkdir -p build/bin
    
    # Set compiler flags
    if [ "$BUILD_TYPE" = "Debug" ]; then
        CXXFLAGS="-g -O0 -DDEBUG"
    else
        CXXFLAGS="-O2 -DNDEBUG"
    fi
    
    COMMON_FLAGS="-std=c++17"
    COMMON_FLAGS="$COMMON_FLAGS -Wall -Wextra"
    
    # Determine architectures to build
    ARCH_FLAGS=""
    if [ "$BUILD_UNIVERSAL" = true ]; then
        ARCH_FLAGS="-arch arm64 -arch x86_64"
        echo "Building universal binary for: arm64 and x86_64"
    elif [ -n "$BUILD_ARCH" ]; then
        ARCH_FLAGS="-arch $BUILD_ARCH"
        echo "Building for architecture: $BUILD_ARCH"
    else
        ARCH_FLAGS="-arch $(uname -m)"
        echo "Building for current architecture: $(uname -m)"
    fi
    
    # Source files list
    SOURCE_FILES="demo.cpp demo_config.cpp demo_utils.cpp demo_http.cpp demo_handlers.cpp demo_game.cpp"
    OBJECT_FILES=""
    
    # Compile all source files
    for src in $SOURCE_FILES; do
        obj="build/$(basename $src .cpp).o"
        echo "  Compiling $src..."
        clang++ $CXXFLAGS $COMMON_FLAGS $ARCH_FLAGS \
            -I./include -I. \
            $(curl-config --cflags 2>/dev/null || echo "") \
            -c "$src" -o "$obj"
        OBJECT_FILES="$OBJECT_FILES $obj"
    done
    
    # Link
    echo "  Linking demo..."
    clang++ $ARCH_FLAGS $OBJECT_FILES \
        $(curl-config --libs 2>/dev/null || echo "-lcurl") \
        -o build/bin/demo
    
    echo ""
    echo "========================================"
    echo "Build completed successfully!"
    echo "========================================"
    echo "Demo executable: build/bin/demo"
    echo ""
    
    # Copy library and setup working directory
    echo "Setting up demo environment..."
    mkdir -p build/bin/host
    mkdir -p build/bin/runtime
    
    if [ -f "host/libwebglhost_export.dylib" ]; then
        cp -v host/libwebglhost_export.dylib build/bin/host/
        echo "[OK] Library copied to build/bin/host/"
    else
        echo "[WARNING] Library not found: host/libwebglhost_export.dylib"
        echo "  Run: ./scripts/build.sh --with-sdk to build SDK first"
    fi
    
    # Copy runtime (macOS .app bundle or executable)
    RUNTIME_COPIED=0
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Detect current architecture and copy corresponding runtime
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            if [ -d "runtime/arm64/webglhost-runtime.app" ]; then
                cp -R runtime/arm64/webglhost-runtime.app build/bin/runtime/
                echo "[OK] Runtime .app bundle (arm64) copied to build/bin/runtime/"
                RUNTIME_COPIED=1
            fi
        else
            if [ -d "runtime/x64/webglhost-runtime.app" ]; then
                cp -R runtime/x64/webglhost-runtime.app build/bin/runtime/
                echo "[OK] Runtime .app bundle (x64) copied to build/bin/runtime/"
                RUNTIME_COPIED=1
            fi
        fi
        # Fallback: try any available architecture
        if [ "$RUNTIME_COPIED" -eq 0 ]; then
            if [ -d "runtime/arm64/webglhost-runtime.app" ]; then
                cp -R runtime/arm64/webglhost-runtime.app build/bin/runtime/
                echo "[OK] Runtime .app bundle (arm64) copied to build/bin/runtime/"
                RUNTIME_COPIED=1
            elif [ -d "runtime/x64/webglhost-runtime.app" ]; then
                cp -R runtime/x64/webglhost-runtime.app build/bin/runtime/
                echo "[OK] Runtime .app bundle (x64) copied to build/bin/runtime/"
                RUNTIME_COPIED=1
            fi
        fi
    else
        if [ -f "runtime/webglhost-runtime" ]; then
            cp runtime/webglhost-runtime build/bin/runtime/
            echo "[OK] Runtime executable copied to build/bin/runtime/"
            RUNTIME_COPIED=1
        fi
    fi
    if [ "$RUNTIME_COPIED" -eq 0 ]; then
        echo "[WARNING] Runtime not found in runtime/arm64/ or runtime/x64/"
    fi
    
    echo ""
    echo "Done!"
    exit 0
fi

# CMake-based build
cd build

echo ""
echo "Running CMake..."

# Determine architectures to build
CMAKE_ARCHS=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ "$BUILD_UNIVERSAL" = true ]; then
        CMAKE_ARCHS="arm64;x86_64"
        echo "Building universal binary for: arm64 and x86_64"
    elif [ -n "$BUILD_ARCH" ]; then
        CMAKE_ARCHS="$BUILD_ARCH"
        echo "Building for architecture: $BUILD_ARCH"
    else
        CMAKE_ARCHS="$(uname -m)"
        echo "Building for current architecture: $CMAKE_ARCHS"
    fi
    
    $CMAKE_CMD -DCMAKE_BUILD_TYPE="$BUILD_TYPE" -DCMAKE_OSX_ARCHITECTURES="$CMAKE_ARCHS" ..
else
    $CMAKE_CMD -DCMAKE_BUILD_TYPE="$BUILD_TYPE" ..
fi

if [ $? -ne 0 ]; then
    echo "CMake configuration failed!"
    exit 1
fi

echo ""
echo "Building demo..."
$CMAKE_CMD --build . --config "$BUILD_TYPE" -j$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo ""
echo "========================================"
echo "Build completed successfully!"
echo "========================================"
echo "Demo executable: build/bin/demo"
echo ""

cd "$DEMO_DIR"

# Ensure host directory exists with the library
echo "Checking library availability..."
mkdir -p host

if [[ "$OSTYPE" == "darwin"* ]]; then
    LIB_NAME="libwebglhost_export.dylib"
else
    LIB_NAME="libwebglhost_export.so"
fi

if [ ! -f "host/${LIB_NAME}" ]; then
    echo "[WARNING] Library not found in host directory"
    echo "  Expected: host/${LIB_NAME}"
    echo "  Run: ./scripts/build.sh --with-sdk to build and copy the library"
    echo "  Or manually copy the library from ../build/lib/"
fi

# Copy library and runtime to build/bin directory for execution
echo ""
echo "Setting up demo environment..."
mkdir -p build/bin/host
mkdir -p build/bin/runtime

if [ -f "host/${LIB_NAME}" ]; then
    cp -v "host/${LIB_NAME}" build/bin/host/
    echo "[OK] Library copied to build/bin/host/"
else
    echo "[WARNING] Library not found: host/${LIB_NAME}"
fi

# Copy runtime (macOS .app bundle or executable)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Detect current architecture and copy corresponding runtime
    ARCH=$(uname -m)
    RUNTIME_COPIED=0
    
    if [ "$ARCH" = "arm64" ]; then
        # Try arm64 first
        if [ -d "runtime/arm64/webglhost-runtime.app" ]; then
            cp -R runtime/arm64/webglhost-runtime.app build/bin/runtime/
            echo "[OK] Runtime .app bundle (arm64) copied to build/bin/runtime/"
            RUNTIME_COPIED=1
        fi
    else
        # Try x64 first
        if [ -d "runtime/x64/webglhost-runtime.app" ]; then
            cp -R runtime/x64/webglhost-runtime.app build/bin/runtime/
            echo "[OK] Runtime .app bundle (x64) copied to build/bin/runtime/"
            RUNTIME_COPIED=1
        fi
    fi
    
    # Fallback: try any available architecture
    if [ "$RUNTIME_COPIED" -eq 0 ]; then
        if [ -d "runtime/arm64/webglhost-runtime.app" ]; then
            cp -R runtime/arm64/webglhost-runtime.app build/bin/runtime/
            echo "[OK] Runtime .app bundle (arm64) copied to build/bin/runtime/"
            RUNTIME_COPIED=1
        elif [ -d "runtime/x64/webglhost-runtime.app" ]; then
            cp -R runtime/x64/webglhost-runtime.app build/bin/runtime/
            echo "[OK] Runtime .app bundle (x64) copied to build/bin/runtime/"
            RUNTIME_COPIED=1
        fi
    fi
    
    if [ "$RUNTIME_COPIED" -eq 0 ]; then
        echo "[WARNING] Runtime .app bundle not found in runtime/arm64/ or runtime/x64/"
    fi
else
    if [ -f "runtime/webglhost-runtime" ]; then
        cp runtime/webglhost-runtime build/bin/runtime/
        echo "[OK] Runtime executable copied to build/bin/runtime/"
    fi
fi

echo ""
echo "Done!"
