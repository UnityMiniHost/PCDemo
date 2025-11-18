PC SDK 快速集成
此部分内容建议参考 Demo 项目源码阅读

## 1. 获取凭据
集成 SDK 需要先在 小游戏宿主控制台 中创建应用，获得每个应用专属的 APP KEY、APP SECRET 及 Service Token。启动 SDK 时，需要通过 APP KEY、APP SECRET 初始化。接入方也可联系 Unity 以创建 App Service Token / App Key / App Secret。

如下是测试用 App Service Token / App Key / App Secret 示例

```
App Service Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6IjY3YjZlZGEzNmZmY2RhMjU1OWVjZDM4OCIsImlkIjoiMTBhNGI1MzEtMWUxYy00ZWFlLWE2NWQtM2E3MWQ5OWYzYTRjIn0._24T3k-lVx2GQwAKg-RYhxD89EqSQP3Y10nzbd-JxHk
App Key: AKIDt1vMSYVFf1twI53iDecobx6QsTK0
App Secret: ufzN1iD8PsnMW0ViDCMhpJFBiLR1E1Xf
```

Service Token 的主要作用是调用以下 API 获取游戏列表，并可从中获取 Game ID 以启动游戏。

```
https://minihost.tuanjie.cn/api/game/get_list
```

实际生产环境中，Service Token 应该在服务端使用，从服务端调用上面的 API。Demo 项目中，Service Token 是在客户端使用，这个仅仅是一个示例，不建议在生产环境中这样使用。

## 2. 导入 SDK
SDK 支持 Windows 10+ / macOS 10.15+ / Linux (Ubuntu 18.04+)。

将 `webglhost-sdk-1.0.0.tgz` 和 `webglhost-runtime-pc-1.0.0.tgz` 添加到项目中。

安装依赖：

```bash
npm install ./webglhost-sdk-1.0.0.tgz ./webglhost-runtime-pc-1.0.0.tgz
```

或在 `package.json` 中添加：

```json
{
  "dependencies": {
    "@webglhost/sdk": "file:./webglhost-sdk-1.0.0.tgz",
    "webglhost-runtime-pc": "file:./webglhost-runtime-pc-1.0.0.tgz",
    "electron": "^36.0.0"
  }
}
```

导入模块：

```javascript
const { TJHostHandle, RuntimeGameHandle, TJConstants } = require('webglhost-runtime-pc');
```

## 3. 启动单实例游戏

### 3.1 初始化 SDK

初始化 Host SDK 内 TJHostHandle，后续游戏控制相关 API 依赖此实例，可通过检查 TJHostHandle.initialize 回调参数是否为空判断是否初始化成功。

```javascript
async function initTJHostHandle() {
  return new Promise((resolve, reject) => {
    // AKIDcv9N9wkDXKZ7gDoB2avKlu0N8tnS is a test [Demo App Key]
    // sp9ZsGlNLmTSX9o0sa29C5FwmxemUV8A is a test [Demo App Secret]
    TJHostHandle.initialize(
      'AKIDcv9N9wkDXKZ7gDoB2avKlu0N8tnS',
      'sp9ZsGlNLmTSX9o0sa29C5FwmxemUV8A',
      (hostHandle, error) => {
        if (error) {
          reject(error);
          return;
        }
        
        if (!hostHandle) {
          reject(new Error('Failed to create TJHostHandle'));
          return;
        }
        
        // Initialize completed hostHandle
        resolve(hostHandle);
      }
    );
  });
}
```

### 3.2 创建游戏实例

使用 TJHostHandle 初始化后的实例创建 RuntimeGameHandle，RuntimeGameHandle 作用于整个小游戏生命周期。

```javascript
async function createGameHandle(hostHandle) {
  const gameHandle = await hostHandle.createGameHandle();
  
  // Setup event listeners
  gameHandle.setOnTJCloseListener(() => {
    console.log('Game close button clicked');
  });
  
  return gameHandle;
}
```

### 3.3 设置游戏启动参数

此处 Host SDK 将根据请求 Host Server 并根据 LAUNCH KEY 获取游戏包下载 URL 及游戏类型，全部参数列表参考 API Reference，成功后可加载游戏资源。

```javascript
async function setGameStartOptions(gameHandle, launchKey) {
  const options = {};
  options[TJConstants.LAUNCH_KEY] = launchKey;
  options[TJConstants.USER_ID] = 'guest';
  
  await gameHandle.setGameStartOptions(options);
}
```

