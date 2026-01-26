// demo_http.h - HTTP request functions

#ifndef DEMO_HTTP_H
#define DEMO_HTTP_H

#include <string>

// Platform-specific includes
#ifdef _WIN32
    #ifndef WIN32_LEAN_AND_MEAN
    #define WIN32_LEAN_AND_MEAN
    #endif
    #include <winsock2.h>
    #include <windows.h>
    #include <winhttp.h>
#else
    #include <curl/curl.h>
#endif

// HTTP GET request with optional authorization header
// Windows version uses WinHTTP, macOS version uses libcurl
std::string HttpGet(const std::string& url, const std::string& authHeader = "");

#ifdef _WIN32
// Windows-specific overload for wide string URL
std::string HttpGet(const std::wstring& url, const std::wstring& authHeader = L"");
#endif

// Perform Unity Connect authentication
std::string PerformUnityConnectAuth(const std::string& accessToken);

#endif // DEMO_HTTP_H
