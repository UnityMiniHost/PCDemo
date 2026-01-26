// demo_handlers.cpp - JsApi and event handlers implementation

#include "demo_handlers.h"
#include "demo_config.h"
#include "demo_utils.h"
#include "demo_http.h"
#include <iostream>
#include <sstream>
#include <cstring>

// Handler: TJLoginHost - Unity Connect authentication
bool HandleTJLoginHost(const char* app_id, const std::string& dataStr, int task_id) {
    (void)app_id;
    std::cout << "[JsApiHandler] Handling TJLoginHost authentication..." << std::endl;
    
    try {
        std::string unescapedData = UnescapeJsonString(dataStr);
        std::cout << "[JsApiHandler] Unescaped data: " << unescapedData << std::endl;
        
        std::string accessToken = ExtractJsonStringValue(unescapedData, "accessToken");
        
        if (accessToken.empty()) {
            std::cerr << "[JsApiHandler] accessToken not found in request data" << std::endl;
            std::string errorResponse = R"({"success":false,"errorCode":"MISSING_TOKEN","error":"accessToken is required"})";
            if (g_appletManager) {
                g_appletManager->SendJsApiOrEventResponse(task_id, errorResponse.c_str(), errorResponse.length());
            }
            return false;
        }
        
        std::cout << "[JsApiHandler] Using accessToken for authentication" << std::endl;
        std::string lsToken = PerformUnityConnectAuth(accessToken);
        
        std::ostringstream responseOss;
        responseOss << R"({"success":true,"result":{"code":")" << lsToken << R"("}})";
        std::string successResponse = responseOss.str();
        
        std::cout << "[JsApiHandler] Authentication successful, sending response..." << std::endl;
        if (g_appletManager) {
            g_appletManager->SendJsApiOrEventResponse(task_id, successResponse.c_str(), successResponse.length());
        }
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "[JsApiHandler] Authentication error: " << e.what() << std::endl;
        std::ostringstream errorOss;
        errorOss << R"({"success":false,"errorCode":"API_ERROR","error":")" << e.what() << R"("})";
        std::string errorResponse = errorOss.str();
        if (g_appletManager) {
            g_appletManager->SendJsApiOrEventResponse(task_id, errorResponse.c_str(), errorResponse.length());
        }
        return false;
    }
}

