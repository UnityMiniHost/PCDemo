// demo_handlers.h - JsApi and event handlers

#ifndef DEMO_HANDLERS_H
#define DEMO_HANDLERS_H

#include <string>

// JsApi handler - dispatches to specific handlers
// Called when game sends a JsApi request
bool OnJsApiHandler(const char* app_id, const char* api_name, const char* data, size_t data_size, int task_id);

// Event handler - called when game sends an event
bool OnEventHandler(const char* event_name, const char* data, size_t data_size, int task_id);

// Specific JsApi handlers
bool HandleTJLoginHost(const char* app_id, const std::string& dataStr, int task_id);
bool HandleLoadRewardAd(const char* app_id, const std::string& dataStr, int task_id);
bool HandleShowRewardAd(const char* app_id, const std::string& dataStr, int task_id);

#endif // DEMO_HANDLERS_H
