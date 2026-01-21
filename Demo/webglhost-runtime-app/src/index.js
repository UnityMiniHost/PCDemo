/**
 * WebGLHost Runtime App - Main Entry Point
 * 
 * 主入口文件，提供编程接口和命令行启动功能
 * 支持 Electron 环境和 Node.js 环境
 */

// 检查是否在 Electron 环境中
const isElectron = (() => {
  try {
    require.resolve('electron');
    const { app } = require('electron');
    return !!app;
  } catch (error) {
    return false;
  }
})();

// AppId 设置 - 必须在 Electron 初始化早期执行
if (isElectron) {
  try {
    const { app } = require('electron');
    
    // Robust command line argument parser with multiple fallback methods
    function parseArgsRobust() {
      const options = {};
      const args = process.argv.slice(2);
      
      // Regex patterns for launch key detection
      const HEX_ID_PATTERN = /^[0-9a-f]{24}$/i;
      const URL_PATTERN = /^https?:\/\//i;
      
      // Extract gameId from URL
      function extractGameIdFromUrl(url) {
        try {
          const urlObj = new URL(url);
          const gameId = urlObj.searchParams.get('gameId');
          return gameId || url;
        } catch (error) {
          return url;
        }
      }
      
      // Parse command line arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];
        
        // Parse flag-value pairs
        if (arg === '--launch-key' && nextArg && !nextArg.startsWith('--')) {
          // If it's a URL, extract gameId from it
          options.launchKey = URL_PATTERN.test(nextArg) 
            ? extractGameIdFromUrl(nextArg) 
            : nextArg;
          i++; // Skip next arg as it's the value
        } else if (arg === '--access-token' && nextArg && !nextArg.startsWith('--')) {
          options.accessToken = nextArg;
          i++; // Skip next arg as it's the value
        }
      }
      
      // Fallback: detect orphaned launch-key value
      // When packaged, Electron may strip --launch-key flag but keep the value
      if (!options.launchKey) {
        for (const arg of args) {
          // Skip flags
          if (arg.startsWith('--')) continue;
          
          // Check if it's a 24-char hex string (MongoDB ObjectId) or URL
          if (HEX_ID_PATTERN.test(arg)) {
            options.launchKey = arg;
            break;
          } else if (URL_PATTERN.test(arg)) {
            options.launchKey = extractGameIdFromUrl(arg);
            break;
          }
        }
      }
      
      return options;
    }
    
    // 设置应用程序 ID
    function setupAppId() {
      const options = parseArgsRobust();
      let appId = 'WebGLHostRuntimeApp';

      if (options.launchKey) {
        const shortKey = options.launchKey.substring(0, 8);
        appId = `WebGLHostRuntimeApp.${shortKey}`;
        console.log(`Using launch-key based app ID: ${appId}`);
      } else {
        console.log('No launch-key found, using default app ID');
      }
      
      // 设置 Windows 任务栏分组 ID
      if (process.platform === 'win32') {
        app.setAppUserModelId(appId);
        console.log(`Windows App User Model ID set to: ${appId}`);
      }
      
      console.log(`Starting WebGLHostRuntimeApp with App ID: ${appId}`);
      
      return appId;
    }
    
    // 立即设置 AppId
    setupAppId();
  } catch (error) {
    console.warn('Failed to setup app ID:', error.message);
  }
}

// 全局应用实例引用，用于窗口关闭时的清理
let globalAppInstance = null;
// 全局运行中的游戏实例映射，用于跟踪已启动的游戏
let globalRunningGames = new Map(); // gameId -> { appInstance, gameHandle, timestamp }

// 暴露为全局变量，以便GameLauncher等模块可以访问
global.globalRunningGames = globalRunningGames;

// Global exception handlers to prevent process crash
// These handlers catch unhandled exceptions and rejections, log them, and prevent crash

/**
 * Get cross-platform crash log directory
 * - macOS: ~/Library/Logs/WebGLHostRuntimeApp
 * - Windows: %APPDATA%/WebGLHostRuntimeApp/logs
 * - Linux: ~/.config/WebGLHostRuntimeApp/logs
 */
function getCrashLogDir() {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  let logDir;
  if (process.platform === 'darwin') {
    // macOS
    logDir = path.join(os.homedir(), 'Library', 'Logs', 'WebGLHostRuntimeApp');
  } else if (process.platform === 'win32') {
    // Windows - use APPDATA
    logDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'WebGLHostRuntimeApp', 'logs');
  } else {
    // Linux and others
    logDir = path.join(os.homedir(), '.config', 'WebGLHostRuntimeApp', 'logs');
  }
  
  return logDir;
}

/**
 * Write crash log to file
 */
function writeCrashLogToFile(type, errorMsg, stack, extra = '') {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const logDir = getCrashLogDir();
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'crash.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type}: ${errorMsg}${extra}\nStack: ${stack}\n\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(`Crash log written to: ${logFile}`);
  } catch (logError) {
    console.error('Failed to write crash log:', logError);
  }
}

process.on('uncaughtException', (error, origin) => {
  console.error('[FATAL] Uncaught Exception:', error);
  console.error('Exception origin:', origin);
  console.error('Stack trace:', error.stack);
  
  // Write to crash log file (cross-platform)
  writeCrashLogToFile('Uncaught Exception', error.message, error.stack, `\nOrigin: ${origin}`);
  
  // Don't exit - allow the app to continue if possible
  // In production, you might want to show an error dialog and gracefully shutdown
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  if (reason instanceof Error) {
    console.error('Stack trace:', reason.stack);
  }
  
  // Write to crash log file (cross-platform)
  const errorMsg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : 'No stack trace';
  writeCrashLogToFile('Unhandled Rejection', errorMsg, stack);
  
  // Don't exit - allow the app to continue if possible
});

