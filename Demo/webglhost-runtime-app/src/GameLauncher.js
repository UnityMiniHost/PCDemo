/**
 * GameLauncher - 游戏启动器
 * 
 * 负责游戏启动、生命周期管理和多实例协调
 */

const { TJHostHandle, MultiGameLauncher, RuntimeGameHandle, TJConstants, GameDevelopmentKit } = require('webglhost-runtime-pc');
const { ConsoleUI } = require('./ConsoleUI');
const { Logger } = require('./utils/Logger');
const axios = require('axios');

class GameLauncher {
  // Static flag to prevent multiple quit attempts in multi-instance scenario
  static _isQuitting = false;
  
  constructor(options = {}) {
    this.options = options;
    this.accessToken = options.accessToken || '';
    this.hostHandle = null;
    this.gameHandles = new Map(); // gameId -> gameHandle
    this.consoleUI = new ConsoleUI();
    // Use passed logger instance if available, otherwise create new one
    this.logger = options.logger || new Logger(options.logLevel, options.logFile);
  }

  /**
   * 初始化游戏启动器
   */
  async initTJHostHandle() {
    try {
      this.consoleUI.showInfo('Initializing game launcher...');
      
      // 配置多实例管理器
      const maxByOption = (typeof this.options.instances === 'number' && this.options.instances > 0) ? this.options.instances : 0;
      const maxByGames = Array.isArray(this.options.games) ? this.options.games.length : 0;
      this.maxInstances = Math.max(1, maxByOption, maxByGames);
      MultiGameLauncher.configMaxGame(this.maxInstances);
      
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
      
      if (!isElectron) {
        throw new Error('Not running in Electron environment, SDK requires Electron');
      }
      
      TJHostHandle.setRuntimeEnv(process.env.NODE_ENV);
      
      // 初始化宿主句柄
      await new Promise((resolve, reject) => {
        TJHostHandle.initialize(
          this.options.sdkKey,
          this.options.sdkSecret,
          (hostHandle, error) => {
            if (error) {
              reject(error);
              return;
            }
            
            if (!hostHandle) {
              reject(new Error('Failed to create TJHostHandle'));
              return;
            }
            
            this.hostHandle = hostHandle;
            
            // 初始化日志
            this.hostHandle.initLog(
              this.options.debug ? 'debug' : 'info',
              this.logger
            );
            
            resolve(hostHandle);
          }
        );
      });

      this.consoleUI.showSuccess('Game launcher initialized successfully');
    } catch (error) {
      this.consoleUI.showError('Failed to initialize game launcher:', error);
      throw error;
    }
  }

  /**
   * 获取自定义脚本的正确路径
   * @param {string} scriptName - 脚本文件名
   * @returns {string} 脚本的完整路径
   */
  getCustomScriptPath(scriptName) {
    const path = require('path');
    const fs = require('fs');
    
    // 检查是否在打包的Electron应用中
    const isPackaged = (() => {
      try {
        // 检查是否存在app.asar路径
        return __dirname.includes('app.asar') || process.resourcesPath;
      } catch (e) {
        return false;
      }
    })();
    
    if (isPackaged) {
      // 打包环境：尝试多个可能的路径
      const appDir = path.dirname(process.execPath);
      // 可能的路径列表
      const possiblePaths = [
        // 路径1：应用目录下
        path.join(appDir, 'customScripts', scriptName),
        // 路径2：macOS应用包Contents目录下
        path.join(appDir, '..', 'customScripts', scriptName),
        // 路径3：相对于process.cwd()
        path.join(process.cwd(), 'customScripts', scriptName)
      ];
      
      // 逐一尝试路径
      for (const possiblePath of possiblePaths) {
        // console.log(`Checking path: ${possiblePath}`);
        if (fs.existsSync(possiblePath)) {
          console.log(`Found custom script: ${possiblePath}`);
          return possiblePath;
        }
      }
      
      // 如果都没找到，返回第一个路径并警告
      const defaultPath = possiblePaths[0];
      console.warn(`Custom script not found in any location. Using default: ${defaultPath}`);
      return defaultPath;
    } else {
      // 开发环境：使用相对路径
      const scriptPath = path.resolve(process.cwd(), 'customScripts', scriptName);
      console.log(`Development mode - Custom script path: ${scriptPath}`);
      return scriptPath;
    }
  }