### 3.4 启动游戏

成功后游戏窗口会被创建，游戏资源被下载并启动。

```javascript
async function startGame(gameHandle) {
  await gameHandle.start();
  console.log('Game started successfully');
}
```

### 3.5 播放游戏

```javascript
async function playGame(gameHandle) {
  await gameHandle.play();  // Start game playback
}
```

### 3.6 关闭游戏

添加关闭游戏监听回调，处理关闭游戏逻辑

```javascript
gameHandle.setOnTJCloseListener(() => {
  // Stop the game
  gameHandle.stop();
});
```

### 3.7 完整示例

```javascript
const { TJHostHandle, TJConstants } = require('webglhost-runtime-pc');

async function main() {
  try {
    // 1. Initialize SDK
    const hostHandle = await new Promise((resolve, reject) => {
      TJHostHandle.initialize(
        'YOUR_APP_KEY',
        'YOUR_APP_SECRET',
        (handle, error) => {
          if (error) reject(error);
          else resolve(handle);
        }
      );
    });
    
    // 2. Create game handle
    const gameHandle = await hostHandle.createGameHandle();
    
    // 3. Setup event listeners
    gameHandle.setOnTJCloseListener(() => {
      gameHandle.stop();
    });
    
    // 4. Set game start options
    const options = {};
    options[TJConstants.LAUNCH_KEY] = 'YOUR_GAME_LAUNCH_KEY';
    options[TJConstants.USER_ID] = 'guest';
    await gameHandle.setGameStartOptions(options);
    
    // 5. Start and play game
    await gameHandle.start();
    await gameHandle.play();
    
    console.log('Game launched successfully');
  } catch (error) {
    console.error('Failed to launch game:', error);
  }
}

main();
```

## 4. 多实例管理游戏

宿主提供了 MultiGameLauncher 管理多个游戏实例，当实例达到上限后会依据时间自动停止实例后作为新实例启用。

### 4.1 初始化多实例上限

```javascript
const { MultiGameLauncher } = require('webglhost-runtime-pc');

MultiGameLauncher.configMaxGame(3); // Default uninitialized count: 1
```

### 4.2 创建宿主

多实例创建宿主需要通过 gameId 来进行绑定，当实例已经创建过宿主则会复用原宿主。

```javascript
async function createMultiGameHandle(hostHandle, gameId) {
  return new Promise((resolve, reject) => {
    // createGameHandle binds to the instance via gameId
    MultiGameLauncher.createGameHandle(
      hostHandle,
      gameId,
      {},
      (gameHandle, error) => {
        if (error) {
          reject(error);
          return;
        }
        
        resolve(gameHandle);
      }
    );
  });
}
```

### 4.3 设置游戏启动参数

此处 Host SDK 将根据请求 Host Server 并根据 LAUNCH KEY 获取游戏包下载 URL 及游戏类型，全部参数列表参考 API Reference，成功后可加载游戏资源。

```javascript
async function setGameStartOptions(gameHandle, launchKey) {
  const options = {};
  options[TJConstants.LAUNCH_KEY] = launchKey;
  options[TJConstants.USER_ID] = 'guest';
  
  await gameHandle.setGameStartOptions(options);
}
```

### 4.4 加载游戏资源

成功后游戏界面会被创建，并下载游戏资源。

```javascript
await gameHandle.start();
```

### 4.5 启动游戏

```javascript
await gameHandle.play();  // Start game
```

### 4.6 暂停游戏

添加关闭游戏监听回调，处理暂停游戏逻辑

```javascript
gameHandle.setOnTJCloseListener(async () => {
  // Pause game, can continue when reopened
  await MultiGameLauncher.pause(gameId);
});

// Or pause directly
await MultiGameLauncher.pause(gameId);
await MultiGameLauncher.pauseAll();
```

### 4.7 恢复游戏

当游戏需要被恢复时，调用 resume 方法

```javascript
const { EnterOption } = require('@webglhost/sdk');

// Set hot start entry parameters
const enterOption = new EnterOption();
enterOption.scene = 1002;
enterOption.shareTicket = '1002';

await MultiGameLauncher.resume(gameId, enterOption);
```

### 4.8 停止游戏

当游戏需要被停止或需要释放页面时需调用 `MultiGameLauncher.stop(gameId)` 以释放所有关联信息

