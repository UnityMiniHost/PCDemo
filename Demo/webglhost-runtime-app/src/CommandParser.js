/**
 * CommandParser - 命令行参数解析器
 * 
 * 负责解析命令行参数、加载配置文件、验证参数有效性
 */

const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const { ConfigLoader } = require('./utils/ConfigLoader');
const { Validator } = require('./utils/Validator');

class CommandParser {
  constructor() {
    this.program = program;
    this.setupCommands();
  }

  /**
   * 设置命令行参数
   */
  setupCommands() {
    this.program
      .name('webglhost-runtime-app')
      .description('WebGLHost Runtime App - Command line WebGL game host application')
      .version('1.0.0')
      
      // 游戏相关参数
      .option('-k, --launch-key <value>', 'Game launch key (required)')  
      .option('-g, --game-id <value>', 'Game ID')
      .option('-u, --game-url <value>', 'Game URL or path')
      .option('--games <json>', 'JSON array of games to launch')
      
      // 配置相关参数
      .option('-c, --config <path>', 'Configuration file path')
      .option('--sdk-key <key>', 'SDK key')
      .option('--sdk-secret <secret>', 'SDK secret')
      .option('--user-id <userId>', 'User ID')
      .option('--access-token <token>', 'Access token', '')
      
      // 功能开关
      .option('--enable-debug', 'Enable debug mode')
      .option('--mute', 'Enable mute mode')
      .option('--transparent', 'Enable transparent mode')
      .option('--dev-mode', 'Enable developer mode (skip SDK validation)')
      
      // 实例管理
      .option('-i, --instances <number>', 'Maximum game instances', '10')
      
      // 日志相关
      .option('--log-level <level>', 'Log level (error, warn, info, debug)', 'info')
      .option('--log-file <path>', 'Log file path')
      
      // 网络相关
      .option('--timeout <ms>', 'Network timeout in milliseconds', '30000')
      .option('--retry-count <number>', 'Network retry count', '3')
      
      // 帮助和版本
      .option('-h, --help', 'Display help information')
      .option('-v, --version', 'Display version information');
  }

  /**
   * 解析命令行参数
   * @param {Array} argv - 命令行参数数组
   * @returns {Object} 解析后的选项对象
   */
  parse(argv) {
    // 先加载默认配置作为基础
    const defaultOptions = this.loadConfig();

    // 解析命令行参数
    this.program.parse(argv);
    const cliOptions = this.program.opts();
    
    // Parse multi-game JSON if provided (unified method)
    this._parseGamesArray(cliOptions);
    
    // 手动修复commander.js的kebab-case到camelCase映射问题
    if (cliOptions['game-id'] && !cliOptions.gameId) {
      cliOptions.gameId = cliOptions['game-id'];
    }
    if (cliOptions['launch-key'] && !cliOptions.launchKey) {
      cliOptions.launchKey = cliOptions['launch-key'];
    }
    if (cliOptions['game-url'] && !cliOptions.gameUrl) {
      cliOptions.gameUrl = cliOptions['game-url'];
    }
    if (cliOptions['access-token'] && !cliOptions.accessToken) {
      cliOptions.accessToken = cliOptions['access-token'];
    }
    if (cliOptions['enable-debug'] && !cliOptions.enableDebug) {
      cliOptions.debug = cliOptions['enable-debug'];
    }
    if (cliOptions.enableDebug) {
      cliOptions.debug = cliOptions.enableDebug;
    }
    
    // 合并默认配置和命令行参数
    const options = Object.assign({}, defaultOptions, cliOptions);

    // 加载配置文件（如果指定了--config参数）
    if (options.config) {
      const configOptions = this.loadConfigFile(options.config);
      // 配置文件的优先级：默认配置 < 配置文件 < 命令行参数
      Object.assign(options, defaultOptions, configOptions, cliOptions);
      // Ensure games from config are parsed (using unified method)
      this._parseGamesArray(options);
    }

    // 处理 accessToken 的优先级：命令行参数 > 配置文件 > 默认配置
    this.handleAccessTokenPriority(options, cliOptions, options.config ? this.loadConfigFile(options.config) : {});

    // 验证参数
    this.validateOptions(options);
    
    // 转换参数类型
    this.convertOptions(options);
    
    return options;
  }

  /**
   * 处理 accessToken 的优先级
   * @param {Object} options - 最终选项对象
   * @param {Object} cliOptions - 命令行选项
   * @param {Object} configOptions - 配置文件选项
   */
  handleAccessTokenPriority(options, cliOptions, configOptions) {
    // 检查命令行是否传入了 accessToken
    if (cliOptions.accessToken && cliOptions.accessToken.trim() !== '') {
      // 命令行传入了 accessToken，使用命令行的值
      options.accessToken = cliOptions.accessToken;
      console.log('Using accessToken from command line arguments');
    } else if (configOptions.accessToken && configOptions.accessToken.trim() !== '') {
      // 命令行没有传入 accessToken，但配置文件中有，使用配置文件的值
      options.accessToken = configOptions.accessToken;
      console.log('Using accessToken from config file');
    } else {
      // 都没有，使用默认配置中的值（可能来自环境变量）
      console.log('Using accessToken from default config (environment variable or empty)');
    }
    
    console.log('Final accessToken source determined:', options.accessToken ? 'Set' : 'Not set');
  }

