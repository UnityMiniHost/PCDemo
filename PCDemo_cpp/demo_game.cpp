// demo_game.cpp - Game list and launch related functions implementation

#include "demo_game.h"
#include "demo_config.h"
#include "demo_utils.h"
#include "demo_http.h"
#include <iostream>
#include <cstring>

// Fetch game list from API
std::vector<GameInfo> FetchGameList() {
    std::vector<GameInfo> gameList;
    
    try {
        std::cout << "[GameList] Fetching game list from API..." << std::endl;
        
        // Build URL with HOST_APP_ID
        std::string url = std::string("https://minihost.tuanjie.cn/api/game/list?appId=") + HOST_APP_ID;
        const char* serviceToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBkN2EzMWRmLWJhYmEtNDQzZC1iNTk5LWQ4MDc5NThjZDc4ZCIsInBsYXRmb3JtU2VydmVySWQiOiI2OTFhY2IzOTJkY2ZhZGM2NWEwZmRmNGIifQ.h7W_ElOARDg9hwm3LXQ0L8NIX8BPsNmN8Zh5s5AAFwY";
        
        std::string authHeader = std::string("Authorization: Bearer ") + serviceToken;
        
        std::cout << "[GameList] Request URL: " << url << std::endl;
        
        std::string responseBody = HttpGet(url, authHeader);
        
        std::cout << "[GameList] Response received, parsing..." << std::endl;
        
        // Parse JSON array - simple manual parsing
        // Expected format: [{"id":"...","appId":"...","name":"...","launchKey":"..."}]
        
        size_t pos = 0;
        while (true) {
            // Find next object start
            size_t objStart = responseBody.find("{", pos);
            if (objStart == std::string::npos) break;
            
            // Find object end
            size_t objEnd = responseBody.find("}", objStart);
            if (objEnd == std::string::npos) break;
            
            std::string objStr = responseBody.substr(objStart, objEnd - objStart + 1);
            
            // Extract fields
            GameInfo game;
            game.id = ExtractJsonStringValue(objStr, "id");
            game.hostAppId = ExtractJsonStringValue(objStr, "appId");
            game.name = ExtractJsonStringValue(objStr, "name");
            game.briefIntro = ExtractJsonStringValue(objStr, "briefIntro");
            game.gameType = ExtractJsonStringValue(objStr, "gameType");
            game.iconUrl = ExtractJsonStringValue(objStr, "iconUrl");
            game.launchKey = ExtractJsonStringValue(objStr, "launchKey");
            
            if (!game.id.empty() && !game.launchKey.empty()) {
                gameList.push_back(game);
                std::cout << "[GameList] Found game: " << game.name 
                         << " (ID: " << game.id << ")" << std::endl;
            }
            
            pos = objEnd + 1;
        }
        
        std::cout << "[GameList] Successfully fetched " << gameList.size() 
                 << " games" << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "[GameList] Error fetching game list: " << e.what() << std::endl;
    }
    
    return gameList;
}

// Get first game info (id and launchKey) from list
bool GetFirstGameInfo(const std::vector<GameInfo>& gameList, std::string& outAppletId, std::string& outLaunchKey) {
    if (gameList.empty()) {
        std::cerr << "\n[GameList] ERROR: No games available" << std::endl;
        return false;
    }
    
    const GameInfo& firstGame = gameList[0];
    
    std::cout << "\n========================================" << std::endl;
    std::cout << "Auto-selecting first game:" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Name: " << firstGame.name << std::endl;
    std::cout << "ID: " << firstGame.id << std::endl;
    std::cout << "Type: " << firstGame.gameType << std::endl;
    if (!firstGame.briefIntro.empty()) {
        std::cout << "Intro: " << firstGame.briefIntro << std::endl;
    }
    std::cout << "Launch Key: " << firstGame.launchKey << std::endl;
    std::cout << "========================================\n" << std::endl;
    
    outAppletId = firstGame.id;
    outLaunchKey = firstGame.launchKey;
    return true;
}

// Launch callback
void OnLaunchComplete(const char* appId, int resultCode, const char* errorDesc) {
    std::cout << "\n[LaunchCallback] Launch finished!" << std::endl;
    std::cout << "  Applet ID: " << appId << std::endl;
    std::cout << "  Result Code: " << resultCode << std::endl;
    if (errorDesc && strlen(errorDesc) > 0) {
        std::cout << "  Error: " << errorDesc << std::endl;
    }
    
    g_launchCompleted = true;
    g_launchResultCode = resultCode;
    
    // If launch failed, signal to exit
    if (resultCode != 0) {
        std::cerr << "[LaunchCallback] Launch failed, will exit..." << std::endl;
        g_shouldExit = true;
    }
}

// DemoCoreServiceHandler implementation

INT DemoCoreServiceHandler::QueryInterface(const char* type, void** ppvObject) {
    (void)type; (void)ppvObject;
    return -1;  // Not implemented
}

ULONG DemoCoreServiceHandler::AddRef(void) {
    return 1;  // No-op for stack objects
}

ULONG DemoCoreServiceHandler::Release(void) {
    return 1;  // No-op for stack objects
}

void DemoCoreServiceHandler::OnContextInitialized() {
    std::cout << "[CoreServiceHandler] Context initialized" << std::endl;
}

void DemoCoreServiceHandler::OnServiceDisconnected() {
    std::cout << "[CoreServiceHandler] Service disconnected" << std::endl;
    g_serverExited = true;
    g_shouldExit = true;
}

bool DemoCoreServiceHandler::OnCommonEventHappened(const char* event_name, int32_t callback_id,
                                                   const char* data, const unsigned int data_size) {
    std::cout << "[CoreServiceHandler] Event: " << event_name << std::endl;
    std::cout << "[CoreServiceHandler] Callback ID: " << callback_id << std::endl;
    std::cout << "[CoreServiceHandler] Data size: " << data_size << std::endl;
    if (data && data_size > 0) {
        std::cout << "[CoreServiceHandler] Data: " << data << std::endl;
    }
    
    // Check for server process exit event
    if (event_name && strcmp(event_name, "cservice_event_report_process") == 0) {
        // Parse event data to check if server is exiting
        if (data && strstr(data, "\"event\":2")) {
            std::cout << "[CoreServiceHandler] Server process exiting, will exit client..." << std::endl;
            g_serverExited = true;
            g_shouldExit = true;
        }
    }
    
    // Check for game exit notification
    if (event_name && strcmp(event_name, "game_exited") == 0) {
        std::cout << "[CoreServiceHandler] Game process exited, will exit client..." << std::endl;
        g_gameExited = true;  // Mark game as exited
        g_shouldExit = true;
    }
    
    return true;
}
