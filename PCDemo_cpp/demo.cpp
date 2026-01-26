// demo.cpp - Demo test program main entry
// Cross-platform support for Windows and macOS
//
// This demo demonstrates how to:
// 1. Load the WebGLHost SDK library
// 2. Initialize the browsing service
// 3. Fetch game list from API and get game info (ID and launchKey)
// 4. Launch a game using the obtained game ID and launchKey
// 5. Handle JsApi calls and events from the game
// 6. Clean up resources properly

#include <iostream>
#include <string>
#include <cstring>
#include <chrono>
#include <thread>

// Platform-specific includes
#ifdef _WIN32
    #ifndef WIN32_LEAN_AND_MEAN
    #define WIN32_LEAN_AND_MEAN
    #endif
    #include <winsock2.h>
    #include <windows.h>
#else
    #include <dlfcn.h>
    #include <unistd.h>
    #include <signal.h>
    #include <curl/curl.h>
#endif

// SDK headers
#include "include/IBrowsingService.h"
#include "include/IAppletManagerV3.h"
#include "include/ICoreServiceHandler.h"

// Demo module headers
#include "demo_config.h"
#include "demo_handlers.h"
#include "demo_game.h"

// Platform-specific library loading
#ifdef _WIN32

typedef IBrowsingService* (*GetBrowsingServiceFunc)();

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "WebGLHost Native Demo Test (Windows)" << std::endl;
    std::cout << "========================================\n" << std::endl;
    
    // Load DLL
    HMODULE hDll = LoadLibraryA("host\\webglhost_export.dll");
    if (!hDll) {
        std::cerr << "Failed to load DLL: " << GetLastError() << std::endl;
        std::cerr << "Make sure webglhost_export.dll is in the host directory" << std::endl;
        return 1;
    }
    
    std::cout << "[OK] DLL loaded successfully\n" << std::endl;
    
    GetBrowsingServiceFunc getBrowsingService = 
        (GetBrowsingServiceFunc)GetProcAddress(hDll, "GetBrowsingService");
    
    if (!getBrowsingService) {
        std::cerr << "Failed to get GetBrowsingService function" << std::endl;
        FreeLibrary(hDll);
        return 1;
    }

#else

typedef IBrowsingService* (*GetBrowsingServiceFunc)();

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "WebGLHost Native Demo Test (macOS)" << std::endl;
    std::cout << "========================================\n" << std::endl;
    
    // Initialize curl
    curl_global_init(CURL_GLOBAL_DEFAULT);
    
    // Load dylib
    void* hLib = dlopen("host/libwebglhost_export.dylib", RTLD_NOW | RTLD_LOCAL);
    if (!hLib) {
        std::cerr << "Failed to load dylib: " << dlerror() << std::endl;
        std::cerr << "Make sure libwebglhost_export.dylib is in the host directory" << std::endl;
        curl_global_cleanup();
        return 1;
    }
    
    std::cout << "[OK] Dylib loaded successfully\n" << std::endl;
    
    GetBrowsingServiceFunc getBrowsingService = 
        (GetBrowsingServiceFunc)dlsym(hLib, "GetBrowsingService");
    
    if (!getBrowsingService) {
        std::cerr << "Failed to get GetBrowsingService function: " << dlerror() << std::endl;
        dlclose(hLib);
        curl_global_cleanup();
        return 1;
    }

#endif

    // Common code for both platforms
    IBrowsingService* service = getBrowsingService();
    if (!service) {
        std::cerr << "Failed to create BrowsingService" << std::endl;
#ifdef _WIN32
        FreeLibrary(hDll);
#else
        dlclose(hLib);
        curl_global_cleanup();
#endif
        return 1;
    }
    
    std::cout << "[OK] BrowsingService created\n" << std::endl;
    
    // Initialize with real SDK credentials
    std::cout << "Initializing browsing core..." << std::endl;
    std::cout << "  SDK Key: " << SDK_KEY << std::endl;
    
    // Build config JSON
    char config[1024];
    snprintf(config, sizeof(config), R"({
        "sdkKey": "%s",
        "sdkSecret": "%s",
        "accessToken": "%s",
        "debug": true,
        "logLevel": "debug"
    })", SDK_KEY, SDK_SECRET, ACCESS_TOKEN);
    
    // Runtime path