  /**
   * 启动游戏
   * @param {string} gameId - 游戏ID
   * @param {string} launchKey - 启动键
   * @param {Object} options - 启动选项
   * @returns {RuntimeGameHandle} 游戏句柄
   */
  async launchGame(gameId, launchKey, options = {}) {
    try {
      // 检查是否已有相同实例
      if (this.gameHandles.has(gameId)) {
        const existingHandle = this.gameHandles.get(gameId);
        // 如果是null（占位符），说明游戏正在启动中，拒绝重复启动
        if (existingHandle === null) {
          this.consoleUI.showInfo(`Game "${gameId}" is already being launched, please wait...`);
          this.logger.warn(`Duplicate launch attempt detected for game: ${gameId}`);
          return null;
        }
        // 返回已启动的游戏实例
        this.consoleUI.showInfo(`Game "${gameId}" already running, reusing existing instance`);
        return existingHandle;
      }
      
      let gameHandle = null;
      let isReusingHandle = false;
      
      // 检查实例数量限制
      const limit = this.maxInstances || this.options.instances || 1;
      if (this.gameHandles.size >= limit) {
        // Cleanup oldest game and get the reset handle for reuse
        gameHandle = await this.cleanupOldestGame();
        if (gameHandle) {
          isReusingHandle = true;
          this.logger.info(`Reusing cleaned up game handle for new game: ${gameId}`);
        }
      }
      
      // ✅ 立即占位，防止竞态条件（在创建/复用handle之前就保存到map）
      // 这样后续的重复点击会被line 155-158的检查拦截
      // 使用临时的placeholder，如果后续失败会被清除
      this.gameHandles.set(gameId, null);
      
      // 创建或复用游戏句柄
      if (!gameHandle) {
        this.consoleUI.showInfo(`Creating new game handle...`);
        gameHandle = await this.createGameHandle(gameId, launchKey, options);
      } else {
        this.consoleUI.showInfo(`Reusing existing game handle...`);
        // Re-setup game start options for the reused handle
        await this.setupGameStartOptions(gameHandle, gameId, launchKey, options);
        // Re-setup custom command listeners (e.g. loginUnity) for the reused handle
        // Note: setupGameEventListeners is not called here because listeners are preserved in reset()
        this.setCustomCommandListener(gameHandle, this.accessToken);
      }
      
      // 启动游戏
      this.consoleUI.showInfo(`Starting game...`);
      await gameHandle.start();
      
      // 更新为真实的游戏句柄（替换placeholder）
      this.gameHandles.set(gameId, gameHandle);
      
      const message = isReusingHandle 
        ? `Game "${gameId}" launched successfully (reused handle)` 
        : `Game "${gameId}" launched successfully (new handle)`;
      this.consoleUI.showSuccess(message);
      
      return gameHandle;
    } catch (error) {
      // 清理占位符（如果启动失败）
      if (this.gameHandles.get(gameId) === null || !this.gameHandles.get(gameId)) {
        this.gameHandles.delete(gameId);
        this.logger.info(`Removed placeholder for failed game: ${gameId}`);
      }
      this.consoleUI.showError(`Failed to launch game "${gameId}":`, error);
      throw error;
    }
  }

  /**
   * 创建游戏句柄
   * @param {string} gameId - 游戏ID
   * @param {string} launchKey - 启动键
   * @param {Object} options - 启动选项
   * @returns {RuntimeGameHandle} 游戏句柄
   */
  async createGameHandle(gameId, launchKey, options = {}) {
    try {
      if (!this.hostHandle) {
        throw new Error('Host handle not available, cannot create game handle');
      }
      
      // 创建游戏句柄
      const gameHandle = await MultiGameLauncher.createGameHandle(
        this.hostHandle,
        gameId,
        options
      );
      
      // 设置游戏启动参数
      await this.setupGameStartOptions(gameHandle, gameId, launchKey, options);
      
      // 设置事件监听器（listeners会在reset时保留，所以只需要在创建时设置一次）
      this.setupGameEventListeners(gameHandle, gameId);
      this.setCustomCommandListener(gameHandle, this.accessToken);
      
      return gameHandle;
    } catch (error) {
      this.consoleUI.showError(`Failed to create game handle for "${gameId}":`, error);
      throw error;
    }
  }

