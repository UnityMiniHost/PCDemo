/**
 * GameManager - 游戏管理器
 * 
 * 负责游戏列表管理、状态跟踪和历史记录
 */

const { ConsoleUI } = require('./ConsoleUI');
const { Logger } = require('./utils/Logger');

class GameManager {
  constructor(options = {}) {
    this.options = options;
    this.consoleUI = new ConsoleUI();
    this.logger = new Logger(options.logLevel, options.logFile);
    this.gameList = [];
    this.gameHistory = [];
    this.isInitialized = false;
  }

  /**
   * 初始化游戏管理器
   */
  async initialize() {
    try {
      this.consoleUI.showInfo('Initializing game manager...');
      
      // 加载游戏历史记录
      await this.loadGameHistory();
      
      this.isInitialized = true;
      this.consoleUI.showSuccess('Game manager initialized successfully');
    } catch (error) {
      this.consoleUI.showError('Failed to initialize game manager:', error);
      throw error;
    }
  }

  /**
   * 获取游戏列表
   * @returns {Array} 游戏列表
   */
  async getGameList() {
    try {
      const remoteList = await this.fetchGameListFromApi().catch((e) => {
        this.logger.warn('Remote game list fetch failed: ', e && e.message);
        return null;
      });
     return remoteList || [];
    } catch (error) {
      this.consoleUI.showError('Failed to get game list:', error);
      throw error;
    }
  }

  async fetchGameListFromApi() {
    const axios = require('axios'); 
    const url = 'https://minihost.tuanjie.cn/api/game/list';
    const appId = '691ac9ef2dcfadc65a0fb4a6';
    const serviceToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBkN2EzMWRmLWJhYmEtNDQzZC1iNTk5LWQ4MDc5NThjZDc4ZCIsInBsYXRmb3JtU2VydmVySWQiOiI2OTFhY2IzOTJkY2ZhZGM2NWEwZmRmNGIifQ.h7W_ElOARDg9hwm3LXQ0L8NIX8BPsNmN8Zh5s5AAFwY';
    const resp = await axios.get(url, {
      headers: { Authorization: `Bearer ${serviceToken}` },
      params: { appId },
    });

    console.log(resp);

    if (!Array.isArray(resp.data)) {
      throw new Error('响应数据不是数组格式');
    }
    const gameList = resp.data;
    console.log(`✅ 接口请求成功！共返回 ${gameList.length} 款游戏`);
    return gameList;
  }

  /**
   * 获取游戏历史记录
   * @returns {Array} 游戏历史记录
   */
  getGameHistory() {
    return [...this.gameHistory];
  }

  /**
   * 添加游戏到历史记录
   * @param {string} gameId - 游戏ID
   * @param {string} launchKey - 启动键
   * @param {Object} metadata - 元数据
   */
  addToHistory(gameId, launchKey, metadata = {}) {
    const historyEntry = {
      gameId,
      launchKey,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    // 移除重复的历史记录
    this.gameHistory = this.gameHistory.filter(entry => 
      entry.gameId !== gameId || entry.launchKey !== launchKey
    );
    
    // 添加到开头
    this.gameHistory.unshift(historyEntry);
    
    // 限制历史记录数量
    if (this.gameHistory.length > 100) {
      this.gameHistory = this.gameHistory.slice(0, 100);
    }
    
    // 保存历史记录
    this.saveGameHistory();
  }

  /**
   * 清除游戏历史记录
   */
  clearHistory() {
    this.gameHistory = [];
    this.saveGameHistory();
    this.consoleUI.showInfo('Game history cleared');
  }

  /**
   * 搜索游戏
   * @param {string} query - 搜索查询
   * @returns {Array} 搜索结果
   */
  searchGames(query) {
    if (!query || query.trim() === '') {
      return this.gameList;
    }
    
    const searchTerm = query.toLowerCase();
    return this.gameList.filter(game => 
      game.id.toLowerCase().includes(searchTerm) ||
      (game.name && game.name.toLowerCase().includes(searchTerm)) ||
      (game.briefIntro && game.briefIntro.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * 获取游戏详情
   * @param {string} gameId - 游戏ID
   * @returns {Object|null} 游戏详情
   */
  getGameDetails(gameId) {
    return this.gameList.find(game => game.id === gameId) || null;
  }

  /**
   * 获取最近游玩的游戏
   * @param {number} limit - 限制数量
   * @returns {Array} 最近游玩的游戏
   */
  getRecentGames(limit = 10) {
    return this.gameHistory.slice(0, limit);
  }

  /**
   * 加载游戏历史记录
   */
  async loadGameHistory() {
    try {
      // 这里可以从文件或数据库加载历史记录
      // 目前使用内存存储
      this.gameHistory = [];
    } catch (error) {
      this.logger.warn('Failed to load game history:', error);
      this.gameHistory = [];
    }
  }

  /**
   * 保存游戏历史记录
   */
  async saveGameHistory() {
    try {
      // 这里可以保存到文件或数据库
      // 目前使用内存存储
      this.logger.debug('Game history saved');
    } catch (error) {
      this.logger.error('Failed to save game history:', error);
    }
  }

  /**
   * 获取模拟游戏列表
   * @returns {Array} 模拟游戏列表
   */
  getMockGameList() {
    return [
      {
        id: 'game1',
        name: 'Test Game 1',
        iconUrl: 'https://example.com/icon1.png',
        briefIntro: 'A test game for development',
        launchKey: 'test-launch-key-1',
        versionId: 'v1.0.0',
        tags: ['test', 'development']
      },
      {
        id: 'game2',
        name: 'Test Game 2',
        iconUrl: 'https://example.com/icon2.png',
        briefIntro: 'Another test game',
        launchKey: 'test-launch-key-2',
        versionId: 'v1.0.0',
        tags: ['test', 'demo']
      },
      {
        id: 'game3',
        name: 'Demo Game',
        iconUrl: 'https://example.com/icon3.png',
        briefIntro: 'A demo game for showcase',
        launchKey: 'demo-launch-key',
        versionId: 'v1.0.0',
        tags: ['demo', 'showcase']
      }
    ];
  }

  /**
   * 更新游戏列表
   * @param {Array} gameList - 新的游戏列表
   */
  updateGameList(gameList) {
    this.gameList = gameList;
    this.logger.info(`Game list updated with ${gameList.length} games`);
  }

  /**
   * 获取游戏统计信息
   * @returns {Object} 游戏统计信息
   */
  getStats() {
    return {
      totalGames: this.gameList.length,
      historyCount: this.gameHistory.length,
      isInitialized: this.isInitialized
    };
  }

  /**
   * 关闭游戏管理器
   */
  async shutdown() {
    try {
      this.consoleUI.showInfo('Shutting down game manager...');
      
      // 保存历史记录
      await this.saveGameHistory();
      
      this.isInitialized = false;
      this.consoleUI.showSuccess('Game manager shutdown successfully');
    } catch (error) {
      this.consoleUI.showError('Failed to shutdown game manager:', error);
      throw error;
    }
  }
}

module.exports = { GameManager };