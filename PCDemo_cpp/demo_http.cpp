// demo_http.cpp - HTTP request functions implementation

#include "demo_http.h"
#include "demo_utils.h"
#include <iostream>
#include <stdexcept>

#ifdef _WIN32
#pragma comment(lib, "winhttp.lib")

// Windows HTTP implementation using WinHTTP (with optional Authorization header)
std::string HttpGet(const std::wstring& url, const std::wstring& authHeader) {
    std::string response;
    HINTERNET hSession = NULL;
    HINTERNET hConnect = NULL;
    HINTERNET hRequest = NULL;
    
    try {
        // Parse URL
        URL_COMPONENTS urlComp;
        ZeroMemory(&urlComp, sizeof(urlComp));
        urlComp.dwStructSize = sizeof(urlComp);
        
        wchar_t hostname[256];
        wchar_t urlPath[1024];
        urlComp.lpszHostName = hostname;
        urlComp.dwHostNameLength = sizeof(hostname) / sizeof(wchar_t);
        urlComp.lpszUrlPath = urlPath;
        urlComp.dwUrlPathLength = sizeof(urlPath) / sizeof(wchar_t);
        
        if (!WinHttpCrackUrl(url.c_str(), (DWORD)url.length(), 0, &urlComp)) {
            throw std::runtime_error("Failed to parse URL");
        }
        
        // Initialize WinHTTP
        hSession = WinHttpOpen(L"WebGLHost Demo/1.0",
                              WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                              WINHTTP_NO_PROXY_NAME,
                              WINHTTP_NO_PROXY_BYPASS, 0);
        
        if (!hSession) {
            throw std::runtime_error("WinHttpOpen failed");
        }
        
        // Connect
        hConnect = WinHttpConnect(hSession, hostname, urlComp.nPort, 0);
        if (!hConnect) {
            throw std::runtime_error("WinHttpConnect failed");
        }
        
        // Open request
        DWORD dwFlags = (urlComp.nScheme == INTERNET_SCHEME_HTTPS) ? WINHTTP_FLAG_SECURE : 0;
        hRequest = WinHttpOpenRequest(hConnect, L"GET", urlPath,
                                     NULL, WINHTTP_NO_REFERER,
                                     WINHTTP_DEFAULT_ACCEPT_TYPES,
                                     dwFlags);
        
        if (!hRequest) {
            throw std::runtime_error("WinHttpOpenRequest failed");
        }
        
        // Add Authorization header if provided
        const wchar_t* headers = authHeader.empty() ? WINHTTP_NO_ADDITIONAL_HEADERS : authHeader.c_str();
        DWORD headersLen = authHeader.empty() ? 0 : (DWORD)authHeader.length();
        
        // Send request
        if (!WinHttpSendRequest(hRequest,
                               headers, headersLen,
                               WINHTTP_NO_REQUEST_DATA, 0, 0, 0)) {
            throw std::runtime_error("WinHttpSendRequest failed");
        }
        
        // Receive response
        if (!WinHttpReceiveResponse(hRequest, NULL)) {
            throw std::runtime_error("WinHttpReceiveResponse failed");
        }
        
        // Read data
        DWORD dwSize = 0;
        DWORD dwDownloaded = 0;
        char buffer[4096];
        
        do {
            dwSize = 0;
            if (!WinHttpQueryDataAvailable(hRequest, &dwSize)) {
                throw std::runtime_error("WinHttpQueryDataAvailable failed");
            }
            
            if (dwSize == 0) {
                break;
            }
            
            if (dwSize > sizeof(buffer)) {
                dwSize = sizeof(buffer);
            }
            
            ZeroMemory(buffer, sizeof(buffer));
            
            if (!WinHttpReadData(hRequest, buffer, dwSize, &dwDownloaded)) {
                throw std::runtime_error("WinHttpReadData failed");
            }
            
            response.append(buffer, dwDownloaded);
            
        } while (dwSize > 0);
        
    } catch (const std::exception& e) {
        std::cerr << "[HttpGet] Error: " << e.what() << std::endl;
        
        // Cleanup on error
        if (hRequest) WinHttpCloseHandle(hRequest);
        if (hConnect) WinHttpCloseHandle(hConnect);
        if (hSession) WinHttpCloseHandle(hSession);
        
        throw;
    }
    
    // Cleanup
    if (hRequest) WinHttpCloseHandle(hRequest);
    if (hConnect) WinHttpCloseHandle(hConnect);
    if (hSession) WinHttpCloseHandle(hSession);
    
    return response;
}

// Overload for std::string URL on Windows
std::string HttpGet(const std::string& url, const std::string& authHeader) {
    std::wstring wurl(url.begin(), url.end());
    std::wstring wAuthHeader(authHeader.begin(), authHeader.end());
    return HttpGet(wurl, wAuthHeader);
}

#else
// macOS/POSIX HTTP implementation using libcurl

// Callback function for curl to write response data
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t realsize = size * nmemb;
    std::string* response = static_cast<std::string*>(userp);
    response->append(static_cast<char*>(contents), realsize);
    return realsize;
}

std::string HttpGet(const std::string& url, const std::string& authHeader) {
    std::string response;
    CURL* curl = curl_easy_init();
    
    if (!curl) {
        throw std::runtime_error("Failed to initialize curl");
    }
    
    struct curl_slist* headers = NULL;
    if (!authHeader.empty()) {
        headers = curl_slist_append(headers, authHeader.c_str());
    }
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    if (headers) {
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    }
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "WebGLHost Demo/1.0");
    
    // For HTTPS
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);
    
    CURLcode res = curl_easy_perform(curl);
    
    if (headers) {
        curl_slist_free_all(headers);
    }
    
    if (res != CURLE_OK) {
        curl_easy_cleanup(curl);
        throw std::runtime_error(std::string("curl_easy_perform() failed: ") + curl_easy_strerror(res));
    }
    
    curl_easy_cleanup(curl);
    return response;
}

#endif

// Perform Unity Connect authentication
std::string PerformUnityConnectAuth(const std::string& accessToken) {
    std::cout << "[Auth] Performing Unity Connect authentication..." << std::endl;
    
    try {
        std::string encodedToken = UrlEncode(accessToken);
        std::string urlStr = "https://example.com/minihost?token=" + encodedToken;
        
        std::cout << "[Auth] Request URL: " << urlStr << std::endl;
        
        std::string responseBody = HttpGet(urlStr);
        
        std::cout << "[Auth] Response: " << responseBody << std::endl;
        
        // Extract LSToken from response
        std::string lsToken = ExtractJsonStringValue(responseBody, "LSToken");
        
        if (lsToken.empty()) {
            throw std::runtime_error("LSToken not found in auth response");
        }
        
        std::cout << "[Auth] LSToken obtained: " << lsToken << std::endl;
        
        return lsToken;
        
    } catch (const std::exception& e) {
        std::cerr << "[Auth] Authentication failed: " << e.what() << std::endl;
        throw;
    }
}
