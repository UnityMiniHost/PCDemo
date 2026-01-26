# WebGLHost Native SDK - API Integration Guide

## 概述

WebGLHost Native SDK 提供了一套完整的 C++ API，用于在 Windows 和 macOS 桌面应用中集成和管理 WebGL 游戏小程序。本文档详细介绍如何使用 SDK 的核心 API。

## 目录

- [快速开始](#快速开始)
- [核心接口](#核心接口)
  - [IBrowsingService](#ibrowsingservice)
  - [IAppletManagerV3](#iappletmanagerv3)
  - [ICoreServiceHandler](#icoreservicehandler)
- [完整示例](#完整示例)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)

---

## 快速开始

### 1. 环境要求

#### Windows
- **操作系统**: Windows 10/11 (x64)
- **编译器**: Visual Studio 2019 或更高版本
- **C++ 标准**: C++17 或更高
- **依赖库**: ws2_32.lib (Windows Sockets)

#### macOS
- **操作系统**: macOS 10.15+ (Catalina 或更高版本)
- **编译器**: Xcode Command Line Tools (clang)
- **C++ 标准**: C++17 或更高
- **依赖库**: 系统框架 (自动链接)

### 2. 集成步骤

#### 步骤 1: 添加头文件

将 `include/` 目录添加到项目的包含路径：

```cpp
#include "IBrowsingService.h"
#include "IAppletManagerV3.h"
#include "ICoreServiceHandler.h"
```

#### 步骤 2: 链接库

**Windows:**
```cmake
target_link_libraries(your_app ws2_32)
```

**macOS:**
不需要显式链接系统库，CMake 会自动处理。

#### 步骤 3: 加载库文件

**Windows:**
```cpp
#include <windows.h>

HMODULE hDll = LoadLibraryA("host\\webglhost_export.dll");
if (!hDll) {
    // Handle error
    std::cerr << "Failed to load DLL: " << GetLastError() << std::endl;
    return 1;
}
```

**macOS:**
```cpp
#include <dlfcn.h>

void* hDll = dlopen("host/libwebglhost_export.dylib", RTLD_LAZY);
if (!hDll) {
    // Handle error
    std::cerr << "Failed to load dylib: " << dlerror() << std::endl;
    return 1;
}
```

#### 步骤 4: 获取服务实例

**Windows:**
```cpp
typedef IBrowsingService* (*GetBrowsingServiceFunc)();
GetBrowsingServiceFunc getBrowsingService =
    (GetBrowsingServiceFunc)GetProcAddress(hDll, "GetBrowsingService");

IBrowsingService* service = getBrowsingService();
```

**macOS:**
```cpp
typedef IBrowsingService* (*GetBrowsingServiceFunc)();
GetBrowsingServiceFunc getBrowsingService =
    (GetBrowsingServiceFunc)dlsym(hDll, "GetBrowsingService");

IBrowsingService* service = getBrowsingService();
```

---

## 核心接口

### IBrowsingService

`IBrowsingService` 是 SDK 的主要入口点，负责初始化和管理浏览服务。

#### 方法

##### InitializeBrowsingCore

初始化浏览核心服务。

```cpp
int InitializeBrowsingCore(
    const char* config,           // JSON 配置字符串
    const char* runtime_path,     // Runtime 可执行文件路径
    ICoreServiceHandler* handler  // 事件处理器
);
```

**参数说明**:

- `config`: JSON 格式的配置字符串，包含以下字段：
  ```json
  {
      "sdkKey": "your-sdk-key",
      "sdkSecret": "your-sdk-secret",
      "accessToken": "your-access-token",
      "debug": true,
      "logLevel": "debug"
  }
  ```

- `runtime_path`: Runtime 可执行文件的路径，例如 `"runtime\\webglhost-runtime.exe"`

- `handler`: 实现 `ICoreServiceHandler` 接口的事件处理器对象

**返回值**:
- `0` (WMPF_ERRCODE_SUCCESS): 初始化成功
- `-1` (WMPF_ERRCODE_FAIL): 初始化失败
- `-2` (WMPF_ERRCODE_INVALID_PARAM): 参数无效
- `-4` (WMPF_ERRCODE_ALREADY_INITIALIZED): 已经初始化

**示例**:

```cpp
// Build config JSON
char config[1024];
snprintf(config, sizeof(config), R"({
    "sdkKey": "%s",
    "sdkSecret": "%s",
    "accessToken": "%s",
    "debug": true,
    "logLevel": "debug"
})", SDK_KEY, SDK_SECRET, ACCESS_TOKEN);

// Initialize
DemoCoreServiceHandler handler;
int result = service->InitializeBrowsingCore(
    config, 
    "runtime\\webglhost-runtime.exe", 
    &handler
);

if (result != 0) {
    std::cerr << "Initialization failed: " << result << std::endl;
}
```

##### UninitializeBrowsingCore

卸载浏览核心服务，释放资源。

```cpp
void UninitializeBrowsingCore();
```

**示例**:

```cpp
service->UninitializeBrowsingCore();
```

##### QueryInterface

查询指定类型的接口。

```cpp
int QueryInterface(const char* type, void** ppvObject);
```

**参数说明**:
- `type`: 接口类型名称，例如 `"IAppletManagerV3"`
- `ppvObject`: 输出参数，接收接口指针

**返回值**:
- `0`: 查询成功
- 非 `0`: 查询失败

**示例**:

```cpp
IAppletManagerV3* appletManager = nullptr;
int result = service->QueryInterface("IAppletManagerV3", (void**)&appletManager);
if (result == 0 && appletManager) {
    // Use appletManager
}
```

##### AddRef / Release

引用计数管理（COM 风格）。

```cpp
ULONG AddRef(void);
ULONG Release(void);
```

**示例**:

```cpp
service->AddRef();   // Increment reference count
service->Release();  // Decrement reference count
```

---

### IAppletManagerV3

`IAppletManagerV3` 负责小程序（游戏）的生命周期管理。

#### 方法

##### LaunchApplet

启动小程序。

```cpp
void LaunchApplet(
    const char* app_id,                    // 小程序 ID (来源于游戏列表 API)
    const char* launch_config_pb,          // 启动配置 (JSON 字符串)
    size_t launch_config_pb_length,        // 配置长度
    LaunchCallback callback                // 启动完成回调
);
```

**参数说明**:

- `app_id`: 小程序的唯一标识符，**来源于游戏列表 API 返回的 `id` 字段**
- `launch_config_pb`: JSON 格式的启动配置：
  ```json
  {
      "launchKey": "https://minihost.tuanjie.cn/api/game/start_session?gameId=xxx",
      "accessToken": "your-access-token",
      "userId": "user-id",
      "debug": true,
      "mute": false,
      "transparent": true
  }
  ```
  其中 `launchKey` **来源于游戏列表 API 返回的 `launchKey` 字段**
- `launch_config_pb_length`: 配置字符串的长度
- `callback`: 启动完成时的回调函数

**关键参数来源**:

| 参数 | 说明 | 来源 |
|------|------|------|
| `app_id` | 游戏唯一标识符 | 游戏列表 API 返回的 `id` 字段 |
| `launchKey` | 游戏启动 URL | 游戏列表 API 返回的 `launchKey` 字段 |

**回调函数签名**:

```cpp
typedef void (*LaunchCallback)(
    const char* app_id,      // 小程序 ID
    int result_code,         // 结果码 (0 = 成功)
    const char* error_desc   // 错误描述 (如果失败)
);
```

**示例**:

```cpp
// Define callback
void OnLaunchComplete(const char* appId, int resultCode, const char* errorDesc) {
    if (resultCode == 0) {
        std::cout << "Launch successful!" << std::endl;
    } else {
        std::cerr << "Launch failed: " << errorDesc << std::endl;
    }
}

// Prepare launch config
char launchConfig[2048];
snprintf(launchConfig, sizeof(launchConfig), R"({
    "launchKey": "%s",
    "accessToken": "%s",
    "userId": "%s",
    "debug": true,
    "mute": false,
    "transparent": true
})", LAUNCH_KEY, ACCESS_TOKEN, USER_ID);

// Launch applet
appletManager->LaunchApplet(
    APPLET_ID, 
    launchConfig, 
    strlen(launchConfig),
    OnLaunchComplete
);
```

##### CloseApplet

关闭小程序。

```cpp
void CloseApplet(const char* app_id);
```

**参数说明**:
- `app_id`: 要关闭的小程序 ID，**必须与 `LaunchApplet` 时使用的 `app_id` 相同**（来源于游戏列表 API 返回的 `id` 字段）

**示例**:

```cpp
// 使用与 LaunchApplet 相同的 app_id
appletManager->CloseApplet("691acb162dcfadc65a0fdb77");
```

##### SetAppletEventHandler

设置小程序事件处理器。

```cpp
void SetAppletEventHandler(EventHandler event_handler);
```

**EventHandler 签名**:

```cpp
typedef bool (*EventHandler)(
    const char* event_name,  // 事件名称
    const char* data,        // 事件数据 (JSON)
    size_t data_size,        // 数据大小
    int task_id              // 任务 ID
);
```

**示例**:

```cpp
bool OnAppletEvent(const char* eventName, const char* data, 
                   size_t dataSize, int taskId) {
    std::cout << "Event received: " << eventName << std::endl;
    // Handle event
    return true;
}

appletManager->SetAppletEventHandler(OnAppletEvent);
```

---

### ICoreServiceHandler

`ICoreServiceHandler` 是事件回调接口，用于接收核心服务的事件通知。

#### 方法

##### OnContextInitialized

当上下文初始化完成时调用。

```cpp
virtual void OnContextInitialized() = 0;
```

**示例**:

```cpp
class MyHandler : public ICoreServiceHandler {
public:
    virtual void OnContextInitialized() override {
        std::cout << "Context initialized!" << std::endl;
    }
};
```

##### OnServiceDisconnected

当服务断开连接时调用。

```cpp
virtual void OnServiceDisconnected() = 0;
```

**示例**:

```cpp
virtual void OnServiceDisconnected() override {
    std::cout << "Service disconnected!" << std::endl;
    // Cleanup and exit
}
```

##### OnCommonEventHappened

当通用事件发生时调用。

```cpp
virtual bool OnCommonEventHappened(
    const char* event_name,        // 事件名称
    int32_t callback_id,           // 回调 ID
    const char* data,              // 事件数据 (JSON)
    const unsigned int data_size   // 数据大小
) = 0;
```

**常见事件**:

- `cservice_event_report_process`: 进程状态报告
- `game_exited`: 游戏退出通知

**示例**:

```cpp
virtual bool OnCommonEventHappened(const char* event_name, int32_t callback_id,
                                   const char* data, const unsigned int data_size) override {
    std::cout << "Event: " << event_name << std::endl;
    
    if (data && data_size > 0) {
        std::cout << "Data: " << data << std::endl;
    }
    
    // Check for game exit
    if (strcmp(event_name, "game_exited") == 0) {
        std::cout << "Game has exited" << std::endl;
        // Handle game exit
    }
    
    return true;
}
```

---

## 完整示例

以下是一个完整的集成示例，展示了如何初始化 SDK、启动游戏、处理事件和清理资源。

```cpp
#ifdef _WIN32
#include <windows.h>
#else
#include <dlfcn.h>
#endif
#include <iostream>
#include "IBrowsingService.h"
#include "IAppletManagerV3.h"
#include "ICoreServiceHandler.h"

// SDK Configuration
const char* SDK_KEY = "your-sdk-key";
const char* SDK_SECRET = "your-sdk-secret";
const char* ACCESS_TOKEN = "your-access-token";
const char* USER_ID = "user-id";

// Game Configuration - 这些值应该从游戏列表 API 获取
// APPLET_ID: 游戏列表 API 返回的 "id" 字段
// LAUNCH_KEY: 游戏列表 API 返回的 "launchKey" 字段
const char* APPLET_ID = "691acb162dcfadc65a0fdb77";
const char* LAUNCH_KEY = "691acb162dcfadc65a0fdb77";

// Global state
static volatile bool g_launchCompleted = false;
static volatile int g_launchResultCode = -1;
static volatile bool g_shouldExit = false;

// Event handler implementation
class MyServiceHandler : public ICoreServiceHandler {
public:
    virtual INT QueryInterface(const char* type, void** ppvObject) override {
        return 0;
    }
    
    virtual ULONG AddRef(void) override { return 1; }
    virtual ULONG Release(void) override { return 1; }
    
    virtual void OnContextInitialized() override {
        std::cout << "Context initialized" << std::endl;
    }
    
    virtual void OnServiceDisconnected() override {
        std::cout << "Service disconnected" << std::endl;
        g_shouldExit = true;
    }
    
    virtual bool OnCommonEventHappened(const char* event_name, int32_t callback_id,
                                       const char* data, const unsigned int data_size) override {
        std::cout << "Event: " << event_name << std::endl;
        
        if (event_name && strcmp(event_name, "game_exited") == 0) {
            std::cout << "Game exited" << std::endl;
            g_shouldExit = true;
        }
        
        return true;
    }
};

// Launch callback
void OnLaunchComplete(const char* appId, int resultCode, const char* errorDesc) {
    std::cout << "Launch finished! Result: " << resultCode << std::endl;
    if (errorDesc && strlen(errorDesc) > 0) {
        std::cout << "Error: " << errorDesc << std::endl;
    }
    
    g_launchCompleted = true;
    g_launchResultCode = resultCode;
    
    if (resultCode != 0) {
        g_shouldExit = true;
    }
}

int main() {
    // 1. Load library
#ifdef _WIN32
    HMODULE hDll = LoadLibraryA("host\\webglhost_export.dll");
    if (!hDll) {
        std::cerr << "Failed to load DLL: " << GetLastError() << std::endl;
        return 1;
    }
#else
    void* hDll = dlopen("host/libwebglhost_export.dylib", RTLD_LAZY);
    if (!hDll) {
        std::cerr << "Failed to load dylib: " << dlerror() << std::endl;
        return 1;
    }
#endif
    
    // 2. Get service factory
    typedef IBrowsingService* (*GetBrowsingServiceFunc)();
#ifdef _WIN32
    GetBrowsingServiceFunc getBrowsingService =
        (GetBrowsingServiceFunc)GetProcAddress(hDll, "GetBrowsingService");
    if (!getBrowsingService) {
        std::cerr << "Failed to get GetBrowsingService" << std::endl;
        FreeLibrary(hDll);
        return 1;
    }
#else
    GetBrowsingServiceFunc getBrowsingService =
        (GetBrowsingServiceFunc)dlsym(hDll, "GetBrowsingService");
    if (!getBrowsingService) {
        std::cerr << "Failed to get GetBrowsingService: " << dlerror() << std::endl;
        dlclose(hDll);
        return 1;
    }
#endif
    
    // 3. Create service
    IBrowsingService* service = getBrowsingService();
    if (!service) {
        std::cerr << "Failed to create service" << std::endl;
#ifdef _WIN32
        FreeLibrary(hDll);
#else
        dlclose(hDll);
#endif
        return 1;
    }
    
    // 4. Initialize service
    char config[1024];
    snprintf(config, sizeof(config), R"({
        "sdkKey": "%s",
        "sdkSecret": "%s",
        "accessToken": "%s",
        "debug": true,
        "logLevel": "debug"
    })", SDK_KEY, SDK_SECRET, ACCESS_TOKEN);
    
    MyServiceHandler handler;
    int result = service->InitializeBrowsingCore(
        config,
#ifdef _WIN32
        "runtime\\webglhost-runtime.exe",
#else
        // macOS: 需要指向 .app bundle 内的可执行文件
        "runtime/webglhost-runtime.app/Contents/MacOS/webglhost-runtime",
#endif
        &handler
    );

    if (result != 0) {
        std::cerr << "Initialization failed: " << result << std::endl;
        service->Release();
#ifdef _WIN32
        FreeLibrary(hDll);
#else
        dlclose(hDll);
#endif
        return 1;
    }
    
    // 5. Get AppletManager
    IAppletManagerV3* appletManager = nullptr;
    result = service->QueryInterface("IAppletManagerV3", (void**)&appletManager);
    
    if (result != 0 || !appletManager) {
        std::cerr << "Failed to get AppletManager" << std::endl;
        service->UninitializeBrowsingCore();
        service->Release();
        FreeLibrary(hDll);
        return 1;
    }
    
    // 6. Launch applet
    char launchConfig[2048];
    snprintf(launchConfig, sizeof(launchConfig), R"({
        "launchKey": "%s",
        "accessToken": "%s",
        "userId": "%s",
        "debug": true,
        "mute": false,
        "transparent": true
    })", LAUNCH_KEY, ACCESS_TOKEN, USER_ID);
    
    appletManager->LaunchApplet(
        APPLET_ID, 
        launchConfig, 
        strlen(launchConfig),
        OnLaunchComplete
    );
    
    // 7. Wait for launch
    while (!g_launchCompleted && !g_shouldExit) {
#ifdef _WIN32
        Sleep(100);
#else
        usleep(100000);  // 100ms
#endif
    }
    
    if (g_launchResultCode != 0) {
        std::cerr << "Launch failed" << std::endl;
        goto cleanup;
    }
    
    std::cout << "Game launched successfully!" << std::endl;
    
    // 8. Wait for game to run
    while (!g_shouldExit) {
#ifdef _WIN32
        Sleep(100);
#else
        usleep(100000);  // 100ms
#endif
    }
    
cleanup:
    // 9. Cleanup
    if (g_launchCompleted && g_launchResultCode == 0) {
        appletManager->CloseApplet(APPLET_ID);
    }
    
    if (appletManager) {
        appletManager->Release();
    }
    
    if (service) {
        service->UninitializeBrowsingCore();
        service->Release();
    }
    
    if (hDll) {
#ifdef _WIN32
        FreeLibrary(hDll);
#else
        dlclose(hDll);
#endif
    }
    
    return 0;
}
```

---

## 错误处理

### 错误码定义

```cpp
#define WMPF_ERRCODE_SUCCESS           0   // 成功
#define WMPF_ERRCODE_FAIL             -1   // 失败
#define WMPF_ERRCODE_INVALID_PARAM    -2   // 参数无效
#define WMPF_ERRCODE_NOT_INITIALIZED  -3   // 未初始化
#define WMPF_ERRCODE_ALREADY_INITIALIZED -4 // 已经初始化
```

### 常见错误处理

#### DLL 加载失败

```cpp
HMODULE hDll = LoadLibraryA("host\\webglhost_export.dll");
if (!hDll) {
    DWORD error = GetLastError();
    std::cerr << "Failed to load DLL, error code: " << error << std::endl;
    
    // Common causes:
    // - DLL not found (error 126)
    // - Missing dependencies (error 126)
    // - Architecture mismatch (error 193)
    
    return 1;
}
```

#### 初始化失败

```cpp
int result = service->InitializeBrowsingCore(config, runtimePath, &handler);
if (result != 0) {
    switch (result) {
        case WMPF_ERRCODE_INVALID_PARAM:
            std::cerr << "Invalid parameters" << std::endl;
            break;
        case WMPF_ERRCODE_ALREADY_INITIALIZED:
            std::cerr << "Already initialized" << std::endl;
            break;
        default:
            std::cerr << "Initialization failed: " << result << std::endl;
            break;
    }
}
```

#### 启动失败

```cpp
void OnLaunchComplete(const char* appId, int resultCode, const char* errorDesc) {
    if (resultCode != 0) {
        std::cerr << "Launch failed with code: " << resultCode << std::endl;
        if (errorDesc && strlen(errorDesc) > 0) {
            std::cerr << "Error description: " << errorDesc << std::endl;
        }
        
        // Common causes:
        // - Invalid credentials
        // - Network error
        // - Invalid app ID
        // - Runtime not available
    }
}
```

---

## 最佳实践

### 1. 资源管理

**始终按正确顺序清理资源**：

```cpp
// Correct cleanup order:
// 1. Close applet
appletManager->CloseApplet(APPLET_ID);

// 2. Release AppletManager
appletManager->Release();

// 3. Uninitialize service
service->UninitializeBrowsingCore();

// 4. Release service
service->Release();

// 5. Unload library
#ifdef _WIN32
FreeLibrary(hDll);
#else
dlclose(hDll);
#endif
```

### 2. 异步操作

**使用回调处理异步操作**：

```cpp
// Don't block the main thread waiting for launch
appletManager->LaunchApplet(APPLET_ID, config, configLen, OnLaunchComplete);

// Use event loop or message pump
while (!g_launchCompleted) {
    // Process messages or events
    Sleep(100);
}
```

### 3. 错误日志

**记录详细的错误信息**：

```cpp
class MyHandler : public ICoreServiceHandler {
    virtual bool OnCommonEventHappened(const char* event_name, int32_t callback_id,
                                       const char* data, const unsigned int data_size) override {
        // Log all events for debugging
        std::cout << "[Event] " << event_name 
                  << " (callback_id: " << callback_id << ")" << std::endl;
        
        if (data && data_size > 0) {
            std::cout << "[Data] " << std::string(data, data_size) << std::endl;
        }
        
        return true;
    }
};
```

### 4. 线程安全

**注意回调可能在不同线程中执行**：

```cpp
// Use thread-safe mechanisms
#include <atomic>

static std::atomic<bool> g_launchCompleted{false};
static std::atomic<bool> g_shouldExit{false};

void OnLaunchComplete(const char* appId, int resultCode, const char* errorDesc) {
    // This may be called from a different thread
    g_launchCompleted.store(true);
}
```

### 5. 配置管理

**使用配置文件而不是硬编码**：

```cpp
// Read from config file
#include <fstream>
#include <nlohmann/json.hpp>

std::ifstream configFile("config.json");
nlohmann::json config;
configFile >> config;

const char* sdkKey = config["sdkKey"].get<std::string>().c_str();
const char* sdkSecret = config["sdkSecret"].get<std::string>().c_str();
```

### 6. 超时处理

**为异步操作设置超时**：

```cpp
const int LAUNCH_TIMEOUT_MS = 30000; // 30 seconds
int elapsed = 0;

while (!g_launchCompleted && elapsed < LAUNCH_TIMEOUT_MS) {
#ifdef _WIN32
    Sleep(100);
#else
    usleep(100000);  // 100ms
#endif
    elapsed += 100;
}

if (!g_launchCompleted) {
    std::cerr << "Launch timeout!" << std::endl;
    // Handle timeout
}
```

---

## 技术支持

如有问题或需要技术支持，请联系：

- **邮箱**: support@example.com
- **文档**: 查看 `README.md` 和 `scripts/USAGE.md`
- **日志**: 检查 `logs/` 目录中的运行日志

---

## 附录

### A. 接口继承关系

```
WIUnknown (基础接口)
    ├── IBrowsingService (浏览服务)
    ├── IAppletManagerV3 (小程序管理)
    └── ICoreServiceHandler (事件处理)
```

### B. 典型调用流程

**Windows:**
```
1. LoadLibrary("host\\webglhost_export.dll")
2. GetProcAddress("GetBrowsingService")
3. service = GetBrowsingService()
4. service->InitializeBrowsingCore(config, "runtime\\webglhost-runtime.exe", handler)
5. service->QueryInterface("IAppletManagerV3", &appletManager)
6. appletManager->LaunchApplet(appId, config, len, callback)  // appId 来源于游戏列表 API
7. [Wait for launch callback]
8. [Game runs, handle events via ICoreServiceHandler]
9. appletManager->CloseApplet(appId)  // 使用相同的 appId
10. appletManager->Release()
11. service->UninitializeBrowsingCore()
12. service->Release()
13. FreeLibrary(hDll)
```

**macOS:**
```
1. dlopen("host/libwebglhost_export.dylib", RTLD_LAZY)
2. dlsym(hDll, "GetBrowsingService")
3. service = GetBrowsingService()
4. service->InitializeBrowsingCore(config, "runtime/webglhost-runtime.app/Contents/MacOS/webglhost-runtime", handler)
5. service->QueryInterface("IAppletManagerV3", &appletManager)
6. appletManager->LaunchApplet(appId, config, len, callback)  // appId 来源于游戏列表 API
7. [Wait for launch callback]
8. [Game runs, handle events via ICoreServiceHandler]
9. appletManager->CloseApplet(appId)  // 使用相同的 appId
10. appletManager->Release()
11. service->UninitializeBrowsingCore()
12. service->Release()
13. dlclose(hDll)
```

### C. JSON 配置示例

#### 初始化配置

```json
{
    "sdkKey": "your-sdk-key",
    "sdkSecret": "your-sdk-secret",
    "accessToken": "your-access-token",
    "debug": true,
    "logLevel": "debug"
}
```

#### 启动配置

```json
{
    "launchKey": "https://your-server.com/api/game/start_session?gameId=your-app-id",
    "accessToken": "your-access-token",
    "userId": "your-user-id",
    "debug": true,
    "mute": false,
    "transparent": true,
    "GAME_HOST_BASE_URL": "https://your-server.com",
    "API_VERSION": "v1",
    "APP_VERSION": "1.0.0"
}
```

---

**版本**: 1.1.0  
**最后更新**: 2026-01-26