#ifdef _WIN32
    const char* runtimePath = "runtime\\webglhost-runtime.exe";
#else
    // macOS: runtime is a .app bundle, executable is inside Contents/MacOS/
    const char* runtimePath = "runtime/webglhost-runtime.app/Contents/MacOS/webglhost-runtime";
#endif
    
    DemoCoreServiceHandler handler;
    
    int result = service->InitializeBrowsingCore(config, runtimePath, &handler);
    
    if (result != 0) {
        std::cerr << "[FAIL] Initialization failed with code: " << result << std::endl;
        service->Release();
#ifdef _WIN32
        FreeLibrary(hDll);
#else
        dlclose(hLib);
        curl_global_cleanup();
#endif
        return 1;
    }
    
    std::cout << "[OK] Browsing core initialized\n" << std::endl;
    
    // Get AppletManager
    std::cout << "Getting AppletManager..." << std::endl;
    IAppletManagerV3* appletManager = nullptr;
    result = service->QueryInterface("IAppletManagerV3", (void**)&appletManager);
    
    if (result != 0 || !appletManager) {
        std::cerr << "[FAIL] Failed to get AppletManager" << std::endl;
        service->UninitializeBrowsingCore();
        service->Release();
#ifdef _WIN32
        FreeLibrary(hDll);
#else
        dlclose(hLib);
        curl_global_cleanup();
#endif
        return 1;
    }
    
    std::cout << "[OK] AppletManager obtained\n" << std::endl;
    
    // Store global reference for use in handlers
    g_appletManager = appletManager;
    
    // Set JsApi handler (for handling custom JsApi calls like TJLoginHost)
    std::cout << "Setting JsApi handler..." << std::endl;
    appletManager->SetJsApiHandler(OnJsApiHandler);
    std::cout << "[OK] JsApi handler set\n" << std::endl;
    
    // Set Event handler (optional - for handling custom events from game)
    std::cout << "Setting Event handler..." << std::endl;
    appletManager->SetAppletEventHandler(OnEventHandler);
    std::cout << "[OK] Event handler set\n" << std::endl;
    
    // Fetch game list and get first game info
    // The game list API returns games with their IDs and launchKeys
    // - Game ID (appletId): Used to identify the game in LaunchApplet and CloseApplet
    // - Launch Key: URL used in launchConfig to start the game session
    std::cout << "\nFetching game list..." << std::endl;
    std::vector<GameInfo> gameList = FetchGameList();
    
    std::string appletId;   // Game ID from game list API response
    std::string launchKey;  // Launch key URL from game list API response
    if (!GetFirstGameInfo(gameList, appletId, launchKey)) {
        std::cerr << "[FAIL] Failed to get game info from game list" << std::endl;
        appletManager->Release();
        service->UninitializeBrowsingCore();
        service->Release();
#ifdef _WIN32
        FreeLibrary(hDll);
#else
        dlclose(hLib);
        curl_global_cleanup();
#endif
        return 1;
    }
    
    const char* finalLaunchKey = launchKey.c_str();
    const char* finalAppletId = appletId.c_str();
    
    // Prepare launch config with real credentials
    // - launchKey: Obtained from game list API (GameInfo.launchKey)
    // - accessToken: User's access token for authentication
    // - userId: User identifier
    std::cout << "\nLaunching applet..." << std::endl;
    std::cout << "  Applet ID: " << finalAppletId << std::endl;
    std::cout << "  Launch Key: " << finalLaunchKey << std::endl;
    
    char launchConfig[2048];
    snprintf(launchConfig, sizeof(launchConfig), R"({
        "launchKey": "%s",
        "accessToken": "%s",
        "userId": "%s",
        "debug": true,
        "mute": false,
        "transparent": true,
        "GAME_HOST_BASE_URL": "https://minihost.tuanjie.cn",
        "API_VERSION": "v1",
        "APP_VERSION": "1.0.0"
    })", finalLaunchKey, ACCESS_TOKEN, USER_ID);
    
    // Launch the game
    // - First parameter (finalAppletId): Game ID from game list API
    // - Second parameter (launchConfig): JSON config containing launchKey and credentials
    appletManager->LaunchApplet(
        finalAppletId, 
        launchConfig, 
        strlen(launchConfig),
        OnLaunchComplete
    );
    
    std::cout << "[OK] Launch request sent\n" << std::endl;
    
    // Wait for launch callback with timeout
    std::cout << "Waiting for launch callback..." << std::endl;
    int launchWaitTime = 0;
    const int launchTimeout = 30000; // 30 seconds timeout for launch
    const int checkInterval = 500;   // Check every 500ms
    
    while (!g_launchCompleted && launchWaitTime < launchTimeout) {
        std::this_thread::sleep_for(std::chrono::milliseconds(checkInterval));
        launchWaitTime += checkInterval;
        
        if (g_shouldExit) {
            std::cerr << "\n[ERROR] Launch failed, exiting..." << std::endl;
            goto cleanup;
        }
    }
    
    if (!g_launchCompleted) {
        std::cerr << "\n[ERROR] Launch timeout after " << launchTimeout / 1000 << " seconds" << std::endl;
        goto cleanup;
    }
    
    if (g_launchResultCode != 0) {
        std::cerr << "\n[ERROR] Launch failed with code: " << g_launchResultCode << std::endl;
        goto cleanup;
    }
    
    std::cout << "[OK] Game launched successfully\n" << std::endl;
    
    // Wait for game to run, monitoring server status via handler
    std::cout << "Game is running. Waiting for server events..." << std::endl;
    std::cout << "Client will exit when:" << std::endl;
    std::cout << "  1. Server process exits (reported via handler)" << std::endl;
    std::cout << "  2. Press Ctrl+C to exit manually\n" << std::endl;
    
    {
        int monitorCount = 0;
        
        while (!g_shouldExit) {
            std::this_thread::sleep_for(std::chrono::milliseconds(checkInterval));
            monitorCount += checkInterval;
            
            if (g_serverExited) {
                std::cout << "\n[INFO] Server exited (reported via handler), client will exit now" << std::endl;
                break;
            }
            
            if (monitorCount % 10000 == 0) {
                std::cout << "  Game running for " << monitorCount / 1000 << " seconds..." << std::endl;
            }
        }
    }
    
