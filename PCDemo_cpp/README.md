# WebGLHost Native SDK Demo

This directory contains a demo application that demonstrates how to integrate and use the WebGLHost Native SDK.

## Directory Structure

```
demo/
├── docs/                  # Documentation
│   ├── Quick-Start-Guide.md       # Quick start guide
│   └── API-Integration-Guide.md   # Detailed API reference
├── scripts/               # Build and run scripts
│   ├── build.bat              # Build demo.exe
│   ├── run.bat                # Run the test
│   ├── build-and-run.bat      # Build and run (all-in-one)
│   ├── clean.bat              # Clean build artifacts
│   ├── compress_split.ps1     # Split compression utility
│   ├── decompress_split.ps1   # Split decompression utility
│   └── USAGE.md               # Scripts usage guide
├── include/               # SDK header files
│   ├── IBrowsingService.h         # Browsing service interface
│   ├── IAppletManagerV3.h         # Applet manager interface
│   ├── ICoreServiceHandler.h      # Event handler interface
│   └── WIUnknown.h                # Base interface
├── native_sdk/            # Compressed SDK files (platform-specific)
│   ├── mac/                   # macOS packages
│   │   ├── host.tar.gz               # SDK library
│   │   ├── runtime-arm64.tar.gz.01/02/03  # arm64 runtime (split)
│   │   ├── runtime-x64.tar.gz.01/02/03    # x64 runtime (split)
│   │   └── version.json              # Version info
│   └── windows/               # Windows packages
│       ├── host.zip                  # SDK library
│       ├── runtime.z01/z02/z03       # Runtime (split)
│       └── version.json              # Version info
├── host/                  # SDK library (auto-extracted)
│   ├── webglhost_export.dll       # Windows
│   └── libwebglhost_export.dylib  # macOS
├── runtime/               # Runtime environment (auto-extracted)
│   ├── arm64/webglhost-runtime.app    # macOS arm64
│   ├── x64/webglhost-runtime.app      # macOS x64
│   └── webglhost-runtime.exe          # Windows
├── README.md              # This file
├── demo.cpp               # Demo source code
├── CMakeLists.txt         # CMake configuration
├── build/                 # Build output (generated)
│   └── bin/Release/demo.exe
└── logs/                  # Runtime logs (generated)
```

## Features

- ✅ **Cross-platform support** (Windows + macOS)
- ✅ **Game list fetching** from Unity MiniHost API
- ✅ **Auto-launch first game** from the list
- ✅ **Custom JsApi handlers** (TJLoginHost, loadRewardAd, showRewardAd)
- ✅ **Platform-specific HTTP requests** (WinHTTP / libcurl)
- ✅ **Event handling** and lifecycle management

## Quick Start

### Option 1: All-in-One (Recommended)

**Windows**:
```bat
scripts\build-and-run.bat
```

**macOS**:
```bash
scripts/build-and-run.sh
```

This will:
1. Extract SDK and runtime files (if needed)
2. Build the demo
3. Run the demo (automatically fetches and launches the first game)

### Option 2: Step-by-Step

**Windows**:
```bat
# 1. Build demo.exe
scripts\build.bat

# 2. Run the test
scripts\run.bat
```

**macOS**:
```bash
# 1. Build the demo
scripts/build.sh --direct

# 2. Run the demo
cd build/bin
./demo
```

## Game List Feature

The demo automatically fetches and launches games from the Unity MiniHost API:

1. **Automatic fetching**: On startup, the demo fetches the game list from the API using the configured `HOST_APP_ID`
2. **Auto-launch**: Automatically selects and launches the first game from the list
3. **Error handling**: Exits with error if no games are available

**Example output**:
```
[GameList] Fetching game list from API...
[GameList] Request URL: https://minihost.tuanjie.cn/api/game/list?appId=691ac9ef2dcfadc65a0fb4a6
[GameList] Response received, parsing...
[GameList] Found game: Dragon Crashers (ID: 691acb162dcfadc65a0fdb77)
[GameList] Successfully fetched 1 games

========================================
Auto-selecting first game:
========================================
Name: Dragon Crashers
ID: 691acb162dcfadc65a0fdb77
Type: weixinminigame
Intro: MiniHost Game Demo
Launch Key: 691acb162dcfadc65a0fdb77
========================================
```

