/**
 * Logger - 日志工具类
 * 
 * 负责日志记录和格式化输出
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

class Logger {
  constructor(level = 'info', logFile = null) {
    this.level = level;
    this.logFile = logFile;
    this.logger = this.createLogger();
    
    // Auto-cleanup on initialization if logging to file
    if (this.logFile) {
      this.autoCleanup();
    }
  }

  /**
   * 创建日志记录器
   * @returns {winston.Logger} Winston日志记录器
   */
  createLogger() {
    // Custom timestamp format for local time
    const localTimestamp = winston.format.timestamp({
      format: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms}`;
      }
    });

    const transports = [
      new winston.transports.Console({
        level: this.level,
        format: winston.format.combine(
          localTimestamp,
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
      })
    ];

    // 如果指定了日志文件，添加文件传输
    if (this.logFile) {
      // 确保日志目录存在
      const logDir = path.dirname(this.logFile);
      fs.ensureDirSync(logDir);

      transports.push(
        new winston.transports.File({
          filename: this.logFile,
          level: this.level,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          format: winston.format.combine(
            localTimestamp,
            winston.format.errors({ stack: true }), // Include stack traces
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              const stackStr = stack ? `\n${stack}` : '';
              return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}${stackStr}`;
            })
          )
        })
      );
    }

    return winston.createLogger({
      level: this.level,
      transports,
      exitOnError: false
    });
  }

  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  error(message, ...args) {
    this.logger.error(message, ...args);
  }

  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  warn(message, ...args) {
    this.logger.warn(message, ...args);
  }

  /**
   * 记录信息日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  info(message, ...args) {
    this.logger.info(message, ...args);
  }

  /**
   * 记录调试日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  debug(message, ...args) {
    this.logger.debug(message, ...args);
  }

  /**
   * 记录跟踪日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  trace(message, ...args) {
    this.logger.silly(message, ...args);
  }

  /**
   * 记录性能日志
   * @param {string} operation - 操作名称
   * @param {number} duration - 持续时间（毫秒）
   * @param {Object} metadata - 元数据
   */
  performance(operation, duration, metadata = {}) {
    this.logger.info(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...metadata
    });
  }

  /**
   * 记录异常日志
   * @param {Error} error - 错误对象
   * @param {string} context - 上下文
   */
  exception(error, context = '') {
    this.logger.error(`Exception${context ? ` in ${context}` : ''}: ${error.message}`, {
      error: error.stack,
      context
    });
  }

  /**
   * 记录用户操作日志
   * @param {string} action - 操作名称
   * @param {Object} data - 操作数据
   */
  userAction(action, data = {}) {
    this.logger.info(`User Action: ${action}`, {
      action,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录网络请求日志
   * @param {string} method - HTTP方法
   * @param {string} url - 请求URL
   * @param {number} status - 响应状态码
   * @param {number} duration - 请求持续时间
   */
  networkRequest(method, url, status, duration) {
    this.logger.info(`Network Request: ${method} ${url}`, {
      method,
      url,
      status,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录游戏事件日志
   * @param {string} event - 事件名称
   * @param {Object} data - 事件数据
   */
  gameEvent(event, data = {}) {
    this.logger.info(`Game Event: ${event}`, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别
   */
  setLevel(level) {
    this.level = level;
    this.logger.level = level;
  }

  /**
   * 获取日志级别
   * @returns {string} 当前日志级别
   */
  getLevel() {
    return this.level;
  }

  /**
   * 获取日志统计信息
   * @returns {Object} 日志统计信息
   */
  getStats() {
    return {
      level: this.level,
      logFile: this.logFile,
      transports: this.logger.transports.length
    };
  }

  /**
   * Auto-cleanup old log files on startup
   */
  autoCleanup() {
    // Run cleanup in background, don't block initialization
    setTimeout(() => {
      this.cleanup().catch(error => {
        console.warn('Auto log cleanup failed:', error.message);
      });
    }, 1000);
  }

  /**
   * 清理日志文件
   * @param {number} maxSize - 最大文件大小（字节）
   * @param {number} maxFiles - 最大文件数量
   */
  async cleanup(maxSize = 10 * 1024 * 1024, maxFiles = 5) {
    if (!this.logFile) {
      return;
    }

    try {
      const logDir = path.dirname(this.logFile);
      const logFiles = await fs.readdir(logDir);
      
      // 过滤日志文件
      const files = logFiles
        .filter(file => file.startsWith(path.basename(this.logFile, '.log')))
        .map(file => path.join(logDir, file))
        .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());

      // 删除超出数量限制的文件
      if (files.length > maxFiles) {
        for (let i = maxFiles; i < files.length; i++) {
          await fs.remove(files[i]);
        }
      }

      // 检查文件大小
      for (const file of files.slice(0, maxFiles)) {
        const stats = await fs.stat(file);
        if (stats.size > maxSize) {
          // 截断文件
          const content = await fs.readFile(file, 'utf8');
          const lines = content.split('\n');
          const keepLines = Math.floor(lines.length * 0.5); // 保留50%的内容
          await fs.writeFile(file, lines.slice(-keepLines).join('\n'));
        }
      }
    } catch (error) {
      this.error('Failed to cleanup log files:', error);
    }
  }

  /**
   * 打印日志 - 与 RuntimeLogger 的 printer 接口兼容
   * @param {string} level - 日志级别 ('debug', 'info', 'warning', 'error', 'fault')
   * @param {string} message - 日志消息
   */
  printLog(level, message) {
    // 映射日志级别到对应的方法
    switch (level.toLowerCase()) {
      case 'debug':
        this.debug(message);
        break;
      case 'info':
        this.info(message);
        break;
      case 'warning':
      case 'warn':
        this.warn(message);
        break;
      case 'error':
        this.error(message);
        break;
      case 'fault':
        this.error(`[FAULT] ${message}`);
        break;
      default:
        this.info(message);
    }
  }

  /**
   * 强制刷新日志缓冲区（用于确保关键日志立即写入）
   */
  flush() {
    if (this.logger && this.logger.transports) {
      this.logger.transports.forEach(transport => {
        if (transport.close) {
          // Force flush without closing
          if (transport._flush) {
            transport._flush();
          } else if (transport.stream && transport.stream.write) {
            // For file transports, ensure the stream is flushed
            if (transport.stream._flush) {
              transport.stream._flush();
            }
          }
        }
      });
    }
  }

  /**
   * 关闭日志记录器
   */
  close() {
    // Flush before closing
    this.flush();
    this.logger.close();
  }
}

module.exports = { Logger }; 