// demo_game.h - Game list and launch related functions

#ifndef DEMO_GAME_H
#define DEMO_GAME_H

#include <string>
#include <vector>
#include "include/ICoreServiceHandler.h"

// Game info structure
// Contains information about a game fetched from the game list API
struct GameInfo {
    std::string id;         // Game ID (also called Applet ID) - unique identifier for the game
    std::string hostAppId;  // Host App ID - the application that hosts this game
    std::string name;       // Game name
    std::string briefIntro; // Brief introduction
    std::string gameType;   // Game type
    std::string iconUrl;    // Icon URL
    std::string launchKey;  // Launch key URL - used to start the game session
    
    GameInfo() {}
};

// Fetch game list from API
// Returns a vector of GameInfo containing all available games
std::vector<GameInfo> FetchGameList();

// Get first game info (id and launchKey) from list
// Returns true if successful, false if no games available
// outAppletId: receives the game's ID (used as app_id parameter in LaunchApplet)
// outLaunchKey: receives the game's launch key URL (used in launchConfig)
bool GetFirstGameInfo(const std::vector<GameInfo>& gameList, std::string& outAppletId, std::string& outLaunchKey);

// Launch callback
void OnLaunchComplete(const char* appId, int resultCode, const char* errorDesc);

// Core service handler implementation
class DemoCoreServiceHandler : public ICoreServiceHandler {
public:
    // COM interface methods
    virtual INT QueryInterface(const char* type, void** ppvObject) override;
    virtual ULONG AddRef(void) override;
    virtual ULONG Release(void) override;
    
    // Event handlers
    virtual void OnContextInitialized() override;
    virtual void OnServiceDisconnected() override;
    virtual bool OnCommonEventHappened(const char* event_name, int32_t callback_id,
                                      const char* data, const unsigned int data_size) override;
};

#endif // DEMO_GAME_H
