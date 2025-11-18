/**
 * ConsoleUI - 控制台界面
 * 
 * 负责命令行用户界面、进度显示、状态信息输出
 */

class ConsoleUI {
  constructor() {
    this.spinner = null;
  }

  /**
   * 显示应用横幅
   */
  showBanner() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    WebGLHost Runtime App                     ║
║                 Command Line Game Host                       ║
║                        v1.0.0                               ║
╚══════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * 显示信息
   * @param {string} message - 信息内容
   * @param {...any} args - 额外参数
   */
  showInfo(message, ...args) {
    console.log(` ${message}`, ...args);
  }

  /**
   * 显示成功信息
   * @param {string} message - 信息内容
   * @param {...any} args - 额外参数
   */
  showSuccess(message, ...args) {
    console.log(` ${message}`, ...args);
  }

  /**
   * 显示警告信息
   * @param {string} message - 信息内容
   * @param {...any} args - 额外参数
   */
  showWarning(message, ...args) {
    console.log(` ${message}`, ...args);
  }

  /**
   * 显示错误信息
   * @param {string} message - 信息内容
   * @param {...any} args - 额外参数
   */
  showError(message, ...args) {
    console.error(` ${message}`, ...args);
  }

  /**
   * 显示调试信息
   * @param {string} message - 信息内容
   * @param {...any} args - 额外参数
   */
  showDebug(message, ...args) {
    console.log(` ${message}`, ...args);
  }

  /**
   * 显示进度
   * @param {string} text - 进度文本
   */
  showProgress(text) {
    console.log(` ${text}`);
  }

  /**
   * 更新进度
   * @param {string} text - 进度文本
   */
  updateProgress(text) {
    console.log(` ${text}`);
  }

  /**
   * 停止进度
   * @param {string} text - 停止文本
   */
  stopProgress(text = '') {
    if (text) {
      console.log(` ${text}`);
    }
  }

  /**
   * 显示游戏信息
   * @param {RuntimeGameHandle} gameHandle - 游戏句柄
   */
  showGameInfo(gameHandle) {
    const info = gameHandle.getInfo();
    const gameState = gameHandle.getGameState();
    const isMuted = gameHandle.isMuted();
    
    console.log('\n Game Information:');
    console.log(`   State: ${gameState}`);
    console.log(`   Audio: ${isMuted ? 'Muted' : 'Unmuted'}`);
    console.log(`   Memory: ${this.formatMemory(process.memoryUsage())}`);
    console.log(`   Uptime: ${this.formatUptime(process.uptime())}`);
  }

  /**
   * 显示游戏状态表格
   * @param {Array} gameStatuses - 游戏状态数组
   */
  showGameStatusTable(gameStatuses) {
    if (gameStatuses.length === 0) {
      console.log('\n No active games');
      return;
    }
    
    console.log('\n Active Games:');
    console.log('┌─────────────┬──────────┬─────────┬─────────┐');
    console.log('│ Game ID     │ State    │ Audio   │ Memory  │');
    console.log('├─────────────┼──────────┼─────────┼─────────┤');
    
    gameStatuses.forEach(status => {
      const gameId = status.gameId.padEnd(11);
      const state = status.state.padEnd(8);
      const audio = status.isMuted ? 'Muted'.padEnd(7) : 'Unmuted'.padEnd(7);
      const memory = this.formatMemoryShort(process.memoryUsage());
      
      console.log(`│ ${gameId} │ ${state} │ ${audio} │ ${memory} │`);
    });
    
    console.log('└─────────────┴──────────┴─────────┴─────────┘');
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('\n📖 Usage Examples:');
    console.log(`
  # 启动本地游戏测试
  npm run test:local

  # 使用配置文件启动
  node src/index.js --config config/local-test.json

  # 直接指定参数
  node src/index.js --game-id my-game --sdk-key key --sdk-secret secret

  # 启用调试模式
  node src/index.js --config config/local-test.json --debug

  # 设置日志级别
  node src/index.js --config config/local-test.json --log-level debug
    `);
  }

  /**
   * 显示配置信息
   * @param {Object} config - 配置对象
   */
  showConfig(config) {
    console.log('\n  Configuration:');
    console.log(`
  Game ID: ${config.gameId || 'Not set'}
  SDK Key: ${config.sdkKey ? '***' + config.sdkKey.slice(-4) : 'Not set'}
  User ID: ${config.userId || 'Not set'}
  Debug: ${config.debug ? 'Enabled' : 'Disabled'}
  Log Level: ${config.logLevel || 'info'}
  Instances: ${config.instances || 1}
    `);
  }

  /**
   * 获取状态颜色
   * @param {string} state - 状态
   * @returns {Function} 颜色函数
   */
  getStateColor(state) {
    switch (state) {
      case 'running':
        return (text) => text;
      case 'paused':
        return (text) => text;
      case 'stopped':
        return (text) => text;
      case 'error':
        return (text) => text;
      default:
        return (text) => text;
    }
  }

  /**
   * 格式化内存使用量
   * @param {Object} memoryUsage - 内存使用对象
   * @returns {string} 格式化后的内存字符串
   */
  formatMemory(memoryUsage) {
    const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
    return `RSS: ${mb(memoryUsage.rss)}MB, Heap: ${mb(memoryUsage.heapUsed)}MB/${mb(memoryUsage.heapTotal)}MB`;
  }

  /**
   * 格式化内存使用量（简短）
   * @param {Object} memoryUsage - 内存使用对象
   * @returns {string} 格式化后的内存字符串
   */
  formatMemoryShort(memoryUsage) {
    const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
    return `${mb(memoryUsage.heapUsed)}MB`;
  }

  /**
   * 格式化运行时间
   * @param {number} uptime - 运行时间（秒）
   * @returns {string} 格式化后的时间字符串
   */
  formatUptime(uptime) {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 显示分隔线
   * @param {string} text - 分隔线文本
   */
  showSeparator(text = '') {
    const line = '─'.repeat(50);
    if (text) {
      console.log(`\n${text}`);
      console.log(line);
    } else {
      console.log(line);
    }
  }

  /**
   * 显示表格
   * @param {Array} headers - 表头
   * @param {Array} rows - 数据行
   */
  showTable(headers, rows) {
    if (rows.length === 0) {
      console.log('No data to display');
      return;
    }
    
    // 计算列宽
    const columnWidths = headers.map((header, index) => {
      const maxWidth = Math.max(
        header.length,
        ...rows.map(row => String(row[index] || '').length)
      );
      return Math.min(maxWidth, 30); // 限制最大宽度
    });
    
    // 生成分隔线
    const separator = '─'.repeat(columnWidths.reduce((sum, width) => sum + width + 3, 0));
    
    // 显示表头
    const headerLine = headers.map((header, index) => 
      String(header).padEnd(columnWidths[index])
    ).join(' │ ');
    console.log(headerLine);
    console.log(separator);
    
    // 显示数据行
    rows.forEach(row => {
      const dataLine = row.map((cell, index) => 
        String(cell || '').padEnd(columnWidths[index])
      ).join(' │ ');
      console.log(dataLine);
    });
  }
}

module.exports = { ConsoleUI }; 