// Handler: loadRewardAd - Load reward ad data from API
bool HandleLoadRewardAd(const char* app_id, const std::string& dataStr, int task_id) {
    (void)app_id;  // Unused parameter
    std::cout << "[JsApiHandler] Handling loadRewardAd..." << std::endl;
    
    try {
        std::string unescapedData = UnescapeJsonString(dataStr);
        std::cout << "[JsApiHandler] Unescaped data: " << unescapedData << std::endl;
        
        std::string adUnitId = ExtractJsonStringValue(unescapedData, "adUnitId");
        std::cout << "[JsApiHandler] Ad unit ID: " << (adUnitId.empty() ? "(default)" : adUnitId) << std::endl;
        
        // Fetch ad data from Unity Connect API
        std::cout << "[JsApiHandler] Loading reward ad from Unity Connect API..." << std::endl;
        std::string adApiResponse = HttpGet("https://connect.unity.cn/api/connect-game/ads");
        std::cout << "[JsApiHandler] Ad API response received, length: " << adApiResponse.length() << std::endl;
        
        // Parse ad data
        std::string adId = ExtractJsonStringValue(adApiResponse, "id");
        std::string adType = ExtractJsonStringValue(adApiResponse, "adType");
        std::string adName = ExtractJsonStringValue(adApiResponse, "name");
        std::string adImage = ExtractJsonStringValue(adApiResponse, "image");
        std::string adUrl = ExtractJsonStringValue(adApiResponse, "url");
        std::string adColor = ExtractJsonStringValue(adApiResponse, "color");
        std::string createdTime = ExtractJsonStringValue(adApiResponse, "createdTime");
        int duration = ExtractJsonIntValue(adApiResponse, "duration", 10);
        bool isShowLogo = ExtractJsonBoolValue(adApiResponse, "isShowLogo", false);
        bool archived = ExtractJsonBoolValue(adApiResponse, "archived", false);
        
        std::cout << "[JsApiHandler] Parsed ad data - id: " << adId 
                  << ", adType: " << adType 
                  << ", duration: " << duration << std::endl;
        
        // Store ad data globally
        g_adData.id = adId;
        g_adData.adType = adType;
        g_adData.name = adName;
        g_adData.image = adImage;
        g_adData.url = adUrl;
        g_adData.color = adColor;
        g_adData.createdTime = createdTime;
        g_adData.duration = duration;
        g_adData.isShowLogo = isShowLogo;
        g_adData.archived = archived;
        g_adData.loaded = true;
        std::cout << "[JsApiHandler] Ad data stored globally for showRewardAd" << std::endl;
        
        // Build success response
        std::ostringstream responseOss;
        responseOss << R"({"success":true,"result":{)";
        responseOss << R"("id":")" << adId << R"(",)";
        responseOss << R"("adType":")" << adType << R"(",)";
        responseOss << R"("name":")" << adName << R"(",)";
        responseOss << R"("image":")" << adImage << R"(",)";
        responseOss << R"("duration":)" << duration << R"(,)";
        responseOss << R"("color":")" << adColor << R"(",)";
        responseOss << R"("isShowLogo":)" << (isShowLogo ? "true" : "false") << R"(,)";
        responseOss << R"("archived":)" << (archived ? "true" : "false") << R"(,)";
        responseOss << R"("url":")" << adUrl << R"(",)";
        responseOss << R"("createdTime":")" << createdTime << R"(")";
        responseOss << R"(}})";
        std::string successResponse = responseOss.str();
        
        std::cout << "[JsApiHandler] loadRewardAd successful, sending response..." << std::endl;
        if (g_appletManager) {
            g_appletManager->SendJsApiOrEventResponse(task_id, successResponse.c_str(), successResponse.length());
        }
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "[JsApiHandler] loadRewardAd error: " << e.what() << std::endl;
        std::ostringstream errorOss;
        errorOss << R"({"success":false,"errorCode":"LOAD_AD_FAILED","error":")" << e.what() << R"("})";
        std::string errorResponse = errorOss.str();
        if (g_appletManager) {
            g_appletManager->SendJsApiOrEventResponse(task_id, errorResponse.c_str(), errorResponse.length());
        }
        return false;
    }
}