```javascript
await MultiGameLauncher.stop(gameId);
await MultiGameLauncher.stopAll();
```

### 4.9 销毁实例

当实例需要被释放时需调用 `MultiGameLauncher.destroy(gameId)` 释放实例相关的内容，销毁实例会停止游戏并释放该实例

```javascript
await MultiGameLauncher.destroy(gameId);
await MultiGameLauncher.destroyAll();
```

### 4.10 完整示例

```javascript
const { 
  TJHostHandle, 
  MultiGameLauncher, 
  TJConstants 
} = require('webglhost-runtime-pc');
const { EnterOption } = require('@webglhost/sdk');

async function launchMultipleGames() {
  try {
    // 1. Initialize SDK
    const hostHandle = await new Promise((resolve, reject) => {
      TJHostHandle.initialize(
        'YOUR_APP_KEY',
        'YOUR_APP_SECRET',
        (handle, error) => {
          if (error) reject(error);
          else resolve(handle);
        }
      );
    });
    
    // 2. Configure max instances
    MultiGameLauncher.configMaxGame(3);
    
    // 3. Launch first game
    const gameId1 = 'game1';
    const gameHandle1 = await new Promise((resolve, reject) => {
      MultiGameLauncher.createGameHandle(
        hostHandle,
        gameId1,
        {},
        (handle, error) => {
          if (error) reject(error);
          else resolve(handle);
        }
      );
    });
    
    const options1 = {};
    options1[TJConstants.LAUNCH_KEY] = 'GAME1_LAUNCH_KEY';
    options1[TJConstants.USER_ID] = 'guest';
    await gameHandle1.setGameStartOptions(options1);
    
    await gameHandle1.start();
    await gameHandle1.play();
    
    // 4. Launch second game
    const gameId2 = 'game2';
    const gameHandle2 = await new Promise((resolve, reject) => {
      MultiGameLauncher.createGameHandle(
        hostHandle,
        gameId2,
        {},
        (handle, error) => {
          if (error) reject(error);
          else resolve(handle);
        }
      );
    });
    
    const options2 = {};
    options2[TJConstants.LAUNCH_KEY] = 'GAME2_LAUNCH_KEY';
    options2[TJConstants.USER_ID] = 'guest';
    await gameHandle2.setGameStartOptions(options2);
    
    await gameHandle2.start();
    await gameHandle2.play();
    
    // 5. Pause first game
    await MultiGameLauncher.pause(gameId1);
    
    // 6. Resume first game with enter option
    const enterOption = new EnterOption();
    enterOption.scene = 1002;
    await MultiGameLauncher.resume(gameId1, enterOption);
    
    console.log('Multiple games launched successfully');
  } catch (error) {
    console.error('Failed to launch games:', error);
  }
}

launchMultipleGames();
```

## 5. 事件监听

### 5.1 基础事件

```javascript
// Game menu button clicked
gameHandle.setOnTJMenuListener(() => {
  console.log('Menu clicked');
});

// Game close button clicked
gameHandle.setOnTJCloseListener(() => {
  console.log('Close clicked');
  gameHandle.stop();
});

// First frame rendered
gameHandle.setOnFirstFrameRenderedListener(() => {
  console.log('First frame rendered');
});

// Game crashed
gameHandle.setOnHostFailureListener((error) => {
  console.error('Game crashed:', error);
});
```

### 5.2 自定义命令

```javascript
// Set custom command listener
gameHandle.setCustomCommandListener('customCommand', (request, handle) => {
  console.log('Custom command received:', request);
  handle.success({ result: 'success' });
});

// Run custom script in game
await gameHandle.runCustomScript(`
  console.log('Hello from game!');
  tj.customCommand({
    command: 'customCommand',
    data: { message: 'Hello from game!' }
  });
`);
```

## 6. 音频控制

```javascript
// Mute all audio
gameHandle.muteAllAudio();

// Unmute all audio
gameHandle.unmuteAllAudio();

// Toggle audio mute
gameHandle.toggleAudioMute();

// Check if muted
const isMuted = gameHandle.isMuted();
```

## 7. 调试功能

```javascript
// Open debug menu
gameHandle.showDebugMenu();

// Toggle debug mode
gameHandle.toggleDebugMode();

// Get debug mode status
const debugEnabled = gameHandle.getDebugModeStatus();

// Force garbage collection
gameHandle.invokeForceGC();

// Export logs
gameHandle.exportLogManagerLog();
```