// 如果在 Electron 环境中，初始化 Electron
if (isElectron) {
  const { app, ipcMain } = require('electron');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // 跨进程游戏实例管理 - 使用文件系统锁机制
  const GAME_REGISTRY_DIR = path.join(os.tmpdir(), 'webglhost-games');
  const GAME_REGISTRY_FILE = path.join(GAME_REGISTRY_DIR, 'running-games.json');

  // 确保注册表目录存在
  if (!fs.existsSync(GAME_REGISTRY_DIR)) {
    fs.mkdirSync(GAME_REGISTRY_DIR, { recursive: true });
  }

  /**
   * 获取当前运行的游戏注册表
   */
  function getGameRegistry() {
    try {
      if (fs.existsSync(GAME_REGISTRY_FILE)) {
        const data = fs.readFileSync(GAME_REGISTRY_FILE, 'utf8');
        const registry = JSON.parse(data);
        
        // 清理过期的注册记录（进程已不存在或无效）
        const cleanedRegistry = {};
        for (const [gameId, info] of Object.entries(registry)) {
          if (isProcessValid(info)) {
            cleanedRegistry[gameId] = info;
          } else {
            // 进程不存在或无效，删除记录
            console.log(`Cleaning up stale game record for "${gameId}" (PID: ${info.pid})`);
          }
        }
        
        // 如果有清理，更新文件
        if (Object.keys(cleanedRegistry).length !== Object.keys(registry).length) {
          fs.writeFileSync(GAME_REGISTRY_FILE, JSON.stringify(cleanedRegistry, null, 2));
        }
        
        return cleanedRegistry;
      }
    } catch (error) {
      console.warn('Error reading game registry:', error.message);
    }
    return {};
  }

  /**
   * 获取当前进程名称
   */
  function getCurrentProcessName() {
    try {
      const path = require('path');
      if (process.platform === 'win32') {
        // Windows: 从execPath获取进程名
        return path.basename(process.execPath).toLowerCase();
      } else {
        // Mac/Linux: 从execPath获取进程名
        return path.basename(process.execPath);
      }
    } catch (error) {
      console.warn('Error getting current process name:', error);
      return null;
    }
  }

  /**
   * 获取指定PID的进程名称
   */
  function getProcessName(pid) {
    try {
      const { execSync } = require('child_process');
      const path = require('path');
      let processName = null;
      
      if (process.platform === 'win32') {
        // Windows: 使用tasklist命令
        try {
          const command = `tasklist /fi "PID eq ${pid}" /fo csv /nh`;
          const output = execSync(command, { encoding: 'utf8', timeout: 2000 });
          const lines = output.trim().split('\n');
          if (lines.length > 0 && lines[0] !== 'INFO: No tasks are running which match the specified criteria.') {
            // CSV格式: "进程名","PID","会话名","会话#","内存使用"
            const csvLine = lines[0].replace(/"/g, '');
            const parts = csvLine.split(',');
            if (parts.length > 0) {
              processName = parts[0];
            }
          }
        } catch (winError) {
          // Windows命令失败，进程可能不存在
          return null;
        }
      } else {
        // Mac/Linux: 首先检查进程是否存在
        try {
          // 先用最简单的方式检查进程是否存在（不输出任何内容）
          execSync(`ps -p ${pid} > /dev/null 2>&1`, { timeout: 1000 });
        } catch (checkError) {
          // 进程不存在
          return null;
        }
        
        // Get process name from command line
        try {
          // Use 'args' field to get full command line (works for all launch methods)
          const argsCommand = `ps -p ${pid} -o args= 2>/dev/null`;
          const fullCommand = execSync(argsCommand, { encoding: 'utf8', timeout: 2000 });
          const cmdLine = fullCommand.trim().split('\n')[0];
          
          if (!cmdLine) {
            throw new Error('Empty command line');
          }

          let executablePath = null;
          
          // Handle quoted paths: "/path with spaces/app" args...
          if (cmdLine.startsWith('"')) {
            const endQuote = cmdLine.indexOf('"', 1);
            if (endQuote > 0) {
              executablePath = cmdLine.substring(1, endQuote);
            }
          } 
          // Handle unquoted paths
          else {
            // For macOS .app bundles: /path/to/App.app/Contents/MacOS/ExecutableName
            // Note: .+ allows spaces in path (e.g., "Application Support")
            const appBundleMatch = cmdLine.match(/^(.+\.app\/Contents\/MacOS\/[^\s]+)/);
            if (appBundleMatch) {
              executablePath = appBundleMatch[1];
            } else {
              // Fallback: extract first token (e.g., "node" from "node script.js")
              const spaceIndex = cmdLine.indexOf(' ');
              executablePath = spaceIndex > 0 ? cmdLine.substring(0, spaceIndex) : cmdLine;
            }
          }
          
          if (executablePath) {
            processName = path.basename(executablePath);
          } else {
            throw new Error('Failed to extract executable path');
          }
        } catch (argsError) {
          // Fallback: use comm field (may be truncated)
          try {
            const commCommand = `ps -p ${pid} -o comm= 2>/dev/null`;
            const output = execSync(commCommand, { encoding: 'utf8', timeout: 2000 });
            const rawName = output.trim();
            if (rawName) {
              processName = path.basename(rawName);
            } else {
              return null;
            }
          } catch (commError) {
            return null;
          }
        }
      }
      
      // 统一处理：提取基本名称并转为小写（用于比较）
      if (processName) {
        processName = path.basename(processName).toLowerCase();
      }
      
      return processName || null;
    } catch (error) {
      // 进程不存在或命令执行失败
      return null;
    }
  }

  /**
   * 验证进程是否仍然有效
   */
  function isProcessValid(registeredInfo) {
    try {
      // 1. 检查PID是否存在
      process.kill(registeredInfo.pid, 0);
      
      // 2. 检查进程名称是否与当前进程一致
      const currentProcessName = getCurrentProcessName();
      const targetProcessName = getProcessName(registeredInfo.pid);
      if (!currentProcessName || !targetProcessName) {
        console.log(`Unable to verify process names for PID ${registeredInfo.pid}`);
        return false;
      }
      
      // 比较进程名称（不区分大小写）
      const currentName = currentProcessName.toLowerCase();
      const targetName = targetProcessName.toLowerCase();
      
      if (currentName !== targetName) {
        console.log(`Process name mismatch for PID ${registeredInfo.pid}: expected "${currentName}", got "${targetName}"`);
        return false;
      }
      
      return true;
    } catch (e) {
      // 进程不存在
      return false;
    }
  }

  /**
   * 注册游戏到全局注册表
   */
  function registerGame(gameId, processInfo) {
    try {
      const registry = getGameRegistry();
      
      registry[gameId] = {
        pid: process.pid,
        gameId: gameId,
        timestamp: Date.now()
      };
      
      fs.writeFileSync(GAME_REGISTRY_FILE, JSON.stringify(registry, null, 2));
      console.log(`Registered game "${gameId}" in global registry (PID: ${process.pid})`);
    } catch (error) {
      console.error('Error registering game:', error);
    }
  }

  /**
   * 从全局注册表移除游戏
   */
  function unregisterGame(gameId) {
    if (!gameId) {
      console.warn('unregisterGame called with empty gameId');
      return;
    }

    try {
      const registry = getGameRegistry();
      if (registry[gameId]) {
        delete registry[gameId];
        fs.writeFileSync(GAME_REGISTRY_FILE, JSON.stringify(registry, null, 2));
        console.log(`Unregistered game "${gameId}" from global registry`);
      }
    } catch (error) {
      console.error('Error unregistering game:', error);
    }
  }

  /**
   * 请求将指定游戏窗口置前
   */
  function requestBringGameToFront(gameId, targetPid) {
    return new Promise((resolve) => {
      // 使用IPC向目标进程发送置前请求
      console.log(`Requesting game "${gameId}" to be brought to front in process ${targetPid}`);
      
      // 由于我们不能直接向其他进程发送IPC，这里使用文件系统作为通信机制
      const requestFile = path.join(GAME_REGISTRY_DIR, `bring-to-front-${gameId}-${Date.now()}.json`);
      try {
        fs.writeFileSync(requestFile, JSON.stringify({
          gameId: gameId,
          targetPid: targetPid,
          requesterId: process.pid,
          timestamp: Date.now(),
          action: 'bring-to-front'
        }));
        
        console.log(`Created bring-to-front request file: ${requestFile}`);
        resolve(true);
        
        // 清理请求文件（10秒后）
        setTimeout(() => {
          try {
            if (fs.existsSync(requestFile)) {
              fs.unlinkSync(requestFile);
            }
          } catch (e) {
            // 忽略清理错误
          }
        }, 10000);
        
      } catch (error) {
        console.error('Error creating bring-to-front request:', error);
        resolve(false);
      }
    });
  }

  /**
   * 检查并处理置前请求
   */
  function checkAndHandleBringToFrontRequests() {
    try {
      if (!fs.existsSync(GAME_REGISTRY_DIR)) return;
      
      const files = fs.readdirSync(GAME_REGISTRY_DIR);
      const requestFiles = files.filter(f => f.startsWith('bring-to-front-') && f.endsWith('.json'));
      
      for (const file of requestFiles) {
        try {
          const filePath = path.join(GAME_REGISTRY_DIR, file);
          const request = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // 检查是否是针对当前进程的请求
          if (request.targetPid === process.pid && request.action === 'bring-to-front') {
            console.log(`📥 Received bring-to-front request for game "${request.gameId}"`);
            
            // 执行窗口置前
            if (globalAppInstance) {
              globalAppInstance.bringGameToFront(request.gameId)
                .then(() => {
                  console.log(`Successfully brought game "${request.gameId}" to front`);
                })
                .catch((error) => {
                  console.error(`Failed to bring game "${request.gameId}" to front:`, error);
                });
            }
            
            // 删除请求文件
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.warn(`⚠️ Error processing request file ${file}:`, error.message);
          // 尝试删除损坏的请求文件
          try {
            fs.unlinkSync(path.join(GAME_REGISTRY_DIR, file));
          } catch (e) {
            // 忽略删除错误
          }
        }
      }
    } catch (error) {
      console.warn('Error checking bring-to-front requests:', error.message);
    }
  }

  // 定期检查置前请求（每2秒）
  setInterval(checkAndHandleBringToFrontRequests, 2000);

  // 统一的清理函数
  function performGameRegistryCleanup(reason = 'unknown') {
    console.log(`Cleaning up game registrations (reason: ${reason})...`);
    
    try {
      // 1. 清理内存中跟踪的游戏
      const gameIds = Array.from(globalRunningGames.keys());
      console.log(`Found ${gameIds.length} games in local registry to clean up`);
      
      for (const gameId of gameIds) {
        console.log(`Cleaning up game: ${gameId}`);
        unregisterGame(gameId);
      }
      
      console.log('Game registry cleanup completed');
    } catch (error) {
      console.error('Error during game registry cleanup:', error);
    }
  }

  // 应用退出时清理注册的游戏
  app.on('before-quit', (event) => {
    performGameRegistryCleanup('before-quit');
  });

  // 暴露全局函数供其他模块使用
  global.gameRegistryFunctions = {
    getGameRegistry,
    registerGame,
    unregisterGame,
    requestBringGameToFront
  };
  
  // 应用准备就绪
  app.whenReady().then(() => {
    console.log('Electron app is ready');
    // Electron环境下不在这里调用cliMain，避免重复调用
  });
  
  // 所有窗口关闭时退出应用
  app.on('window-all-closed', async () => {
    console.log('All windows closed, performing cleanup...');
    
    // 如果仍有运行中的游戏，避免提前退出
    if (globalRunningGames && globalRunningGames.size > 0) {
      console.log('There are still running games, skipping app quit');
      return;
    }
    
    // 执行游戏注册清理
    performGameRegistryCleanup('window-all-closed');
    
    // 如果有应用实例，先进行清理
    if (globalAppInstance) {
      try {
        await globalAppInstance.shutdown();
      } catch (error) {
        console.error('Error during cleanup:', error);
      } finally {
        globalAppInstance = null; // Clear global reference
        globalRunningGames.clear(); // Clear running games map
      }
    }
    
    app.quit();
  });
  
  app.on('activate', () => {
    // macOS dock 图标点击时的处理
    if (globalAppInstance && globalRunningGames.size > 0) {
      // 激活最近的游戏窗口
      const latestGame = Array.from(globalRunningGames.values())
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (latestGame && latestGame.gameHandle && latestGame.gameHandle.tjGameHandle && latestGame.gameHandle.tjGameHandle.gameView) {
        latestGame.gameHandle.tjGameHandle.gameView.show();
        latestGame.gameHandle.tjGameHandle.gameView.focus();
        latestGame.gameHandle.tjGameHandle.gameView.moveTop();
        console.log(`Brought game "${latestGame.gameHandle.gameId}" window to front`);
      }
    }
  });
}

const { CommandParser } = require('./CommandParser');
const { GameLauncher } = require('./GameLauncher');
const { GameManager } = require('./GameManager');
const { ConsoleUI } = require('./ConsoleUI');
const { Logger } = require('./utils/Logger');
const path = require('path');



/**
 * WebGLHost Runtime App 主类
 */
class WebGLHostRuntimeApp {
  constructor(options = {}) {
    this.options = options;
    this.gameLauncher = null;
    this.gameManager = null;
    this.consoleUI = new ConsoleUI();
    
    // Initialize logger with file output
    const logLevel = options.logLevel || 'info';
    let logFile = options.logFile;
    
    // Auto-enable logging in production builds
    if (!logFile) {
      logFile = this.getDefaultLogFile();
      console.log(`auto-enabling logs: ${logFile}`);
    }
    
    // Resolve log file path with timestamp if specified
    if (logFile) {
      logFile = this.resolveLogFile(logFile);
    }
    
    this.logger = new Logger(logLevel, logFile);
    
    // Override console methods to capture all output if logging to file
    if (logFile) {
      this.setupConsoleCapture();
    }
  }
  
  /**
   * Get default log file path for production builds
   * @returns {string} Default log file path
   */
  getDefaultLogFile() {
    const os = require('os');
    const appName = 'webglhost-runtime-app';
    
    // Create logs directory based on platform
    let logsDir;
    if (process.platform === 'win32') {
      // Windows: %APPDATA%/webglhost-runtime-app/logs
      logsDir = path.join(os.homedir(), 'AppData', 'Roaming', appName, 'logs');
    } else if (process.platform === 'darwin') {
      // macOS: ~/Library/Logs/webglhost-runtime-app
      logsDir = path.join(os.homedir(), 'Library', 'Logs', appName);
    } else {
      // Linux: ~/.local/share/webglhost-runtime-app/logs
      logsDir = path.join(os.homedir(), '.local', 'share', appName, 'logs');
    }
    
    // Ensure logs directory exists
    this.ensureLogDirectory(logsDir);
    
    return path.join(logsDir, 'app.log');
  }
  
  /**
   * Ensure log directory exists
   * @param {string} logDir - Log directory path
   */
  ensureLogDirectory(logDir) {
    const fs = require('fs-extra');
    try {
      fs.ensureDirSync(logDir);
    } catch (error) {
      console.warn(`Failed to create log directory ${logDir}:`, error.message);
    }
  }
  
  /**
   * Resolve log file path with timestamp support
   * @param {string} logFile - Log file path
   * @returns {string} Resolved log file path with timestamp
   */
  resolveLogFile(logFile) {
    const now = new Date();
    // Use local time instead of UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    const timestamp = `${year}-${month}-${day}T${hour}-${minute}-${second}`;
    
    // Add timestamp to filename before extension
    const ext = path.extname(logFile);
    const baseName = path.basename(logFile, ext);
    const dirName = path.dirname(logFile);
    
    return path.join(dirName, `${baseName}-${timestamp}${ext}`);
  }
  
  /**
   * Setup console capture to also log to file
   */
  setupConsoleCapture() {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    
    // Override console methods to also write to logger
    console.log = (...args) => {
      originalConsole.log(...args);
      this.logger.info(args.join(' '));
    };
    
    console.info = (...args) => {
      originalConsole.info(...args);
      this.logger.info(args.join(' '));
    };
    
    console.warn = (...args) => {
      originalConsole.warn(...args);
      this.logger.warn(args.join(' '));
    };
    
    console.error = (...args) => {
      originalConsole.error(...args);
      this.logger.error(args.join(' '));
    };
    
    console.debug = (...args) => {
      originalConsole.debug(...args);
      this.logger.debug(args.join(' '));
    };
    
    // Store original console for potential restoration
    this._originalConsole = originalConsole;
  }

  /**
   * 初始化应用
   */
  async initialize() {
    try {
      this.consoleUI.showInfo('Initializing WebGLHost Runtime App...');
      
      // 初始化游戏管理器
      this.gameManager = new GameManager(this.options);
      await this.gameManager.initialize();
      
      // 初始化游戏启动器 - 传递logger实例
      const gameLauncherOptions = { ...this.options, logger: this.logger };
      this.gameLauncher = new GameLauncher(gameLauncherOptions);
      await this.gameLauncher.initTJHostHandle();
      
      this.consoleUI.showSuccess('WebGLHost Runtime App initialized successfully');
    } catch (error) {
      this.consoleUI.showError('Failed to initialize app:', error);
      throw error;
    }
  }

  /**
   * 启动游戏
   * @param {string} gameId - 游戏ID
   * @param {string} launchKey - 启动键
   * @param {Object} options - 启动选项
   */
  async launchGame(gameId, launchKey, options = {}) {
    try {
        const trimmedKey = launchKey.trim();
        try {
          const url = new URL(trimmedKey);
          
          // 首先尝试从查询参数中获取gameId
          let urlGameId = url.searchParams.get('gameId');
          
          // 如果没有查询参数，尝试从路径中提取
          if (!urlGameId) {
            const pathParts = url.pathname.split('/');
            const gameIdIndex = pathParts.findIndex(part => /^[a-fA-F0-9]{20,}$/.test(part));
            
            if (gameIdIndex !== -1) {
              const gameId = pathParts[gameIdIndex];
              const nextPart = pathParts[gameIdIndex + 1];
              
              // 如果下一个部分是temp_session，则组合成 gameId_temp_session 格式
              if (nextPart === 'temp_session') {
                urlGameId = `${gameId}_temp_session`;
              } else {
                urlGameId = gameId;
              }
            }
          }
          
          gameId = urlGameId || trimmedKey;
        } catch (e) {
          gameId = trimmedKey;
        }
      
      this.consoleUI.showInfo(`Launching game: ${gameId}`);
      
      // 1. 检查是否已经在当前进程中运行此游戏
      if (this.gameLauncher && this.gameLauncher.gameHandles.has(gameId)) {
        console.log(`Game "${gameId}" already running in current process, bringing to front`);
        const existingHandle = this.gameLauncher.gameHandles.get(gameId);
        
        // 检查handle是否有效（不是占位符null）
        if (existingHandle === null) {
          // 游戏正在启动中（占位符状态）
          this.consoleUI.showInfo(`Game "${gameId}" is already being launched, please wait...`);
          return null;
        }
        
        // Handle有效，置前显示
        await this.bringGameToFront(gameId);
        return existingHandle;
      }
      
      // 2. 检查是否已经在其他进程中运行此游戏
      if (typeof global.gameRegistryFunctions !== 'undefined') {
        const registry = global.gameRegistryFunctions.getGameRegistry();
        if (registry[gameId]) {
          const existingGame = registry[gameId];
          
          // Check if it's really in another process (not a stale entry from current process)
          if (existingGame.pid !== process.pid) {
            console.log(`Game "${gameId}" already running in process ${existingGame.pid}, requesting window to front`);
            
            this.consoleUI.showWarning(`Game "${gameId}" is already running in another process. Bringing window to front...`);
            
            // 请求将其他进程中的游戏窗口置前
            try {
              await global.gameRegistryFunctions.requestBringGameToFront(gameId, existingGame.pid);
              console.log(`Requested game "${gameId}" to be brought to front in process ${existingGame.pid}`);
              
              // 多游戏场景：不退出当前进程，仅跳过该实例
              this.consoleUI.showInfo(`Game "${gameId}" window should now be visible. Skipping duplicate launch.`);
              
              return null;
            } catch (error) {
              console.error(`Failed to request window bring-to-front for game "${gameId}":`, error);
              this.consoleUI.showError(`Failed to communicate with existing game instance. Starting new instance...`);
              // 如果通信失败，继续启动新实例
            }
          } else {
            // Stale entry from current process - clean it up
            console.warn(`Found stale registry entry for game "${gameId}" in current process, cleaning up`);
            try {
              await global.gameRegistryFunctions.unregisterGame(gameId);
              console.log(`Cleaned up stale registry entry for game "${gameId}"`);
            } catch (cleanupError) {
              console.error(`Failed to cleanup stale registry for game "${gameId}":`, cleanupError);
            }
            // Continue to launch the game
          }
        }
      }
      
      // 3. 启动新的游戏实例
      const gameHandle = await this.gameLauncher.launchGame(gameId, launchKey, options);
      
      // 检查是否返回null（游戏正在启动中，被占位符拦截）
      if (gameHandle === null) {
        this.consoleUI.showInfo(`Game "${gameId}" is already being launched, please wait...`);
        return null;
      }
      
      // 4. 注册游戏到本地运行映射
      if (typeof globalRunningGames !== 'undefined') {
        globalRunningGames.set(gameId, {
          appInstance: this,
          gameHandle: gameHandle,
          timestamp: Date.now()
        });
        console.log(`Registered game "${gameId}" to local running games map`);
      }
      
      // 5. 注册游戏到全局跨进程注册表
      if (typeof global.gameRegistryFunctions !== 'undefined') {
        global.gameRegistryFunctions.registerGame(gameId, {
          launchKey: launchKey,
          accessToken: options.accessToken || 'unknown',
          timestamp: Date.now()
        });
      }
      
      this.consoleUI.showSuccess(`Game "${gameId}" launched successfully`);
      return gameHandle;
    } catch (error) {
      this.consoleUI.showError(`Failed to launch game "${gameId}":`, error);
      throw error;
    }
  }

  /**
   * 获取游戏列表
   */
  async getGameList() {
    try {
      return await this.gameManager.getGameList();
    } catch (error) {
      this.consoleUI.showError('Failed to get game list:', error);
      throw error;
    }
  }

  /**
   * 获取游戏状态
   * @param {string} gameId - 游戏ID
   */
  getGameStatus(gameId) {
    try {
      return this.gameLauncher.getGameStatus(gameId);
    } catch (error) {
      this.consoleUI.showError(`Failed to get game status for "${gameId}":`, error);
      throw error;
    }
  }

  /**
   * 停止游戏
   * @param {string} gameId - 游戏ID
   */
  async stopGame(gameId) {
    try {
      this.consoleUI.showInfo(`Stopping game: ${gameId}`);
      await this.gameLauncher.stopGame(gameId);
      
      // 先从全局跨进程注册表中移除
      if (typeof global.gameRegistryFunctions !== 'undefined') {
        try {
          global.gameRegistryFunctions.unregisterGame(gameId);
        } catch (error) {
          console.error(`Failed to unregister game "${gameId}" from global registry:`, error);
          // 继续执行，不阻断本地清理
        }
      }
      
      // 再从本地运行映射中移除游戏
      if (typeof globalRunningGames !== 'undefined' && globalRunningGames.has(gameId)) {
        globalRunningGames.delete(gameId);
        console.log(`Removed game "${gameId}" from local running games map`);
      }
      
      this.consoleUI.showSuccess(`Game "${gameId}" stopped successfully`);
    } catch (error) {
      this.consoleUI.showError(`Failed to stop game "${gameId}":`, error);
      throw error;
    }
  }

  /**
   * 停止所有游戏
   */
  async stopAllGames() {
    try {
      this.consoleUI.showInfo('Stopping all games...');
      
      // 先从跨进程注册表中移除所有游戏
      if (typeof global.gameRegistryFunctions !== 'undefined' && typeof globalRunningGames !== 'undefined') {
        for (const [gameId] of globalRunningGames) {
          global.gameRegistryFunctions.unregisterGame(gameId);
        }
      }
      
      await this.gameLauncher.stopAllGames();
      
      // 清空本地运行映射
      if (typeof globalRunningGames !== 'undefined') {
        globalRunningGames.clear();
        console.log('Cleared all games from local running games map');
      }
      
      this.consoleUI.showSuccess('All games stopped successfully');
    } catch (error) {
      this.consoleUI.showError('Failed to stop all games:', error);
      throw error;
    }
  }

  /**
   * 关闭应用
   */
  async shutdown() {
    try {
      this.consoleUI.showInfo('Shutting down WebGLHost Runtime App...');
      
      if (this.gameLauncher) {
        await this.gameLauncher.shutdown();
      }
      
      if (this.gameManager) {
        await this.gameManager.shutdown();
      }
      
      // Close logger
      if (this.logger) {
        this.logger.close();
      }
      
      // Restore original console if it was overridden
      if (this._originalConsole) {
        console.log = this._originalConsole.log;
        console.info = this._originalConsole.info;
        console.warn = this._originalConsole.warn;
        console.error = this._originalConsole.error;
        console.debug = this._originalConsole.debug;
      }
      
      this.consoleUI.showSuccess('WebGLHost Runtime App shutdown successfully');
    } catch (error) {
      this.consoleUI.showError('Failed to shutdown app:', error);
      throw error;
    }
  }

  /**
   * 将指定游戏窗口置前
   * @param {string} gameId - 游戏ID
   */
  async bringGameToFront(gameId) {
    try {
      if (!this.gameLauncher) {
        throw new Error('Game launcher not initialized');
      }
      
      const gameHandle = this.gameLauncher.gameHandles.get(gameId);
      if (!gameHandle) {
        // Game not found in local handles - it may have been closed
        // Clean up stale global registry entry
        console.warn(`Game "${gameId}" not found in local handles, cleaning up stale registry`);
        if (typeof global.gameRegistryFunctions !== 'undefined' && global.gameRegistryFunctions.unregisterGame) {
          try {
            await global.gameRegistryFunctions.unregisterGame(gameId);
            console.log(`Cleaned up stale registry entry for game "${gameId}"`);
          } catch (cleanupError) {
            console.error(`Failed to cleanup registry for game "${gameId}":`, cleanupError);
          }
        }
        // Don't throw - allow the game to be relaunched
        return;
      }
      
      console.log(`Attempting to bring game "${gameId}" window to front...`);
      
      // 尝试多种方式将游戏窗口置前
      let windowBroughtToFront = false;
      
      // 尝试访问tjGameHandle的gameView属性
      if (gameHandle.tjGameHandle && gameHandle.tjGameHandle.gameView) {
        const window = gameHandle.tjGameHandle.gameView;
        if (window && !window.isDestroyed()) {
          await this._forceWindowToFront(window, gameId);
          windowBroughtToFront = true;
          console.log(`Used tjGameHandle.gameView for game "${gameId}"`);
        }
      }
      
      if (!windowBroughtToFront) {
        console.warn(`Unable to find accessible window for game "${gameId}"`);
        console.log('Available properties:', Object.keys(gameHandle));
      } else {
        console.log(`Successfully brought game "${gameId}" window to front`);
      }
      
    } catch (error) {
      console.error(`Error bringing game "${gameId}" to front:`, error);
      throw error;
    }
  }

  /**
   * 强制将窗口置前 - 专门为Windows平台优化
   * @param {BrowserWindow} window - Electron窗口对象
   * @param {string} gameId - 游戏ID
   */
  async _forceWindowToFront(window, gameId) {
    return new Promise((resolve) => {
      console.log(`Force bringing window to front for game "${gameId}"...`);
      
      try {
        // 1. 如果窗口最小化，先恢复
        if (window.isMinimized()) {
          console.log(`Restoring minimized window for game "${gameId}"`);
          window.restore();
        }
        
        // 2. 确保窗口显示
        window.show();
               
        // 4. 聚焦
        window.focus();
        
        // 5. 确保窗口移到最前
        window.moveTop();

        window.setAlwaysOnTop(true, 'modal-panel');
        
        console.log(`Applied Windows-specific window bring-to-front operations for game "${gameId}"`);
        
        // 6. 延迟取消置顶状态（3秒后），避免干扰用户
        setTimeout(() => {
          try {
            if (!window.isDestroyed()) {
              window.setAlwaysOnTop(false);
              console.log(`Removed always-on-top for game "${gameId}"`);
            }
          } catch (error) {
            console.warn(`Error removing always-on-top for game "${gameId}":`, error.message);
          }
          resolve();
        }, 100);
        
      } catch (error) {
        console.error(`Error in force window to front for game "${gameId}":`, error);
        resolve(); // 即使出错也要resolve，避免阻塞
      }
    });
  }

  /**
   * 获取应用状态
   */
  getStatus() {
    return {
      initialized: !!this.gameLauncher && !!this.gameManager,
      activeGames: this.gameLauncher ? this.gameLauncher.getActiveGameCount() : 0,
      runningGames: typeof globalRunningGames !== 'undefined' ? Array.from(globalRunningGames.keys()) : [],
      options: this.options
    };
  }

  async openLauncherWindow() {
    console.log('[Launcher] ENTER openLauncherWindow, file:', __filename, 'isElectron:', isElectron);

    const { BrowserWindow } = require('electron');

    const win = new BrowserWindow({
      width: 420,
      height: 800,
      autoHideMenuBar: true, 
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      title: 'Unity 小游戏宿主'
    });
    const launcherPath = path.join(__dirname, 'index.html');
    win.loadFile(launcherPath);
    
    // Handle launcher window close - quit entire app
    win.on('closed', () => {
      console.log('[Launcher] Launcher window closed, quitting app...');
      const { app } = require('electron');
      // Use setImmediate to ensure the window is fully closed
      setImmediate(() => {
        app.quit();
      });
    });
    
    return win;
  }

}

/**
 * 命令行启动函数
 */
async function cliMain() {
  try {
    console.log('Starting CLI main function...');
    
    // 如果在 Electron 环境中，等待应用准备就绪
    if (isElectron) {
      const { app } = require('electron');
      await app.whenReady();
    }
    console.debug('Parsing command line arguments...');
    console.debug('Raw process.argv:', process.argv);

    // 在生产环境中修复 process.argv 格式
    let argv = process.argv;
    
    // 对于打包的Electron应用，process.argv格式可能不是标准的[node, script, ...args]
    // 我们需要确保commander.js能正确解析
    if (isElectron && argv.length >= 1 && argv[1] && argv[1].startsWith('--')) {
      // 生产环境：['app-executable', '--game-id', 'value'] 
      // 需要添加一个占位符来匹配 commander 期望的格式 [node, script, ...args]
      argv = [argv[0], 'app', ...argv.slice(1)];
      console.debug('Fixed argv for Electron production:', argv);
    }

    // 解析命令行参数
    const parser = new CommandParser();
    const options = parser.parse(argv);
    
    // console.log('Parsed options:', options);
    
    // 显示帮助信息
    if (options.help) {
      parser.showHelp();
      process.exit(0);
    }
    
    // 显示版本信息
    if (options.version) {
      const packageJson = require('../package.json');
      console.log(`WebGLHost Runtime App v${packageJson.version}`);
      process.exit(0);
    }
    
    // 验证必要参数 - 注释掉这部分，因为launch-key不再是必须的
    // if (!options.launchKey) {
    //   console.error('Error: --launch-key is required');
    //   parser.showHelp();
    //   process.exit(1);
    // }
    
    // 创建应用实例
    const app = new WebGLHostRuntimeApp(options);
    
    // 保存全局引用以便窗口关闭时清理
    globalAppInstance = app;
    
    // 初始化应用
    await app.initialize();

    // 在主进程顶层初始化阶段注册 IPC（窗口打开前）
    const { ipcMain } = require('electron');
    ipcMain.handle('minihost:getGameList', async (_event, payload = {}) => {
      console.log('[Main] minihost:getGameList invoked, payload:', payload);
      try {
        // 若渲染层传入 token，则覆盖到 app.options.accessToken，供后续 API 使用
        if (payload && payload.token) {
          app.options = { ...app.options, accessToken: payload.token };
        }
        const list = await app.gameManager.fetchGameListFromApi();
        console.log('[Main] minihost:getGameList success, list length:', Array.isArray(list) ? list.length : 'n/a');
        return { ok: true, list };
      } catch (e) {
        console.error('[Main] minihost:getGameList error:', e);
        return { ok: false, list: [], msg: e && e.message };
      }
    });
  
    ipcMain.handle('minihost:launchGame', async (_event, payload = {}) => {
      console.log('[Main] minihost:launchGame invoked, payload:', payload);
      const { gameId, launchKey } = payload;
      if (!gameId) {
        return { ok: false, msg: 'missing gameId' };
      }
      try {
        const handle = await app.launchGame(
          gameId,
          launchKey || gameId,
          { ...app.options, accessToken: payload.accessToken || app.options.accessToken }
        );
        console.log('[Main] minihost:launchGame result handle:', !!handle);
        
        // If handle is null, it means the game is already being launched (placeholder)
        // This is not an error, so return ok: true with a message
        if (handle === null) {
          return { ok: true, msg: 'Game is already being launched' };
        }
        
        return { ok: true, handle: !!handle };
      } catch (e) {
        console.error('[Main] minihost:launchGame error:', e);
        return { ok: false, msg: e && e.message };
      }
    });

    // 检查是否有游戏启动参数
    const hasGameParams = options.launchKey || 
                         (Array.isArray(options.games) && options.games.length > 0) || 
                         options.gameUrl;
    
    if (!hasGameParams) {
      // 没有游戏启动参数，打开游戏列表页面
      console.log('[CLI] No game parameters provided, opening game list...');
      await app.openLauncherWindow();
      console.log('[CLI] Game list opened');
    } else {
      // 有游戏启动参数，按原有逻辑启动游戏
      console.log('[CLI] Game parameters provided, launching games...');
      
      // 启动单个或多个游戏
      if (Array.isArray(options.games) && options.games.length > 0) {
        let successfulLaunches = 0;
        for (const g of options.games) {
          try {
            const handle = await app.launchGame(
              g.gameId,
              g.launchKey,
              {
                ...options,
                userId: g.userId || options.userId,
                accessToken: g.accessToken || options.accessToken,
                gameUrl: g.gameUrl || options.gameUrl
              }
            );
            if (handle) {
              app.consoleUI.showGameInfo(handle);
              successfulLaunches++;
            } else {
              // Game already running in another process, skip this one
              console.log(`Skipped launching game "${g.gameId}" as it's already running`);
            }
          } catch (e) {
            console.error('Failed to launch one of the games:', e);
          }
        }
        
        // If no games were successfully launched (all were already running), exit
        if (successfulLaunches === 0) {
          app.consoleUI.showInfo('All games are already running in other processes. Exiting...');
          globalAppInstance = null;
          if (isElectron) {
            const { app: electronApp } = require('electron');
            electronApp.quit();
          } else {
            process.exit(0);
          }
          return;
        }
      } else {
        const gameHandle = await app.launchGame(
          options.gameId, 
          options.launchKey, 
          {
            ...options,
            gameUrl: options.gameUrl
          }
        );
        if (gameHandle) {
          app.consoleUI.showGameInfo(gameHandle);
        } else {
          // Game already running in another process, exit current process
          app.consoleUI.showInfo('Exiting current process as game is already running elsewhere...');
          globalAppInstance = null;
          if (isElectron) {
            const { app: electronApp } = require('electron');
            electronApp.quit();
          } else {
            process.exit(0);
          }
          return;
        }
      }
    }
    
    // 设置信号处理
    process.on('SIGINT', async () => {
      app.consoleUI.showInfo('Received SIGINT, shutting down...');
      await app.shutdown();
      globalAppInstance = null;
      if (isElectron) {
        const { app: electronApp } = require('electron');
        electronApp.quit();
      } else {
        process.exit(0);
      }
    });
    
    process.on('SIGTERM', async () => {
      app.consoleUI.showInfo('Received SIGTERM, shutting down...');
      await app.shutdown();
      globalAppInstance = null;
      if (isElectron) {
        const { app: electronApp } = require('electron');
        electronApp.quit();
      } else {
        process.exit(0);
      }
    });
    
    // 保持进程运行
    if (!isElectron) {
      process.stdin.resume();
    }
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    console.error(error.stack);
    if (isElectron) {
      const { app: electronApp } = require('electron');
      electronApp.quit();
    } else {
      process.exit(1);
    }
  }
}

// 导出模块
module.exports = {
  WebGLHostRuntimeApp,
  cliMain
};

// 在Electron环境中，总是调用cliMain
if (isElectron || require.main === module) {
  cliMain();
}