// Handler: showRewardAd - Display reward ad UI
bool HandleShowRewardAd(const char* app_id, const std::string& dataStr, int task_id) {
    (void)dataStr;  // Unused parameter
    std::cout << "[JsApiHandler] Handling showRewardAd..." << std::endl;
    
    try {
        if (!g_adData.loaded) {
            std::cout << "[JsApiHandler] No ad data available, please call loadRewardAd first" << std::endl;
            std::string errorResponse = R"({"success":false,"errorCode":"NO_AD_DATA","error":"No ad data available. Please call loadRewardAd first."})";
            if (g_appletManager) {
                g_appletManager->SendJsApiOrEventResponse(task_id, errorResponse.c_str(), errorResponse.length());
            }
            return false;
        }
        
        std::cout << "[JsApiHandler] Showing reward ad - id: " << g_adData.id 
                  << ", duration: " << g_adData.duration << std::endl;
        
        std::string escapedImage = EscapeForJs(g_adData.image);
        std::string escapedName = EscapeForJs(g_adData.name);
        std::string escapedUrl = g_adData.url.empty() ? "https://connect.unity.cn" : EscapeForJs(g_adData.url);
        int duration = g_adData.duration > 0 ? g_adData.duration : 10;
        
        // Build the ad UI creation script
        std::ostringstream adScriptOss;
        adScriptOss << R"((function() {
        var renderRootContainer = document.getElementById('render-root-container');
        if (!renderRootContainer) {
          console.error('[C++ showRewardAd] render-root-container not found');
          return false;
        }
        
        var adContainer = document.createElement('div');
        adContainer.id = 'tj-reward-ad-container';
        adContainer.style.position = 'absolute';
        adContainer.style.top = '0';
        adContainer.style.left = '0';
        adContainer.style.width = '100%';
        adContainer.style.height = '100%';
        adContainer.style.backgroundColor = '#000000';
        adContainer.style.zIndex = '99999';
        adContainer.style.display = 'flex';
        adContainer.style.flexDirection = 'column';
        adContainer.style.justifyContent = 'center';
        adContainer.style.alignItems = 'center';
        
        var imageContainer = document.createElement('div');
        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.width = '100%';
        imageContainer.style.height = '100%';
        
        var adImage = document.createElement('img');
        adImage.src = ')" << escapedImage << R"(';
        adImage.style.borderRadius = '6px';
        adImage.style.cursor = 'pointer';
        adImage.alt = ')" << escapedName << R"(';

        function updateImageSize() {
          var containerWidth = renderRootContainer.offsetWidth;
          var containerHeight = renderRootContainer.offsetHeight;
          var isLandscape = containerWidth > containerHeight;
          if (isLandscape) {
            adImage.style.objectFit = 'contain'; 
            adImage.style.height = '100%';
            adImage.style.width = 'auto';  
          } else {
            adImage.style.objectFit = 'cover'; 
            adImage.style.width = '100%';
            adImage.style.height = '100%';
          }
        }
        updateImageSize();

        var timerContainer = document.createElement('div');
        timerContainer.style.position = 'absolute';
        timerContainer.style.top = '20px';
        timerContainer.style.right = '20px';
        timerContainer.style.color = 'white';
        timerContainer.style.fontSize = '14px';
        timerContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        timerContainer.style.padding = '8px 12px';
        timerContainer.style.borderRadius = '30px';
        timerContainer.style.zIndex = '100000';
        
        var timerText = document.createElement('span');
        timerText.id = 'tj-reward-ad-timer';
        timerText.textContent = '\u5e7f\u544a\u5c06\u5728 )" << duration << R"( \u79d2\u540e\u5173\u95ed';
        timerContainer.appendChild(timerText);
        
        adImage.addEventListener('click', function() { 
          var adUrl = ')" << escapedUrl << R"(';
          if (typeof tj !== 'undefined' && tj.customCommand) {
            tj.customCommand("openSystemBrowser", {
              url: adUrl,
              success: function(res) { console.info("[C++ showRewardAd] openSystemBrowser success:", res); },
              fail: function(res) { console.info("[C++ showRewardAd] openSystemBrowser fail:", res); window.open(adUrl, '_blank'); }
            });
          } else {
            window.open(adUrl, '_blank');
          }
        });
        
        imageContainer.appendChild(adImage);
        adContainer.appendChild(imageContainer);
        adContainer.appendChild(timerContainer);
        renderRootContainer.appendChild(adContainer);
        
        // Start countdown timer
        var remainingTime = )" << duration << R"(;
        var countdownInterval = setInterval(function() {
          remainingTime--;
          var timerElement = document.getElementById('tj-reward-ad-timer');
          if (timerElement) {
            timerElement.textContent = '\u5e7f\u544a\u5c06\u5728 ' + remainingTime + ' \u79d2\u540e\u5173\u95ed';
          }
          
          if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            var adContainerEl = document.getElementById('tj-reward-ad-container');
            if (adContainerEl) {
              adContainerEl.remove();
            }
            if (typeof rewardedVideoCloseCallback === 'function') {
              rewardedVideoCloseCallback(true);
            }
            console.log('[C++ showRewardAd] Ad completed');
          }
        }, 1000);
        
        return true;
      })())";
        
        std::string adScript = adScriptOss.str();
        
        // Inject script via CallAppletCommand
        std::cout << "[JsApiHandler] Injecting ad UI script via CallAppletCommand..." << std::endl;
        
        std::string escapedScript = EscapeForJson(adScript);
        std::ostringstream scriptDataOss;
        scriptDataOss << R"({"script":")" << escapedScript << R"("})";
        std::string scriptData = scriptDataOss.str();
        
        if (g_appletManager) {
            g_appletManager->CallAppletCommand("runCustomScript", task_id, app_id, 
                                               scriptData.c_str(), scriptData.length());
        }
        
        // Send immediate success response
        std::ostringstream responseOss;
        responseOss << R"({"success":true,"result":{"adId":")" << g_adData.id << R"(","message":"Reward ad is showing"}})";
        std::string successResponse = responseOss.str();
        
        std::cout << "[JsApiHandler] showRewardAd UI injected, sending success response..." << std::endl;
        if (g_appletManager) {
            g_appletManager->SendJsApiOrEventResponse(task_id, successResponse.c_str(), successResponse.length());
        }
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "[JsApiHandler] showRewardAd error: " << e.what() << std::endl;
        std::ostringstream errorOss;
        errorOss << R"({"success":false,"errorCode":"SHOW_AD_FAILED","error":")" << e.what() << R"("})";
        std::string errorResponse = errorOss.str();
        if (g_appletManager) {
            g_appletManager->SendJsApiOrEventResponse(task_id, errorResponse.c_str(), errorResponse.length());
        }
        return false;
    }
}

