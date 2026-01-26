/**
 * Validator - 参数验证器
 * 
 * 负责验证命令行参数和配置的有效性
 */

class Validator {
  constructor() {
    this.validLogLevels = ['error', 'warn', 'info', 'debug', 'trace'];
  }

  /**
   * 验证是否为正整数
   * @param {any} value - 要验证的值
   * @returns {boolean} 是否为正整数
   */
  isPositiveInteger(value) {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
  }

  /**
   * 验证是否为非负整数
   * @param {any} value - 要验证的值
   * @returns {boolean} 是否为非负整数
   */
  isNonNegativeInteger(value) {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0 && Number.isInteger(num);
  }

  /**
   * 验证是否为有效数字
   * @param {any} value - 要验证的值
   * @returns {boolean} 是否为有效数字
   */
  isValidNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }

  /**
   * 验证是否为有效字符串
   * @param {any} value - 要验证的值
   * @param {number} minLength - 最小长度
   * @param {number} maxLength - 最大长度
   * @returns {boolean} 是否为有效字符串
   */
  isValidString(value, minLength = 0, maxLength = Infinity) {
    return typeof value === 'string' && 
           value.length >= minLength && 
           value.length <= maxLength;
  }

  /**
   * 验证是否为有效布尔值
   * @param {any} value - 要验证的值
   * @returns {boolean} 是否为有效布尔值
   */
  isValidBoolean(value) {
    return typeof value === 'boolean';
  }

  /**
   * 验证是否为有效日志级别
   * @param {string} level - 日志级别
   * @returns {boolean} 是否为有效日志级别
   */
  isValidLogLevel(level) {
    return this.validLogLevels.includes(level);
  }

  /**
   * 验证是否为有效游戏ID
   * @param {string} gameId - 游戏ID
   * @returns {boolean} 是否为有效游戏ID
   */
  isValidGameId(gameId) {
    return this.isValidString(gameId, 1, 100) && /^[a-zA-Z0-9_-]+$/.test(gameId);
  }

  /**
   * 验证是否为有效启动键
   * @param {string} launchKey - 启动键
   * @returns {boolean} 是否为有效启动键
   */
  isValidLaunchKey(launchKey) {
    return this.isValidString(launchKey, 1, 500);
  }

  /**
   * 验证是否为有效SDK密钥
   * @param {string} sdkKey - SDK密钥
   * @returns {boolean} 是否为有效SDK密钥
   */
  isValidSdkKey(sdkKey) {
    return this.isValidString(sdkKey, 10, 100);
  }

  /**
   * 验证是否为有效用户ID
   * @param {string} userId - 用户ID
   * @returns {boolean} 是否为有效用户ID
   */
  isValidUserId(userId) {
    return this.isValidString(userId, 1, 50);
  }

  /**
   * 验证是否为有效文件路径
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否为有效文件路径
   */
  isValidFilePath(filePath) {
    return this.isValidString(filePath, 1, 500) && 
           !filePath.includes('..') && 
           !filePath.includes('//');
  }

  /**
   * 验证是否为有效URL
   * @param {string} url - URL
   * @returns {boolean} 是否为有效URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证是否为有效端口号
   * @param {any} port - 端口号
   * @returns {boolean} 是否为有效端口号
   */
  isValidPort(port) {
    const num = parseInt(port, 10);
    return !isNaN(num) && num >= 1 && num <= 65535 && Number.isInteger(num);
  }

  /**
   * 验证是否为有效超时时间
   * @param {any} timeout - 超时时间（毫秒）
   * @returns {boolean} 是否为有效超时时间
   */
  isValidTimeout(timeout) {
    const num = parseInt(timeout, 10);
    return !isNaN(num) && num >= 1000 && num <= 300000 && Number.isInteger(num);
  }

  /**
   * 验证是否为有效重试次数
   * @param {any} retryCount - 重试次数
   * @returns {boolean} 是否为有效重试次数
   */
  isValidRetryCount(retryCount) {
    const num = parseInt(retryCount, 10);
    return !isNaN(num) && num >= 0 && num <= 10 && Number.isInteger(num);
  }

  /**
   * 验证是否为有效实例数量
   * @param {any} instances - 实例数量
   * @returns {boolean} 是否为有效实例数量
   */
  isValidInstanceCount(instances) {
    const num = parseInt(instances, 10);
    return !isNaN(num) && num >= 1 && num <= 10 && Number.isInteger(num);
  }

  /**
   * 验证配置对象
   * @param {Object} config - 配置对象
   * @returns {Object} 验证结果
   */
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    // 验证必要字段
    if (!config.sdkKey) {
      errors.push('SDK key is required');
    } else if (!this.isValidSdkKey(config.sdkKey)) {
      errors.push('Invalid SDK key format');
    }

    if (!config.sdkSecret) {
      errors.push('SDK secret is required');
    } else if (!this.isValidSdkKey(config.sdkSecret)) {
      errors.push('Invalid SDK secret format');
    }

    // 验证可选字段
    if (config.gameId && !this.isValidGameId(config.gameId)) {
      errors.push('Invalid game ID format');
    }

    if (config.launchKey && !this.isValidLaunchKey(config.launchKey)) {
      errors.push('Invalid launch key format');
    }

    if (config.userId && !this.isValidUserId(config.userId)) {
      warnings.push('Invalid user ID format');
    }

    if (config.instances && !this.isValidInstanceCount(config.instances)) {
      errors.push('Invalid instance count (must be 1-10)');
    }

    if (config.timeout && !this.isValidTimeout(config.timeout)) {
      errors.push('Invalid timeout value (must be 1000-300000ms)');
    }

    if (config.retryCount && !this.isValidRetryCount(config.retryCount)) {
      errors.push('Invalid retry count (must be 0-10)');
    }

    if (config.logLevel && !this.isValidLogLevel(config.logLevel)) {
      errors.push('Invalid log level');
    }

    if (config.logFile && !this.isValidFilePath(config.logFile)) {
      warnings.push('Invalid log file path');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证命令行选项
   * @param {Object} options - 命令行选项
   * @returns {Object} 验证结果
   */
  validateOptions(options) {
    const errors = [];
    const warnings = [];

    // 验证必要参数
    if (!options.launchKey) {
      errors.push('--launch-key is required');
    } else if (!this.isValidLaunchKey(options.launchKey)) {
      errors.push('Invalid launch key format');
    }

    if (!options.sdkKey) {
      errors.push('SDK key is required (use --sdk-key or set WEBGLHOST_SDK_KEY environment variable)');
    } else if (!this.isValidSdkKey(options.sdkKey)) {
      errors.push('Invalid SDK key format');
    }

    if (!options.sdkSecret) {
      errors.push('SDK secret is required (use --sdk-secret or set WEBGLHOST_SDK_SECRET environment variable)');
    } else if (!this.isValidSdkKey(options.sdkSecret)) {
      errors.push('Invalid SDK secret format');
    }

    // 验证可选参数
    if (options.userId && !this.isValidUserId(options.userId)) {
      warnings.push('Invalid user ID format');
    }

    if (options.instances && !this.isValidInstanceCount(options.instances)) {
      errors.push('Invalid instance count (must be 1-10)');
    }

    if (options.timeout && !this.isValidTimeout(options.timeout)) {
      errors.push('Invalid timeout value (must be 1000-300000ms)');
    }

    if (options.retryCount && !this.isValidRetryCount(options.retryCount)) {
      errors.push('Invalid retry count (must be 0-10)');
    }

    if (options.logLevel && !this.isValidLogLevel(options.logLevel)) {
      errors.push('Invalid log level');
    }

    if (options.logFile && !this.isValidFilePath(options.logFile)) {
      warnings.push('Invalid log file path');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 清理和标准化配置
   * @param {Object} config - 配置对象
   * @returns {Object} 清理后的配置
   */
  sanitizeConfig(config) {
    const sanitized = { ...config };

    // 清理字符串字段
    if (sanitized.gameId) {
      sanitized.gameId = sanitized.gameId.trim();
    }

    if (sanitized.launchKey) {
      sanitized.launchKey = sanitized.launchKey.trim();
    }

    if (sanitized.userId) {
      sanitized.userId = sanitized.userId.trim();
    }

    if (sanitized.sdkKey) {
      sanitized.sdkKey = sanitized.sdkKey.trim();
    }

    if (sanitized.sdkSecret) {
      sanitized.sdkSecret = sanitized.sdkSecret.trim();
    }

    // 转换数值字段
    if (sanitized.instances) {
      sanitized.instances = parseInt(sanitized.instances, 10);
    }

    if (sanitized.timeout) {
      sanitized.timeout = parseInt(sanitized.timeout, 10);
    }

    if (sanitized.retryCount) {
      sanitized.retryCount = parseInt(sanitized.retryCount, 10);
    }

    // 转换布尔字段
    sanitized.debug = !!sanitized.debug;
    sanitized.mute = !!sanitized.mute;
    sanitized.transparent = !!sanitized.transparent;

    return sanitized;
  }
}

module.exports = { Validator }; 