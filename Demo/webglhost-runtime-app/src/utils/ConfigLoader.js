/**
 * ConfigLoader - 配置加载器
 * 
 * 负责加载和解析配置文件
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');

class ConfigLoader {
  constructor() {
    this.supportedFormats = ['.json', '.yaml', '.yml', '.js'];
  }

  /**
   * 加载配置文件
   * @param {string} configPath - 配置文件路径
   * @returns {Object} 配置对象
   */
  load(configPath) {
    const ext = path.extname(configPath).toLowerCase();
    
    switch (ext) {
      case '.json':
        return this.loadJSON(configPath);
      case '.yaml':
      case '.yml':
        return this.loadYAML(configPath);
      case '.js':
        return this.loadJS(configPath);
      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }
  }

  /**
   * 加载JSON配置文件
   * @param {string} configPath - 配置文件路径
   * @returns {Object} 配置对象
   */
  loadJSON(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load JSON config file: ${error.message}`);
    }
  }

  /**
   * 加载YAML配置文件
   * @param {string} configPath - 配置文件路径
   * @returns {Object} 配置对象
   */
  loadYAML(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return yaml.parse(content);
    } catch (error) {
      throw new Error(`Failed to load YAML config file: ${error.message}`);
    }
  }

  /**
   * 加载JS配置文件
   * @param {string} configPath - 配置文件路径
   * @returns {Object} 配置对象
   */
  loadJS(configPath) {
    try {
      // 清除require缓存
      delete require.cache[require.resolve(configPath)];
      return require(configPath);
    } catch (error) {
      throw new Error(`Failed to load JS config file: ${error.message}`);
    }
  }

  /**
   * 保存配置文件
   * @param {string} configPath - 配置文件路径
   * @param {Object} config - 配置对象
   * @param {string} format - 文件格式
   */
  save(configPath, config, format = 'json') {
    const ext = path.extname(configPath).toLowerCase();
    
    switch (ext) {
      case '.json':
        return this.saveJSON(configPath, config);
      case '.yaml':
      case '.yml':
        return this.saveYAML(configPath, config);
      default:
        return this.saveJSON(configPath, config);
    }
  }

  /**
   * 保存JSON配置文件
   * @param {string} configPath - 配置文件路径
   * @param {Object} config - 配置对象
   */
  saveJSON(configPath, config) {
    try {
      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(configPath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save JSON config file: ${error.message}`);
    }
  }

  /**
   * 保存YAML配置文件
   * @param {string} configPath - 配置文件路径
   * @param {Object} config - 配置对象
   */
  saveYAML(configPath, config) {
    try {
      const content = yaml.stringify(config);
      fs.writeFileSync(configPath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save YAML config file: ${error.message}`);
    }
  }

  /**
   * 合并配置
   * @param {Object} baseConfig - 基础配置
   * @param {Object} overrideConfig - 覆盖配置
   * @returns {Object} 合并后的配置
   */
  merge(baseConfig, overrideConfig) {
    return this.deepMerge(baseConfig, overrideConfig);
  }

  /**
   * 深度合并对象
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   * @returns {Object} 合并后的对象
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * 验证配置文件
   * @param {Object} config - 配置对象
   * @returns {boolean} 是否有效
   */
  validate(config) {
    const requiredFields = ['sdkKey', 'sdkSecret'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }
    
    return true;
  }

  /**
   * 创建默认配置
   * @returns {Object} 默认配置对象
   */
  createDefaultConfig() {
    return {
      sdk: {
        key: process.env.WEBGLHOST_SDK_KEY || '',
        secret: process.env.WEBGLHOST_SDK_SECRET || ''
      },
      app: {
        debug: false,
        mute: false,
        transparent: true,
        maxInstances: 1,
        userId: process.env.WEBGLHOST_USER_ID || 'tuanjie'
      },
      network: {
        timeout: 30000,
        retryCount: 3
      },
      logging: {
        level: 'info',
        file: './logs/app.log'
      }
    };
  }

  /**
   * 查找配置文件
   * @param {string} searchPath - 搜索路径
   * @returns {string|null} 配置文件路径
   */
  findConfigFile(searchPath = process.cwd()) {
    const configNames = [
      'webglhost.config.json',
      'webglhost.config.yaml',
      'webglhost.config.yml',
      'webglhost.config.js',
      '.webglhostrc.json',
      '.webglhostrc.yaml',
      '.webglhostrc.yml',
      '.webglhostrc.js'
    ];
    
    for (const configName of configNames) {
      const configPath = path.join(searchPath, configName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }

  /**
   * 获取配置文件的绝对路径
   * @param {string} configPath - 配置文件路径
   * @returns {string} 绝对路径
   */
  resolveConfigPath(configPath) {
    if (path.isAbsolute(configPath)) {
      return configPath;
    }
    
    return path.resolve(process.cwd(), configPath);
  }
}

module.exports = { ConfigLoader }; 