## 8. API 参考

### TJConstants

游戏启动参数常量：

```javascript
const TJConstants = {
  LAUNCH_KEY: 'launchKey',                     // Game launch key (required)
  GAME_ID: 'gameId',                           // Game ID (required)
  USER_ID: 'userId',                           // User ID
  ACCESS_TOKEN: 'accessToken',                 // Access token
  ENABLE_VCONSOLE: 'enableVConsole',           // Enable vConsole
  ENABLE_INSPECTOR: 'enableInspector',         // Enable inspector
  ENABLE_MUTE_ALL_AUDIO: 'enableMuteAllAudio', // Mute all audio
  ENABLE_TRANSPARENT_MODE: 'enableTransparentMode',  // Transparent mode
  INSPECTOR_WAIT_FOR_INSPECT: 'waitForInspect',  // Wait for inspect
};
```

### TJHostHandle

#### Static Methods

- `initialize(sdkKey, sdkSecret, completion)` - Initialize SDK
- `setRuntimeEnv(env)` - Set runtime environment
- `getVersionName()` - Get version name
- `getVersionCode()` - Get version code
- `getCommitId()` - Get commit ID

#### Instance Methods

- `createGameHandle(options)` - Create game handle
- `initLog(logLevel, logger)` - Initialize logging
- `setRecentlyGameListener(listener)` - Set recently played game listener
- `getUserHistory(userId)` - Get user history

### RuntimeGameHandle

#### Lifecycle Methods

- `setGameStartOptions(options)` - Set game start options
- `start()` - Start game (download and initialize)
- `play()` - Play game
- `pause()` - Pause game
- `stop()` - Stop game
- `restart()` - Restart game

#### Event Listeners

- `setOnTJMenuListener(callback)` - Menu button clicked
- `setOnTJCloseListener(callback)` - Close button clicked
- `setOnFirstFrameRenderedListener(callback)` - First frame rendered
- `setOnHostFailureListener(callback)` - Game crashed
- `setCustomCommandListener(command, callback)` - Custom command

#### Audio Control

- `muteAllAudio()` - Mute all audio
- `unmuteAllAudio()` - Unmute all audio
- `toggleAudioMute()` - Toggle audio mute
- `isMuted()` - Check if muted

#### Debug Methods

- `showDebugMenu()` - Show debug menu
- `toggleDebugMode()` - Toggle debug mode
- `getDebugModeStatus()` - Get debug mode status
- `invokeForceGC()` - Force garbage collection
- `exportLogManagerLog()` - Export logs

### MultiGameLauncher

#### Static Methods

- `configMaxGame(max)` - Configure max instances
- `createGameHandle(hostHandle, gameId, options, completion)` - Create game handle
- `stopAll()` - Stop all instances
- `stop(gameId)` - Stop specified instance
- `pauseAll()` - Pause all instances
- `pause(gameId)` - Pause specified instance
- `resume(gameId, enterOption)` - Resume specified instance
- `destroyAll()` - Destroy all instances
- `destroy(gameId)` - Destroy specified instance

#### Query Methods

- `getGameHandle(gameId)` - Get game handle
- `getAllTasks()` - Get all tasks
- `getActiveGameCount()` - Get active game count
- `isMaxReached()` - Check if max reached

## 9. 错误处理

```javascript
const { HostRuntimeError } = require('webglhost-runtime-pc');

try {
  const hostHandle = await TJHostHandle.initialize('invalid-key', 'invalid-secret');
} catch (error) {
  if (error instanceof HostRuntimeError) {
    switch (error.code) {
      case 'SDK_INITIALIZATION_FAILED':
        console.log('SDK initialization failed');
        break;
      case 'GAME_ID_NOT_SET':
        console.log('Game ID not set');
        break;
      case 'LAUNCH_KEY_NOT_SET':
        console.log('Launch key not set');
        break;
      default:
        console.log('Unknown error:', error.message);
    }
  }
}
```

## 10. 系统要求

- **Node.js**: >= 20.0.0
- **Electron**: >= 32.0.0
- **Operating Systems**:
  - Windows 10+ (x64)
  - macOS 10.15+ (x64, arm64)

## 11. 注意事项