**Key Points**:
- **HOST_APP_ID**: Configured in `demo.cpp` (line 38), used to fetch games for that app
- **APPLET ID**: Extracted from the `id` field in the API response
- **Launch Key**: Extracted from the `launchKey` field in the API response

## Prerequisites

Before running the demo, ensure the SDK package is in place:

1. **SDK Package**: The `native_sdk/` directory contains platform-specific compressed SDK files:
   
   **macOS** (`native_sdk/mac/`):
   - `host.tar.gz` - SDK library (libwebglhost_export.dylib)
   - `runtime-arm64.tar.gz.01/02/03` - arm64 runtime (split archives)
   - `runtime-x64.tar.gz.01/02/03` - x64 runtime (split archives)
   - `version.json` - Version information
   
   **Windows** (`native_sdk/windows/`):
   - `host.zip` - SDK library (webglhost_export.dll)
   - `runtime.z01/02/03` - Runtime environment (split archives)
   - `version.json` - Version information

2. **Auto-Extraction**: The build and run scripts will automatically extract these files to:
   
   **macOS**:
   - `host/libwebglhost_export.dylib`
   - `runtime/arm64/webglhost-runtime.app`
   - `runtime/x64/webglhost-runtime.app`
   
   **Windows**:
   - `host/webglhost_export.dll`
   - `runtime/webglhost-runtime.exe` and dependencies

**Note**: Runtime packages are split into chunks of ≤50MB for easier distribution and version control. The extraction process is fully automated by the build scripts.

## Scripts Reference

All scripts are located in the `scripts/` directory.

### build.bat
Builds `demo.exe` using CMake and copies it to the demo directory.

**Usage**: `scripts\build.bat`

**Output**: 
- `build/bin/Release/demo.exe`
- `demo.exe` (copied to demo root)

### run.bat
Runs the demo application. Checks for all dependencies before running.

**Usage**: `scripts\run.bat`

**Requirements**:
- `demo.exe` must exist
- `host/webglhost_export.dll` must exist
- `runtime/webglhost-runtime.exe` must exist


### build-and-run.bat
All-in-one script that builds and runs the test.

**Usage**: `scripts\build-and-run.bat`

### clean.bat
Removes all build artifacts and optionally runtime and logs.

**Usage**: `scripts\clean.bat`

**Removes**:
- `build/` directory
- `demo.exe`
- `host/webglhost_export.dll`
- `runtime/` (optional)
- `logs/` (optional)

## Build Configuration

The demo uses CMake with Visual Studio 2019 (x64):

- **Compiler**: MSVC (Visual Studio 16 2019)
- **Platform**: x64
- **Configuration**: Release
- **C++ Standard**: C++17

## Test Configuration

The demo requires valid credentials. Edit `demo.cpp` and replace the placeholder values:

```cpp
const char* SDK_KEY = "your-sdk-key";        // Replace with your SDK key
const char* SDK_SECRET = "your-sdk-secret";  // Replace with your SDK secret
const char* ACCESS_TOKEN = "your-access-token"; // Replace with your access token
const char* USER_ID = "your-user-id";        // Replace with your user ID
const char* HOST_APP_ID = "your-app-id";          // Replace with your app ID
const char* LAUNCH_KEY = "https://...";      // Replace with your launch URL
```

Contact your SDK provider to obtain these credentials.

## Troubleshooting

### Error: DLL not found
The scripts will automatically extract SDK libraries from `native_sdk/mac/host.tar.gz` or `native_sdk/windows/host.zip`. If extraction fails, ensure the platform-specific package exists and is not corrupted.

### Error: Runtime not found
The scripts will automatically extract the runtime from split archives. If extraction fails, ensure all split archive files exist and are not corrupted:
- **macOS**: `runtime-arm64.tar.gz.01/02/03` or `runtime-x64.tar.gz.01/02/03`
- **Windows**: `runtime.z01/02/03`

### Error: Extraction failed
If automatic extraction fails:

**macOS**:
1. Verify all files in `native_sdk/mac/` directory are present
2. Manually extract using the decompression script:
   ```bash
   # Extract host
   cd native_sdk/mac && tar -xzf host.tar.gz -C ../../host/
   
   # Extract arm64 runtime (combine split files first)
   cat runtime-arm64.tar.gz.* | tar -xzf - -C ../../runtime/arm64/
   
   # Or use the decompression script
   bash scripts/compress_split.sh --source native_sdk/mac --output runtime/arm64 --name runtime-arm64
   ```

