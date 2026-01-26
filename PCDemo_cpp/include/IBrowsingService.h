// IBrowsingService.h - Main browsing service interface

#ifndef IBROWSINGSERVICE_H
#define IBROWSINGSERVICE_H

#include "WIUnknown.h"
#include "ICoreServiceHandler.h"

// Error codes
#define WMPF_ERRCODE_SUCCESS           0
#define WMPF_ERRCODE_FAIL             -1
#define WMPF_ERRCODE_INVALID_PARAM    -2
#define WMPF_ERRCODE_NOT_INITIALIZED  -3
#define WMPF_ERRCODE_ALREADY_INITIALIZED -4

// IBrowsingService - Main service interface
interface IBrowsingService : public WIUnknown {
    // Initialize browsing core
    virtual int InitializeBrowsingCore(
        const char* config,           // JSON configuration string
        const char* runtime_path,     // Runtime path
        ICoreServiceHandler* handler  // Event handler
    ) = 0;
    
    // Uninitialize browsing core
    virtual void UninitializeBrowsingCore() = 0;
    
    // Call common command (optional, for future extensions)
    virtual bool CallCommonCommand(
        const char* command_name,
        int32_t callback_id,
        const char* data,
        const unsigned int data_size
    ) = 0;
};

// Factory function to get IBrowsingService instance
extern "C" WEBGLHOST_API IBrowsingService* GetBrowsingService();

#endif // IBROWSINGSERVICE_H
