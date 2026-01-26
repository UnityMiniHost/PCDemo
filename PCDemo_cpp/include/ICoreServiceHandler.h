// ICoreServiceHandler.h - Core service event handler interface

#ifndef ICORESERVICEHANDLER_H
#define ICORESERVICEHANDLER_H

#include "WIUnknown.h"

// ICoreServiceHandler - Event callback interface
interface ICoreServiceHandler : public WIUnknown {
    // Called when context is initialized
    virtual void OnContextInitialized() = 0;
    
    // Called when service is disconnected
    virtual void OnServiceDisconnected() = 0;
    
    // Called when common event happens
    virtual bool OnCommonEventHappened(
        const char* event_name,
        int32_t callback_id,
        const char* data,
        const unsigned int data_size
    ) = 0;
};

#endif // ICORESERVICEHANDLER_H
