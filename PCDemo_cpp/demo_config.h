// demo_config.h - Configuration constants and global state
// Cross-platform support for Windows and macOS

#ifndef DEMO_CONFIG_H
#define DEMO_CONFIG_H

#include <string>
#include <atomic>
#include "include/IAppletManagerV3.h"

// Configuration from development.json
extern const char* SDK_KEY;
extern const char* SDK_SECRET;
extern const char* ACCESS_TOKEN;
extern const char* USER_ID;
extern const char* HOST_APP_ID;

// Global state for launch result
extern std::atomic<bool> g_launchCompleted;
extern std::atomic<int> g_launchResultCode;
extern std::atomic<bool> g_shouldExit;
extern std::atomic<bool> g_serverExited;
extern std::atomic<bool> g_gameExited;

// Global applet manager pointer for use in handlers
extern IAppletManagerV3* g_appletManager;

// Global ad data storage for showRewardAd
struct AdData {
    std::string id;
    std::string adType;
    std::string name;
    std::string image;
    std::string url;
    std::string color;
    std::string createdTime;
    int duration;
    bool isShowLogo;
    bool archived;
    bool loaded;
    
    AdData() : duration(10), isShowLogo(false), archived(false), loaded(false) {}
};

extern AdData g_adData;

#endif // DEMO_CONFIG_H