// Main JsApi handler - dispatches to specific handlers
bool OnJsApiHandler(const char* app_id, const char* api_name, const char* data, size_t data_size, int task_id) {
    std::cout << "\n[JsApiHandler] JsApi call received!" << std::endl;
    std::cout << "  Applet ID: " << app_id << std::endl;
    std::cout << "  API Name: " << api_name << std::endl;
    std::cout << "  Task ID: " << task_id << std::endl;
    std::cout << "  Data Size: " << data_size << std::endl;
    
    std::string dataStr = (data && data_size > 0) ? std::string(data, data_size) : "";
    if (!dataStr.empty()) {
        std::cout << "  Data: " << dataStr << std::endl;
    }
    
    // Dispatch to specific handler based on api_name
    if (api_name) {
        if (strcmp(api_name, "TJLoginHost") == 0) {
            return HandleTJLoginHost(app_id, dataStr, task_id);
        }
        if (strcmp(api_name, "loadRewardAd") == 0) {
            return HandleLoadRewardAd(app_id, dataStr, task_id);
        }
        if (strcmp(api_name, "showRewardAd") == 0) {
            return HandleShowRewardAd(app_id, dataStr, task_id);
        }
    }
    
    // API not handled - send not_handled response so server can use fallback
    std::cout << "[JsApiHandler] API not handled: " << (api_name ? api_name : "null") << std::endl;
    
    std::ostringstream responseOss;
    responseOss << R"({"success":false,"errorCode":"NOT_HANDLED","error":"API ')" 
                << (api_name ? api_name : "null") 
                << R"(' is not handled by client"})";
    std::string notHandledResponse = responseOss.str();
    
    if (g_appletManager) {
        g_appletManager->SendJsApiOrEventResponse(task_id, notHandledResponse.c_str(), notHandledResponse.length());
    }
    
    return false;
}

// Event handler - called when game sends an event
bool OnEventHandler(const char* event_name, const char* data, size_t data_size, int task_id) {
    std::cout << "\n[EventHandler] Event received!" << std::endl;
    std::cout << "  Event Name: " << event_name << std::endl;
    std::cout << "  Task ID: " << task_id << std::endl;
    std::cout << "  Data Size: " << data_size << std::endl;
    if (data && data_size > 0) {
        std::cout << "  Data: " << std::string(data, data_size) << std::endl;
    }
    
    // Exit demo immediately when game exits (notification is forwarded from AppletManager)
    if (event_name && strcmp(event_name, "game_exited") == 0) {
        std::cout << "[EventHandler] Game exited, will exit demo..." << std::endl;
        g_gameExited = true;
        g_shouldExit = true;
    }

    // Return true to indicate we handled the event
    return true;
}
