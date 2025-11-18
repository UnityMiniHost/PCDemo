#!/usr/bin/env node

/**
 * WebGLHost Runtime App - 清理脚本
 * 
 * 跨平台清理脚本，删除构建产物和临时文件
 */

const fs = require('fs');
const path = require('path');

/**
 * 跨平台递归删除目录
 * @param {string} dirPath 要删除的目录路径
 * @param {number} retries 重试次数
 */
function removeDirectoryRecursive(dirPath, retries = 3) {
  if (!fs.existsSync(dirPath)) {
    return { success: false, reason: 'not_exists' };
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      // 在Windows上，文件可能被占用，等待一段时间后重试
      if (attempt < retries && (error.code === 'EBUSY' || error.code === 'ENOTEMPTY')) {
        console.log(`   ⏳ Attempt ${attempt}/${retries} failed (${error.code}), retrying in ${attempt * 500}ms...`);
        // 简单的等待实现
        const waitMs = attempt * 500;
        const start = Date.now();
        while (Date.now() - start < waitMs) {
          // 忙等待
        }
        continue;
      }
      
      // 如果是最后一次尝试或者是其他错误，尝试替代方法
      try {
        // 尝试手动递归删除
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              removeDirectoryRecursive(filePath, 1); // 子目录只尝试一次
            } else {
              fs.unlinkSync(filePath);
            }
          } catch (fileError) {
            // 忽略单个文件的错误，继续处理其他文件
          }
        }
        
        // 尝试删除目录本身
        try {
          fs.rmdirSync(dirPath);
          return { success: true };
        } catch (dirError) {
          return { success: false, reason: 'partial', error: dirError.message };
        }
      } catch (altError) {
        return { success: false, reason: 'failed', error: error.message };
      }
    }
  }
  
  return { success: false, reason: 'retries_exhausted' };
}

/**
 * 清理函数
 */
function clean() {
  console.log('🧹 Cleaning build artifacts...');
  
  // 要清理的目录列表
  const cleanDirs = ['logs', 'dist', 'build'];
  let cleanedCount = 0;
  let partialCount = 0;
  
  for (const dir of cleanDirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      const result = removeDirectoryRecursive(dirPath);
      if (result.success) {
        console.log(`   ✅ Cleaned ${dir}/`);
        cleanedCount++;
      } else if (result.reason === 'partial') {
        console.log(`   ⚠️ Partially cleaned ${dir}/ (some files may be in use)`);
        partialCount++;
      } else {
        console.log(`   ❌ Failed to clean ${dir}/: ${result.error || result.reason}`);
      }
    } else {
      console.log(`   ⏭️ ${dir}/ does not exist, skipping`);
    }
  }
  
  if (partialCount > 0) {
    console.log(`✅ Clean completed. ${cleanedCount}/${cleanDirs.length} directories fully cleaned, ${partialCount} partially cleaned.`);
    console.log('💡 Some files may be in use by running processes. This is normal on Windows.');
  } else {
    console.log(`✅ Clean completed. ${cleanedCount}/${cleanDirs.length} directories cleaned.`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  clean();
}

module.exports = { clean, removeDirectoryRecursive };