1. **Electron 环境**: SDK 必须在 Electron 环境中运行
2. **单例模式**: TJHostHandle 建议使用单例模式，避免重复初始化
3. **资源清理**: 游戏关闭时务必调用 `stop()` 或 `destroy()` 方法释放资源
4. **事件监听**: 建议在 `setGameStartOptions()` 之后、`start()` 之前设置事件监听器
5. **多实例管理**: 使用 MultiGameLauncher 时注意配置合理的最大实例数，避免资源占用过高
6. **错误处理**: 所有异步操作都应添加适当的错误处理
7. **日志记录**: 生产环境建议启用日志记录功能，便于问题排查

## 12. 常见问题

### Q: 如何获取游戏列表？

A: 使用 Service Token 调用 API：

```javascript
const axios = require('axios');

async function getGameList(serviceToken) {
  const response = await axios.get(
    'https://minihost.tuanjie.cn/api/game/get_list',
    {
      headers: {
        'Authorization': `Bearer ${serviceToken}`
      }
    }
  );
  
  return response.data;
}
```

### Q: 如何切换游戏？

A: 在多实例模式下：

```javascript
// Pause current game
await MultiGameLauncher.pause(currentGameId);

// Resume another game
await MultiGameLauncher.resume(nextGameId);
```

### Q: 如何处理游戏崩溃？

A: 使用崩溃回调：

```javascript
gameHandle.setOnHostFailureListener((error) => {
  console.error('Game crashed:', error);
  
  // Restart game
  gameHandle.restart();
});
```

### Q: 如何在调试模式下运行？

A: 设置启动参数：

```javascript
const options = {};
options[TJConstants.LAUNCH_KEY] = launchKey;
options[TJConstants.ENABLE_VCONSOLE] = true;
options[TJConstants.ENABLE_INSPECTOR] = true;
options[TJConstants.INSPECTOR_WAIT_FOR_INSPECT] = true;
await gameHandle.setGameStartOptions(options);
```

## 13. Windows 平台构建

### 13.1 准备工作

确保已安装必要的依赖：

```bash
npm install
```

### 13.2 构建方式

#### 方式一：生产版本（推荐）

生产版本会对代码进行混淆处理，提高安全性：

```bash
npm run build:windows
```

该命令会执行以下步骤：
1. 代码混淆处理
2. 使用 electron-builder 构建 Windows 安装包（NSIS）
3. 创建优化的便携版本（zip）

构建产物位置：
- **安装包**: `dist/WebGLHost-Runtime-App-Setup-{version}.exe`
- **便携版**: `dist/WebGLHost-Runtime-App-{version}-win32-x64.zip`

#### 方式二：调试版本

调试版本不进行代码混淆，便于开发调试：

```bash
npm run build:windows-debug
```

### 13.3 构建配置

构建配置位于 `package.json` 的 `build` 字段：

```json
{
  "build": {
    "appId": "com.webglhost.runtime-app",
    "productName": "WebGLHostRuntimeApp",
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "requestedExecutionLevel": "asInvoker"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "WebGLHost Runtime App"
    }
  }
}
```

### 13.4 自定义构建

#### 仅构建安装包

```bash
npm run build:windows-setup
```

#### 仅创建便携版

```bash
npm run package:portable-optimized
```

#### 指定架构

默认为 x64，如需其他架构：

```bash
node scripts/build.js --platform win32 --arch ia32
```

### 13.5 构建输出说明

#### NSIS 安装包特性
- 非单击安装，用户可选择安装目录
- 自动创建桌面和开始菜单快捷方式
- 支持完整的卸载流程
- 安装时需要管理员权限（可选）

#### 便携版特性
- 无需安装，解压即用
- 包含完整运行时环境
- 体积经过优化处理
- 适合企业部署和 U 盘使用

### 13.6 构建要求

- **操作系统**: Windows 10+ 或 macOS/Linux（交叉编译）
- **Node.js**: >= 20.0.0
- **npm**: >= 8.0.0
- **Electron**: ^36.2.0


### 13.8 验证构建

构建完成后，可以验证产物：

```bash

# 手动测试安装包
# 1. 运行 dist/WebGLHost-Runtime-App-Setup-{version}.exe
# 2. 完成安装
# 3. 从开始菜单启动应用

# 手动测试便携版
# 1. 解压 dist/WebGLHost-Runtime-App-{version}-win32-x64.zip
# 2. 运行 WebGLHostRuntimeApp.exe
```

## 14. 更多信息

- **完整 Demo**: 参考 `Demo/webglhost-runtime-app` 项目