  /**
   * 加载配置文件
   * @param {string} configPath - 配置文件路径
   * @returns {Object} 配置选项
   */
  loadConfigFile(configPath) {
    try {
      const absolutePath = path.resolve(configPath);
      
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Configuration file not found: ${absolutePath}`);
      }
      
      const configLoader = new ConfigLoader();
      return configLoader.load(absolutePath);
    } catch (error) {
      console.warn(`Warning: Failed to load config file "${configPath}":`, error.message);
      return {};
    }
  }

  /**
   * 加载默认配置
   * @returns {Object} 默认配置选项
   */
  loadConfig() {
    const defaultConfigPath = path.join(__dirname, '../config/development.json');
    
    try {
      if (fs.existsSync(defaultConfigPath)) {
        const configLoader = new ConfigLoader();
        return configLoader.load(defaultConfigPath);
      }
    } catch (error) {
      console.warn('Warning: Failed to load default config:', error.message);
    }
    
    return {
      debug: false,
      devMode: false,
      mute: false,
      transparent: true,
      instances: 1,
      logLevel: 'info',
      timeout: 30000,
      retryCount: 3,
      sdkKey: process.env.WEBGLHOST_SDK_KEY || '',
      sdkSecret: process.env.WEBGLHOST_SDK_SECRET || '',
      userId: process.env.WEBGLHOST_USER_ID || 'tuanjie',
      accessToken: process.env.WEBGLHOST_ACCESS_TOKEN || ''
    };
  }

  /**
   * 验证参数有效性
   * @param {Object} options - 选项对象
   */
  validateOptions(options) {
    const validator = new Validator();
    
    // 验证必要参数（单游戏或多游戏二选一）- 现在launch-key不再是必须的
    const hasMulti = Array.isArray(options.games) && options.games.length > 0;
    const hasLaunchKey = !!options.launchKey;
    const hasGameUrl = !!options.gameUrl;
    
    // 如果没有提供任何游戏启动参数，允许启动（将显示游戏列表）
    if (!hasMulti && !hasLaunchKey && !hasGameUrl) {
      // 允许无参数启动，将显示游戏列表
      console.log('No game parameters provided, will show game list');
      return;
    }
    
    // 如果提供了多游戏参数，验证每个游戏的launchKey
    if (hasMulti) {
      for (const [idx, g] of options.games.entries()) {
        if (!g || !g.launchKey) {
          throw new Error(`--games[${idx}].launchKey is required`);
        }
      }
    }
    
    // 验证SDK配置 - 对于本地测试模式或devMode放宽要求
    const isLocalTest = options.gameUrl && (options.gameUrl.startsWith('./') || options.gameUrl.startsWith('./assets'));
    if (!isLocalTest && !options.devMode && (!options.sdkKey || !options.sdkSecret)) {
      throw new Error('SDK key and secret are required (use --sdk-key and --sdk-secret or set environment variables)');
    }
    
    // 验证数值参数
    if (options.instances && !validator.isPositiveInteger(options.instances)) {
      throw new Error('--instances must be a positive integer');
    }
    
    if (options.timeout && !validator.isPositiveInteger(options.timeout)) {
      throw new Error('--timeout must be a positive integer');
    }
    
    if (options.retryCount && !validator.isPositiveInteger(options.retryCount)) {
      throw new Error('--retry-count must be a positive integer');
    }
    
    // 验证日志级别
    if (options.logLevel && !validator.isValidLogLevel(options.logLevel)) {
      throw new Error('--log-level must be one of: error, warn, info, debug');
    }
  }

  /**
   * 转换参数类型
   * @param {Object} options - 选项对象
   */
  convertOptions(options) {
    // 转换数值类型
    if (options.instances) {
      options.instances = parseInt(options.instances, 10);
    }
    
    if (options.timeout) {
      options.timeout = parseInt(options.timeout, 10);
    }
    
    if (options.retryCount) {
      options.retryCount = parseInt(options.retryCount, 10);
    }
    
    // 转换布尔类型
    options.debug = !!options.debug;
    options.mute = !!options.mute;
    options.transparent = !!options.transparent;
    options.help = !!options.help;
    options.version = !!options.version;
    options.devMode = !!options.devMode;
    // 规范化 games 数组
    if (options.games && Array.isArray(options.games)) {
      options.games = options.games.map(g => ({
        launchKey: g.launchKey,
        accessToken: g.accessToken,
        userId: g.userId
      }));
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    this.program.help();
  }

  /**
   * 显示版本信息
   */
  showVersion() {
    const packageJson = require('../package.json');
    console.log(`WebGLHost Runtime App v${packageJson.version}`);
  }

  /**
   * 获取帮助文本
   * @returns {string} 帮助文本
   */
  getHelpText() {
    return this.program.helpInformation();
  }

  /**
   * Parse games array from JSON string (unified method to avoid duplication)
   * @param {Object} options - Options object that may contain games property
   * @private
   */
  _parseGamesArray(options) {
    if (options.games && typeof options.games === 'string') {
      try {
        options.games = JSON.parse(options.games);
      } catch (e) {
        throw new Error('games parameter must be a valid JSON array: ' + e.message);
      }
    }
  }

  /**
   * 验证配置文件
   * @param {string} configPath - 配置文件路径
   * @returns {boolean} 是否有效
   */
  validateConfigFile(configPath) {
    try {
      const config = this.loadConfigFile(configPath);
      this.validateOptions(config);
      return true;
    } catch (error) {
      console.error('Config validation failed:', error.message);
      return false;
    }
  }
}

module.exports = { CommandParser }; 