cleanup:
    // Close applet if it was launched and hasn't exited yet
    // Use the same appletId that was used in LaunchApplet
    if (g_launchCompleted && g_launchResultCode == 0 && !g_gameExited) {
        std::cout << "\nClosing applet..." << std::endl;
        appletManager->CloseApplet(finalAppletId);
        std::cout << "[OK] Close applet request sent" << std::endl;
    } else if (g_gameExited) {
        std::cout << "\nGame already exited, skipping CloseApplet..." << std::endl;
    }
    
    // Cleanup resources in proper order
    std::cout << "\nCleaning up resources..." << std::endl;
    
    // 1. Release AppletManager
    if (appletManager) {
        std::cout << "  Releasing AppletManager..." << std::endl;
        appletManager->Release();
        appletManager = nullptr;
        g_appletManager = nullptr;
    }
    
    // 2. Uninitialize BrowsingService (this will send shutdown to server)
    if (service) {
        std::cout << "  Uninitializing BrowsingService..." << std::endl;
        service->UninitializeBrowsingCore();
        
        // 3. Release BrowsingService
        std::cout << "  Releasing BrowsingService..." << std::endl;
        service->Release();
        service = nullptr;
    }
    
#ifdef _WIN32
    if (hDll) {
        std::cout << "  Unloading DLL..." << std::endl;
        FreeLibrary(hDll);
        hDll = nullptr;
    }
#else
    if (hLib) {
        std::cout << "  Unloading dylib..." << std::endl;
        dlclose(hLib);
        hLib = nullptr;
    }
    curl_global_cleanup();
#endif
    
    std::cout << "[OK] All resources cleaned up" << std::endl;
    
    std::cout << "\n========================================" << std::endl;
    std::cout << "Test completed!" << std::endl;
    std::cout << "========================================" << std::endl;
    
    return 0;
}