  /**
   * 设置游戏启动参数（支持复用场景）
   * @param {RuntimeGameHandle} gameHandle - 游戏句柄
   * @param {string} gameId - 游戏ID
   * @param {string} launchKey - 启动键
   * @param {Object} options - 启动选项
   */
  async setupGameStartOptions(gameHandle, gameId, launchKey, options = {}) {
    const gameStartOptions = {
      [TJConstants.LAUNCH_KEY]: launchKey,
      [TJConstants.USER_ID]: options.userId || this.options.userId,
      [TJConstants.GAME_ID]: gameId,
      [TJConstants.ENABLE_VCONSOLE]: options.debug || this.options.debug,
      [TJConstants.ENABLE_INSPECTOR]: options.debug || this.options.debug,
      [TJConstants.ENABLE_MUTE_ALL_AUDIO]: options.mute || this.options.mute,
      [TJConstants.ENABLE_TRANSPARENT_MODE]: options.transparent || this.options.transparent,
      [TJConstants.INSPECTOR_WAIT_FOR_INSPECT]: options.debug || this.options.debug,
      [TJConstants.ACCESS_TOKEN]: options.accessToken || this.accessToken,
      customInitScripts: [
        {
          type: 'filepath',
          filepath: this.getCustomScriptPath('auth.js'),
        },
        {
          type: 'filepath',
          filepath: this.getCustomScriptPath('ad.js'),
        }
      ]
    };
    
    // 添加游戏URL（如果提供）
    if (options.gameUrl) {
      const path = require('path');
      const absPath = path.resolve(process.cwd(), options.gameUrl);
      gameStartOptions.gameUrl = absPath;
      gameStartOptions.gamePackageRoot = absPath;
      console.log(`🎮 Game package root set to: ${absPath}`);
    }
    
    await gameHandle.setGameStartOptions(gameStartOptions);
  }

  /**
   * 设置游戏事件监听器
   * @param {RuntimeGameHandle} gameHandle - 游戏句柄
   * @param {string} gameId - 游戏ID
   */
  setupGameEventListeners(gameHandle, gameId) {
    // 游戏错误
    gameHandle.setOnHostFailureListener((error) => {
      this.consoleUI.showError(`Game "${gameId}" failed:`, error);
    });
    
    // 第一帧渲染
    gameHandle.setOnFirstFrameRenderedListener(() => {
      this.consoleUI.showSuccess(`Game "${gameId}" first frame rendered`);
    });
    
    // 游戏关闭
    gameHandle.setOnTJCloseListener(() => {
      this.consoleUI.showInfo(`Game "${gameId}" closed by user`);
      this.gameHandles.delete(gameId);
    });
    
    // 宿主窗口退出（窗口被关闭）
    gameHandle.setOnHostExitedListener((isRestart = false) => {
      this.logger.info(`[GameHandleListener] onHostExited, isRestart: ${isRestart}, gameId: ${gameId}`);
      
      if (!isRestart) {
        // Normal close: cleanup local state
        this.logger.info(`Game "${gameId}" closed normally`);
        this.consoleUI.showInfo(`Game "${gameId}" host window closed`);
      
        // 清理本地游戏句柄 (only if still in map - may have been removed during cleanup)
        if (this.gameHandles.has(gameId)) {
          this.gameHandles.delete(gameId);
          this.logger.info(`Removed game "${gameId}" from local handles map`);
        }

        // 清理全局运行映射
        if (global.globalRunningGames && global.globalRunningGames.has(gameId)) {
          global.globalRunningGames.delete(gameId);
          console.log(`Removed game "${gameId}" from global running games. Remaining: ${global.globalRunningGames.size}`);
        }
        
        // 从全局注册表移除游戏
        if (global.gameRegistryFunctions && global.gameRegistryFunctions.unregisterGame) {
          global.gameRegistryFunctions.unregisterGame(gameId);
        }
        
        // Note: Don't quit app when games close - only quit when launcher window closes
        this.logger.info(`Game "${gameId}" cleanup completed. Launcher window remains open.`);
      }
    });
  }

