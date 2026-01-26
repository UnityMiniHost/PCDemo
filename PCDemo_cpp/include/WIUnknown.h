// WIUnknown.h - Base interface for COM-style objects

#ifndef WIUNKNOWN_H
#define WIUNKNOWN_H

#include <stdint.h>

// Platform-specific definitions
#ifdef _WIN32
    #ifndef WIN32_LEAN_AND_MEAN
    #define WIN32_LEAN_AND_MEAN
    #endif
    #include <windows.h>
    #define WEBGLHOST_API __declspec(dllexport)
    // Use Windows types
    // INT, UINT, ULONG are already defined by windows.h
#else
    #define WEBGLHOST_API __attribute__((visibility("default")))
    typedef int32_t INT;
    typedef uint32_t UINT;
    typedef uint64_t ULONG;
#endif

// Interface macro
#define interface struct

// WIUnknown - Base interface for all COM-style objects
interface WIUnknown {
    // Query interface by type name
    virtual INT QueryInterface(const char* type, void** ppvObject) = 0;
    
    // Reference counting
    virtual ULONG AddRef(void) = 0;
    virtual ULONG Release(void) = 0;
    
    // Virtual destructor
    virtual ~WIUnknown() {}
};

// WIUnknownImpl - Base implementation for temporary/stack objects
// Use this for handler objects that don't need reference counting
class WIUnknownImpl : public WIUnknown {
public:
    // Default QueryInterface - returns failure, override if needed
    virtual INT QueryInterface(const char* type, void** ppvObject) override {
        (void)type;
        (void)ppvObject;
        return -1; // WMPF_ERRCODE_FAIL
    }
    
    // No-op reference counting for stack objects
    virtual ULONG AddRef(void) override {
        return 1;
    }
    
    virtual ULONG Release(void) override {
        return 1;
    }
    
    virtual ~WIUnknownImpl() {}
};

#endif // WIUNKNOWN_H
