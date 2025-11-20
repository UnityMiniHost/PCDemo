# PC SDK 快速集成

<!-- ## 1.2 SDK 快速集成  -->

此部分内容建议参考 Demo 项目源码阅读

## 1. 获取凭据

集成 SDK 需要先在 [小游戏宿主控制台](https://minihost.tuanjie.cn) 中创建应用，获得每个应用专属的 `APP KEY`， `APP SECRET` 及 `Service Token` 后。
启动 SDK 时，需要通过 `APP KEY`，`APP SECRET` 初始化。**接入方也可联系 Unity 以创建 `App Service Token` / `App Key` / `App Secret`。**

如下是测试用 App Service Token / App Key / App Secret 示例

- [**App Service Token**](/docs/platform-features/server-config#1-服务端令牌)
- **App Key**: `AKIDt1vMSYVFf1twI53iDecobx6QsTK0`
- **App Secret**: `ufzN1iD8PsnMW0ViDCMhpJFBiLR1E1Xf`

**Service Token** 的主要作用是调用以下 API 获取游戏列表，并可从中获取 **Game ID** 以启动游戏。

[使用令牌获取小游戏列表](/docs/sdk/server-integrate#使用令牌获取小游戏列表)

实际生产环境中，Service Token 应该在服务端使用，从服务端调用上面的 API 。Demo 项目中，Service Token 是在客户端使用，这个仅仅是一个示例，不建议在生产环境中这样使用。

## 2. 导入 SDK

- SDK 支持 Windows 10+ / macOS 10.15+
- 从官网下载`webglhost-sdk-x.x.x.tgz` 和 `webglhost-runtime-pc-x.x.x.tgz`, 可以更名为如下文件名并替换
- SDK目录包含固定名称的文件：`webglhost-sdk.tgz` 和 `webglhost-runtime-pc.tgz`
- 使用固定名称便于版本升级，无需修改代码

安装依赖：

```bash
npm install ./webglhost-sdk.tgz ./webglhost-runtime-pc.tgz
```

或在 `package.json` 中添加：

```json
{
  "dependencies": {
    "@webglhost/sdk": "file:./webglhost-sdk.tgz",
    "webglhost-runtime-pc": "file:./webglhost-runtime-pc.tgz",
    "electron": "^36.0.0"
  }
}
```

导入模块：

```javascript
const { TJHostHandle, RuntimeGameHandle, TJConstants } = require('webglhost-runtime-pc');
```

## 3. 初始化 SDK

初始化 Host SDK 内 TJHostHandle 后续游戏控制相关 API 依赖此实例，可通过检查 TJHostHandle.initialize 返回值是否为空判断是否初始化成功。

```javascript
function initTJHostHandle() {
    // AKIDcv9N9wkDXKZ7gDoB2avKlu0N8tnS is a test [Demo App Key]
    // sp9ZsGlNLmTSX9o0sa29C5FwmxemUV8A is a test [Demo App Secret]
    TJHostHandle.initialize('AKIDcv9N9wkDXKZ7gDoB2avKlu0N8tnS', 'sp9ZsGlNLmTSX9o0sa29C5FwmxemUV8A', (hostHandle, error) => {
        if (!hostHandle) {
            return;
        }

        // 初始化完成 hostHandle
    });
}
```

## 4. 启动单实例游戏

### 4.1 创建宿主

使用 TJHostHandle 初始化后的实例创建并初始化 RuntimeGameHandle，RuntimeGameHandle 作用于整个小游戏生命周期。

```javascript
async function initGameHandle() {
    const gameHandle = await hostHandle.createGameHandle();
    
    // 初始化完成 RuntimeGameHandle
    return gameHandle;
}
```

### 4.2 设置游戏启动参数

此处 Host SDK 将根据请求 Host Server 并根据 LAUNCH KEY 获取游戏包下载 URL 及游戏类型，全部参数列表参考 API Reference，成功后可加载游戏资源。

```javascript
async function setGameStartOptions() {
    const options = {};
    options[TJConstants.LAUNCH_KEY] = 'LAUNCH KEY';
    options[TJConstants.USER_ID] = 'guest';

    await gameHandle.setGameStartOptions(options);
    
    // 启动参数设置完成
}
```

### 4.3 加载游戏资源

成功后游戏窗口会被创建，游戏资源被下载并启动。

```javascript
await gameHandle.start();

// 游戏加载完成
```

### 4.4 启动游戏

```javascript
function showGame() {
    if (!gameHandle) {
        return;
    }

    gameHandle.play(); // 启动游戏
}
```

### 4.5 关闭游戏

添加关闭游戏监听回调，处理关闭游戏逻辑

```javascript
gameHandle.setOnTJCloseListener(() => {
    // 停止游戏
    gameHandle.stop();
});
```

## 5. 多实例管理游戏

宿主提供了 MultiGameLauncher 管理多个游戏实例，当实例达到上限后会依据时间自动停止实例后作为新实例启用。

### 5.1 初始化多实例上限

```javascript
const { MultiGameLauncher } = require('webglhost-runtime-pc');

MultiGameLauncher.configMaxGame(3); // 默认未初始化数量: 1
```

### 5.2 创建宿主

多实例创建宿主需要通过 gameId 来进行绑定，当实例已经创建过宿主则会复用原宿主。

```javascript
// createGameHandle 时通过 gameId 找到绑定的实例
const gameHandle = await MultiGameLauncher.createGameHandle(hostHandle, gameId, {});

// 初始化完成 RuntimeGameHandle
```

### 5.3 设置游戏启动参数

此处 Host SDK 将根据请求 Host Server 并根据 LAUNCH KEY 获取游戏包下载 URL 及游戏类型，全部参数列表参考 API Reference，成功后可加载游戏资源。

```javascript
async function setGameStartOptions() {
    const options = {};
    options[TJConstants.LAUNCH_KEY] = 'LAUNCH KEY';
    options[TJConstants.USER_ID] = 'guest';

    await gameHandle.setGameStartOptions(options);
    
    // 启动参数设置完成
}
```

### 5.4 加载游戏资源

成功后游戏窗口会被创建，并下载游戏资源。

```javascript
await gameHandle.start();

// 游戏加载完成
```

### 5.5 启动游戏

```javascript
function showGame() {
    if (!gameHandle) {
        return;
    }

    gameHandle.play(); // 启动游戏
}
```

### 5.6 暂停游戏

添加关闭游戏监听回调，处理暂停游戏逻辑

```javascript
MultiGameLauncher.pause(gameId);
MultiGameLauncher.pauseAll();
```

### 5.7 恢复游戏

当游戏需要被恢复时，调用 resume 方法

```javascript
const { MiniGameLaunchOption } = require('webglhost-runtime-pc');

// 设置热启动进入参数
const enterOption = new MiniGameLaunchOption({
  scene: 1002,
  shareTicket: '1002'
});

MultiGameLauncher.resume(gameId, enterOption);
```

```javascript
// 不带参数恢复
MultiGameLauncher.resume(gameId);
```

### 5.8 停止游戏

当游戏需要被停止或需要释放页面时需调用 MultiGameLauncher.stop(gameId) 以释放所有关联信息

```javascript
MultiGameLauncher.stop(gameId);
MultiGameLauncher.stopAll();
```

### 5.9 销毁实例

当实例需要被释放时需调用 MultiGameLauncher.destroy(gameId) 释放实例相关的内容，销毁实例会停止游戏并释放该实例

```javascript
MultiGameLauncher.destroy(gameId);
MultiGameLauncher.destroyAll();
```

## 6. 事件监听

### 6.1 基础事件

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

### 6.2 自定义命令

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

## 7. 音频控制

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

## 8. 调试功能

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

## 9. API 参考

### TJConstants

游戏启动参数常量：

```javascript
const TJConstants = {
  LAUNCH_KEY: 'launchKey',                     // Game launch key (required)
  GAME_ID: 'gameId',                           // Game ID
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

## 10. 错误处理

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

## 11. 系统要求

- **Node.js**: >= 20.0.0
- **Electron**: >= 32.0.0
- **Operating Systems**:
  - Windows 10+ (x64)
  - macOS 10.15+ (x64, arm64)

## 12. 注意事项

1. **Electron 环境**: SDK 必须在 Electron 环境中运行
2. **单例模式**: TJHostHandle 建议使用单例模式，避免重复初始化
3. **资源清理**: 游戏关闭时务必调用 `stop()` 或 `destroy()` 方法释放资源
4. **多实例管理**: 使用 MultiGameLauncher 时注意配置合理的最大实例数，避免资源占用过高
5. **错误处理**: 所有异步操作都应添加适当的错误处理
6. **日志记录**: 生产环境建议启用日志记录功能，便于问题排查

## 13. 更多信息

- **完整 Demo**: 参考 `Demo/webglhost-runtime-app` 项目