  setCustomCommandListener(gameHandle, accessToken) {
    gameHandle.setCustomCommandListener("loginUnity", async (request, handle) => {
      this.logger.info('[GameLauncher] loginUnity command received');

      try {
        handle.success({code: '000000-000000-000000-000000'});
      } catch (error) {
        // Use logger.error instead of console.error to capture stack trace in log file
        this.logger.error('[GameLauncher] loginUnity error:', error);
        handle.fail({ 
          errorCode: error.code || 'API_ERROR', 
          errorMsg: error.message 
        });
      }
    });

    // 激励广告相关的自定义命令监听器（保持向后兼容）
    gameHandle.setCustomCommandListener("loadRewardAd", async (request, handle) => {
      console.log('loadRewardAd command received:', request);
      try {
        const response = await axios.get('https://connect.unity.cn/api/connect-game/ads');
        const adData = response.data;

        console.log('Ad data loaded:', adData);

        // 存储广告数据供 showRewardAd 使用
        gameHandle._adData = adData;

        handle.success({
          adId: adData.id,
          adType: adData.adType,
          duration: adData.duration || 10
        });
      } catch (error) {
        this.logger.error('loadRewardAd error:', error);
        handle.fail({
          errorCode: 'LOAD_AD_FAILED',
          errorMsg: error.message || 'Failed to load reward ad'
        });
      }
    });
    gameHandle.setCustomCommandListener("openSystemBrowser", async(request, handle) => {
      console.log('openSystemBrowser command received:', request);
      try {
          const { shell } = require('electron');
          const url = request.url;
          if (!url) {
            handle.fail( {
              errorCode: 'MISSING_URL',
              errorMsg: 'URL parameter is required'
            });
            return;
          }
          await shell.openExternal(url);
          handle.success({ success: true, message: '已在系统浏览器中打开链接' });
        } catch (error) {
          console.error('打开系统浏览器失败:', error);
          handle.fail( {
            errorCode: 'OPEN_BROWSER_FAILED',
            errorMsg: error.message || '打开系统浏览器失败'
          }
          );
        }
    });

    gameHandle.setCustomCommandListener("showRewardAd", async (request, handle) => {
      console.log('showRewardAd command received:', request);

      try {
        if (!gameHandle._adData) {
          handle.fail({
            errorCode: 'NO_AD_DATA',
            errorMsg: 'No ad data available'
          });
          return;
        }

        const adData = gameHandle._adData;
        console.log('Showing reward ad:', adData);

        // 1. 创建广告UI
        const adScript = `
      (function() {
        // 获取render-root-container元素
        const renderRootContainer = document.getElementById('render-root-container');
        if (!renderRootContainer) {
          console.error('render-root-container not found');
          return false;
        }
        
        // 创建广告容器
        const adContainer = document.createElement('div');
        adContainer.id = 'tj-reward-ad-container';
        adContainer.style.position = 'absolute';
        adContainer.style.top = '0';
        adContainer.style.left = '0';
        adContainer.style.width = '100%';
        adContainer.style.height = '100%';
        adContainer.style.backgroundColor = '#000000';
        adContainer.style.zIndex = '99999';
        adContainer.style.display = 'flex';
        adContainer.style.flexDirection = 'column';
        adContainer.style.justifyContent = 'center';
        adContainer.style.alignItems = 'center';
        
        // 创建图片容器
        const imageContainer = document.createElement('div');
        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.width = '100%';
        imageContainer.style.height = '100%';
        
        // 创建广告图片
        const adImage = document.createElement('img');
        adImage.src = '${adData.image}';
        adImage.style.borderRadius = '6px';
        adImage.style.cursor = 'pointer';
        adImage.alt = '${adData.name || ''}';

          // 检测屏幕方向并设置图片尺寸
        function updateImageSize() {
          const containerWidth = renderRootContainer.offsetWidth;
          const containerHeight = renderRootContainer.offsetHeight;
          const isLandscape = containerWidth > containerHeight;
          
          if (isLandscape) {
            // 横屏模式：高度占满，宽度按比例缩放
            adImage.style.objectFit = 'contain'; 
            adImage.style.height = '100%';
            adImage.style.width = 'auto';  
          } else {
            adImage.style.objectFit = 'cover'; 
            adImage.style.width = '100%';
            adImage.style.height = '100%';
          }
        }

        // 初始设置图片尺寸
        updateImageSize();

        // 创建计时器容器
        const timerContainer = document.createElement('div');
        timerContainer.style.position = 'absolute';
        timerContainer.style.top = '20px';
        timerContainer.style.right = '20px';
        timerContainer.style.color = 'white';
        timerContainer.style.fontSize = '14px';
        timerContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        timerContainer.style.padding = '8px 12px';
        timerContainer.style.borderRadius = '30px';
        timerContainer.style.zIndex = '100000';
        
        const timerText = document.createElement('span');
        timerText.id = 'tj-reward-ad-timer';
        timerText.textContent = '广告将在 10 秒后关闭';
        timerContainer.appendChild(timerText);
        
        // 添加点击事件
        adImage.addEventListener('click', function() { 
          const adUrl = '${adData.url || 'https://connect.unity.cn'}';

          tj.customCommand("openSystemBrowser", {
            url: adUrl,
            success: function(res) {
              console.info("[Host] openSystemBrowser success res", res);
            },
            fail: function(res) {
              console.info("[Host] openSystemBrowser fail res", res);
              window.open(adUrl, '_blank');      
            }
          });  
        });
        
        // 添加元素到容器
        imageContainer.appendChild(adImage);
        adContainer.appendChild(imageContainer);
        adContainer.appendChild(timerContainer);
        
        // 添加容器到render-root-container而不是body
        renderRootContainer.appendChild(adContainer);
        
        // 返回创建成功
        return true;
      })();
    `;

        const result = await gameHandle.runCustomScript(adScript);

        if (!result) {
          throw new Error('Failed to create ad UI');
        }

        // 2. 设置10秒定时器
        let remainingTime = 10;
        // 开始倒计时
        const countdownInterval = setInterval(async () => {
          remainingTime--;

          // 更新倒计时显示
          try {
            const updateTimerScript = `
          (function() {
            const timerElement = document.getElementById('tj-reward-ad-timer');
            if (timerElement) {
              timerElement.textContent = '广告将在 ${remainingTime} 秒后关闭'.replace('${remainingTime}', ${remainingTime});
            }
            return true;
          })();
        `;
            await gameHandle.runCustomScript(updateTimerScript);
          } catch (error) {
            console.error('Failed to update timer:', error);
          }

          // 倒计时结束
          if (remainingTime <= 0) {
            clearInterval(countdownInterval);

            // 3. 广告完成后移除广告UI并调用回调函数
            const removeAdScript = `
          (function() {
            const adContainer = document.getElementById('tj-reward-ad-container');
            if (adContainer) {
              adContainer.remove();
            }
            return true;
          })();
        `;

            try {
              await gameHandle.runCustomScript(removeAdScript);

              // 调用广告关闭回调
              const callCloseCallbackScript = `
            (function() {
              if (typeof rewardedVideoCloseCallback === 'function') {
                rewardedVideoCloseCallback(true);
                return true;
              }
              return false;
            })();
          `;

              try {
                await gameHandle.runCustomScript(callCloseCallbackScript);
                console.log('Reward ad close callback executed');
              } catch (callbackError) {
                console.error('Failed to execute close callback:', callbackError);
              }

              console.log('Reward ad completed successfully');
            } catch (error) {
              console.error('Failed to remove ad UI:', error);
              handle.fail({
                errorCode: 'REMOVE_AD_FAILED',
                errorMsg: error.message || 'Failed to remove reward ad'
              });
            }
          }
        }, 1000);

      } catch (error) {
        this.logger.error('showRewardAd error:', error);
        handle.fail({
          errorCode: 'SHOW_AD_FAILED',
          errorMsg: error.message || 'Failed to show reward ad'
        });
      }
    });
  }

