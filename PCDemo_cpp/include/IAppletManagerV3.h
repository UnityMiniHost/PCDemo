// IAppletManagerV3.h - Applet (Game) management interface

#ifndef IAPPLETMANAGERV3_H
#define IAPPLETMANAGERV3_H

#include "WIUnknown.h"

// Forward declarations
interface IAppletManagerV3;

// Callback function types

// Launch callback - called when applet launch completes
typedef void (*LaunchCallback)(
    const char* app_id,
    int result_code,
    const char* error_desc
);

// JsApi handler - handles JsApi calls from applet
typedef bool (*JsApiHandler)(
    const char* app_id,
    const char* api_name,
    const char* data,
    size_t data_size,
    int task_id
);

// Event handler - handles events from applet
typedef bool (*EventHandler)(
    const char* event_name,
    const char* data,
    size_t data_size,
    int task_id
);

// IAppletManagerV3 - Applet management interface
interface IAppletManagerV3 : public WIUnknown {
    // Launch applet
    virtual void LaunchApplet(
        const char* app_id,
        const char* launch_config_pb,  // JSON string
        size_t launch_config_pb_length,
        LaunchCallback callback
    ) = 0;
    
    // Close applet
    virtual void CloseApplet(const char* app_id) = 0;
    
    // Set JsApi handler
    virtual void SetJsApiHandler(JsApiHandler jsapi_handler) = 0;
    
    // Set applet event handler
    virtual void SetAppletEventHandler(EventHandler event_handler) = 0;
    
    // Send JsApi or event response
    virtual void SendJsApiOrEventResponse(
        int task_id,
        const char* data,
        size_t data_size
    ) = 0;
    
    // Call applet command (optional, for future extensions)
    virtual void CallAppletCommand(
        const char* command_name,
        int32_t task_id,
        const char* app_id,
        const char* data,
        size_t data_size
    ) = 0;
};

#endif // IAPPLETMANAGERV3_H
