// demo_config.cpp - Configuration constants and global state implementation

#include "demo_config.h"

// Configuration from development.json
const char* SDK_KEY = "AKIDsPmooC1zXhGdyhobjcNDS1njeGpw";
const char* SDK_SECRET = "ymyO7QeObBafhXXAM4IHLfm9h9CbBWEt";
const char* ACCESS_TOKEN = "w2uAAaGN0WOdmNiNLcKQML4JT3O-5ng2hx2Mur_1dvY01ef";
const char* USER_ID = "developer";
const char* HOST_APP_ID = "691ac9ef2dcfadc65a0fb4a6";

// Global state for launch result
std::atomic<bool> g_launchCompleted{false};
std::atomic<int> g_launchResultCode{-1};
std::atomic<bool> g_shouldExit{false};
std::atomic<bool> g_serverExited{false};
std::atomic<bool> g_gameExited{false};

// Global applet manager pointer for use in handlers
IAppletManagerV3* g_appletManager = nullptr;

// Global ad data storage
AdData g_adData;