  /**
   * 停止游戏
   * @param {string} gameId - 游戏ID
   */
  async stopGame(gameId) {
    try {
      const gameHandle = this.gameHandles.get(gameId);
      if (!gameHandle) {
        this.consoleUI.showWarning(`Game "${gameId}" not found`);
        return;
      }
      
      this.consoleUI.showInfo(`Stopping game: ${gameId}`);
      
      await gameHandle.stop();
      this.gameHandles.delete(gameId);
      
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
      
      const stopPromises = Array.from(this.gameHandles.keys()).map(gameId => 
        this.stopGame(gameId)
      );
      
      await Promise.all(stopPromises);
      
      this.consoleUI.showSuccess('All games stopped successfully');
    } catch (error) {
      this.consoleUI.showError('Failed to stop all games:', error);
      throw error;
    }
  }

  /**
   * 暂停游戏
   * @param {string} gameId - 游戏ID
   */
  async pauseGame(gameId) {
    try {
      const gameHandle = this.gameHandles.get(gameId);
      if (!gameHandle) {
        this.consoleUI.showWarning(`Game "${gameId}" not found`);
        return;
      }
      
      await gameHandle.pause();
      this.consoleUI.showInfo(`Game "${gameId}" paused`);
    } catch (error) {
      this.consoleUI.showError(`Failed to pause game "${gameId}":`, error);
      throw error;
    }
  }