**Windows**:
1. Verify all files in `native_sdk\windows\` directory are present
2. Check that PowerShell execution policy allows script execution
3. Manually extract files:
   ```bat
   powershell -ExecutionPolicy Bypass -File "scripts\decompress_split.ps1" -SourceDir "native_sdk\windows" -OutputDir "host" -ArchiveName "host"
   powershell -ExecutionPolicy Bypass -File "scripts\decompress_split.ps1" -SourceDir "native_sdk\windows" -OutputDir "runtime" -ArchiveName "runtime"
   ```

### Error: CMake not found
Install CMake: https://cmake.org/download/

### Error: Visual Studio not found
Install Visual Studio 2019 with C++ tools or modify `build.bat` to use your version:
```bat
cmake -G "Visual Studio 17 2022" -A x64 ..
```

## Logs

Runtime logs are automatically saved to the `logs/` directory with timestamps:
- Format: `server-YYYY-MM-DDTHH-MM-SS.log`
- Location: `demo/logs/`

Check the latest log file for runtime debugging information.

## Features

### Custom JsApi Handler

The demo demonstrates how to implement a custom JsApi handler to handle game authentication requests:

1. **JsApi Handler Registration**: The demo registers a custom handler via `SetJsApiHandler()` to intercept and process JsApi calls from the game.

2. **TJLoginHost Authentication**: When the game calls `tj.login()`, the demo's `OnJsApiHandler` function:
   - Receives the authentication request with accessToken
   - Performs HTTP authentication via Unity Connect API
   - Returns the LSToken to the game

3. **HTTP Request Implementation**: Uses WinHTTP library to make HTTPS requests to external APIs.

### Key Components

**demo.cpp** implements:
- `OnJsApiHandler()` - Handles JsApi calls (TJLoginHost, loadRewardAd, showRewardAd)
- `PerformUnityConnectAuth()` - Unity Connect authentication
- `HandleLoadRewardAd()` / `HandleShowRewardAd()` - Reward ad handling
- `HttpGet()` - HTTPS GET request implementation
- `UrlEncode()` - URL encoding helper
- `ExtractJsonStringValue()` - Simple JSON parser

## Development

### Modifying demo.cpp

After making changes to `demo.cpp`, rebuild:

```bat
scripts\build.bat
```

### Changing configuration

Edit the constants at the top of `demo.cpp`:

```cpp
const char* SDK_KEY = "your-sdk-key";
const char* SDK_SECRET = "your-sdk-secret";
const char* ACCESS_TOKEN = "your-access-token";
const char* USER_ID = "your-user-id";
const char* HOST_APP_ID = "your-app-id";
const char* LAUNCH_KEY = "your-launch-key";
```

Then rebuild and run.

### Supported JsApi Handlers

The demo currently supports the following JsApi handlers:

1. **TJLoginHost** - Unity Connect authentication
   - Called when game invokes `tj.login()`
   - Performs HTTP authentication and returns LSToken

2. **loadRewardAd** - Load reward advertisement
   - Prepares a reward ad for display

3. **showRewardAd** - Show reward advertisement
   - Displays the loaded reward ad to user

#### Handler Implementation Example

The handler is registered in main():
```cpp
appletManager->SetJsApiHandler(OnJsApiHandler);
```

Handler dispatches to specific functions based on api_name:
```cpp
bool OnJsApiHandler(const char* app_id, const char* api_name, 
                   const char* data, size_t data_size, int task_id) {
    if (strcmp(api_name, "TJLoginHost") == 0) {
        return HandleTJLoginHost(app_id, dataStr, task_id);
    }
    if (strcmp(api_name, "loadRewardAd") == 0) {
        return HandleLoadRewardAd(app_id, dataStr, task_id);
    }
    if (strcmp(api_name, "showRewardAd") == 0) {
        return HandleShowRewardAd(app_id, dataStr, task_id);
    }
    // Return false for unhandled APIs
    return false;
}
```

#### Response Format

All responses must be JSON:
- Success: `{"success":true,"result":{...}}`
- Error: `{"success":false,"errorCode":"CODE","error":"message"}`