  /**
   * 恢复游戏
   * @param {string} gameId - 游戏ID
   */
  async resumeGame(gameId) {
    try {
      const gameHandle = this.gameHandles.get(gameId);
      if (!gameHandle) {
        this.consoleUI.showWarning(`Game "${gameId}" not found`);
        return;
      }
      
      await gameHandle.play();
      this.consoleUI.showInfo(`Game "${gameId}" resumed`);
    } catch (error) {
      this.consoleUI.showError(`Failed to resume game "${gameId}":`, error);
      throw error;
    }
  }

  /**
   * 获取游戏状态
   * @param {string} gameId - 游戏ID
   * @returns {Object} 游戏状态信息
   */
  getGameStatus(gameId) {
    const gameHandle = this.gameHandles.get(gameId);
    if (!gameHandle) {
      return null;
    }
    
    return {
      gameId: gameId,
      state: gameHandle.getGameState(),
      isMuted: gameHandle.isMuted(),
      isRunning: gameHandle.getGameState() === 'running'
    };
  }

  /**
   * 获取所有游戏状态
   * @returns {Array} 所有游戏状态信息
   */
  getAllGameStatus() {
    return Array.from(this.gameHandles.keys()).map(gameId => 
      this.getGameStatus(gameId)
    );
  }

  /**
   * 获取活跃游戏数量
   * @returns {number} 活跃游戏数量
   */
  getActiveGameCount() {
    return this.gameHandles.size;
  }

  /**
   * 清理最旧的游戏
   * @returns {RuntimeGameHandle|null} 返回被清理的游戏句柄（已reset，可复用）
   */
  async cleanupOldestGame() {
    if (this.gameHandles.size === 0) {
      return null;
    }
    
    const oldestGameId = this.gameHandles.keys().next().value;
    this.consoleUI.showInfo(`Cleaning up oldest game: ${oldestGameId}`);
    
    try {
      const gameHandle = this.gameHandles.get(oldestGameId);
      if (!gameHandle) {
        return null;
      }
      
      // Remove from local map BEFORE stopping to prevent onHostExited callback from deleting again
      this.gameHandles.delete(oldestGameId);
      
      // Stop the game (which calls reset() internally)
      await gameHandle.stop();
      
      // Ensure reset is complete and handle is ready for reuse
      // The _isDestroyed flag should be false after reset
      if (gameHandle._isDestroyed) {
        this.logger.warn(`Game handle for "${oldestGameId}" still marked as destroyed after reset`);
        return null;
      }
      
      // Note: The gameHandle is now reset and ready for reuse
      // Listeners are preserved, so app layer doesn't need to re-register them
      this.logger.info(`Game "${oldestGameId}" cleaned up, handle ready for reuse`);
      
      return gameHandle;
    } catch (error) {
      this.consoleUI.showError(`Failed to cleanup game "${oldestGameId}":`, error);
      throw error;
    }
  }

  /**
   * 关闭游戏启动器
   */
  async shutdown() {
    try {
      this.consoleUI.showInfo('Shutting down game launcher...');
      
      // 停止所有游戏
      await this.stopAllGames();
      
      // 清理宿主句柄
      if (this.hostHandle) {
        await this.hostHandle.cleanup();
      }
      
      this.consoleUI.showSuccess('Game launcher shutdown successfully');
    } catch (error) {
      this.consoleUI.showError('Failed to shutdown game launcher:', error);
      throw error;
    }
  }
}

module.exports = { GameLauncher };
