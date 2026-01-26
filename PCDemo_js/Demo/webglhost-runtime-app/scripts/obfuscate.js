#!/usr/bin/env node

/**
 * WebGLHost Runtime App - 源码混淆脚本
 * 
 * 在构建前对源码进行混淆处理，保护知识产权
 */

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// 配置项
const OBFUSCATION_CONFIG = {
  // 字符串数组配置
  stringArray: true,
  stringArrayThreshold: 0.8,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 3,
  stringArrayWrappersChainedCalls: true,
  
  // 变量名混淆
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  renameProperties: false,
  
  // 控制流平坦化 - 降低强度避免运行时错误
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  
  // 死代码注入 - 降低强度避免运行时错误
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  
  // 调试保护 - 在生产环境中禁用，避免闪退
  debugProtection: false,
  debugProtectionInterval: 0,
  
  // 禁用控制台输出 - 在生产环境中禁用，避免运行时错误
  disableConsoleOutput: false,
  
  // 保留的标识符
  reservedNames: [
    // Node.js 内置
    'require',
    'module', 
    'exports',
    '__dirname',
    '__filename',
    'Buffer',
    'process',
    'global',
    'console',
    
    // Electron 相关
    'app',
    'electron',
    'whenReady',
    'quit',
    'requestSingleInstanceLock',
    
    // WebGLHost 核心类名
    'WebGLHostRuntimeApp',
    'CommandParser',
    'GameLauncher',
    'GameManager',
    'ConsoleUI',
    'ConfigLoader',
    'Logger',
    'Validator',
    'cliMain',
    
    // 配置和常量
    'packageJson',
    'options',
    'config'
  ],
  
  // 保留的字符串
  reservedStrings: [
    'electron',
    'webglhost',
    'runtime',
    'game',
    'config',
    'NODE_ENV',
    'development',
    'production',
    'SIGINT',
    'SIGTERM'
  ],
  
  // 性能优化
  compact: true,
  simplify: true,
  numbersToExpressions: true,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  
  // 目标环境
  target: 'node'
};

// 需要混淆的文件夹
const SOURCE_DIRS = ['src'];

// 排除的文件/文件夹
const EXCLUDE_PATTERNS = [
  'node_modules',
  'test',
  'tests',
  '__tests__',
  'spec',
  'specs',
  '.test.js',
  '.spec.js',
  'test.js',
  'spec.js'
];

// 混淆输出目录（不修改原始src）
const OBFUSCATED_DIR = 'src-obfuscated';

console.log('🛡️ Starting source code obfuscation...');

/**
 * 检查文件是否应该被排除
 */
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * 递归获取所有JS文件
 */
function getJavaScriptFiles(dir, files = []) {
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!shouldExclude(fullPath)) {
        getJavaScriptFiles(fullPath, files);
      }
    } else if (path.extname(entry) === '.js' && !shouldExclude(fullPath)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 清理构建文件
 */
function cleanBuildFiles() {
  console.log('🧹 Cleaning build files...');
  
  const dirsToClean = [OBFUSCATED_DIR, 'src-original', 'src-temp-backup', 'temp-build-src'];
  const filesToClean = ['package.json.backup'];
  
  // 清理目录
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`🗑️ Cleaned: ${dir}/`);
    }
  }
  
  // 清理文件
  for (const file of filesToClean) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`🗑️ Cleaned: ${file}`);
    }
  }
  
  // src目录是原始源码目录，不需要清理
}

/**
 * 创建混淆输出目录
 */
function createObfuscatedDir() {
  console.log('📁 Creating obfuscated output directory...');
  
  if (fs.existsSync(OBFUSCATED_DIR)) {
    fs.rmSync(OBFUSCATED_DIR, { recursive: true, force: true });
  }
  
  // 复制src目录结构到混淆输出目录
  fs.cpSync('src', OBFUSCATED_DIR, { recursive: true });
  
  console.log(`✅ Obfuscated directory created: ${OBFUSCATED_DIR}/`);
}

/**
 * 准备构建源码 - 创建干净的目录结构
 */
function prepareBuildSource() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && fs.existsSync(OBFUSCATED_DIR)) {
    console.log('🔄 Preparing obfuscated source for production build...');
    
    // 备份原始 src 目录（如果还没有备份）
    const originalSrcBackup = 'src-original';
    if (!fs.existsSync(originalSrcBackup)) {
      console.log('📦 Backing up original src directory...');
      fs.cpSync('src', originalSrcBackup, { recursive: true });
      console.log('✅ Original src backed up to src-original');
    }
    
    // 临时重命名原始 src 目录
    const tempOriginalName = 'src-temp-backup';
    if (fs.existsSync('src')) {
      try {
        // 如果目标目录已存在，先删除它
        if (fs.existsSync(tempOriginalName)) {
          console.log('🗑️ Removing existing temp backup directory...');
          fs.rmSync(tempOriginalName, { recursive: true, force: true });
        }
        
        // 尝试重命名，如果失败则使用复制+删除的方式
        try {
          fs.renameSync('src', tempOriginalName);
          console.log('📁 Temporarily renamed original src to src-temp-backup');
        } catch (renameError) {
          console.log('⚠️ Rename failed, using copy+delete method...');
          fs.cpSync('src', tempOriginalName, { recursive: true });
          fs.rmSync('src', { recursive: true, force: true });
          console.log('📁 Temporarily moved original src to src-temp-backup (via copy)');
        }
      } catch (error) {
        console.error('❌ Failed to backup src directory:', error.message);
        throw new Error(`Cannot backup src directory: ${error.message}`);
      }
    }
    
    // 将混淆文件直接作为 src 目录
    fs.cpSync(OBFUSCATED_DIR, 'src', { recursive: true });
    console.log('📁 Obfuscated source copied to src directory');
    
    // 备份并修改 package.json
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    if (!fs.existsSync('package.json.backup')) {
      fs.writeFileSync('package.json.backup', JSON.stringify(packageJson, null, 2));
      console.log('📦 Package.json backed up');
    }
    
    // 修改构建配置，确保使用 src 目录但排除备份目录
    const build = packageJson.build || {};
    const files = build.files || [];
    
    // 清理并重新设置 files 配置
    const updatedFiles = files.filter(file => 
      !file.includes('temp-build-src') && 
      !file.includes('src-obfuscated')
    );
    
    // 确保包含 src 目录
    if (!updatedFiles.includes('src/**/*')) {
      updatedFiles.unshift('src/**/*');
    }
    
    // customScripts 目录通过 extraFiles 配置处理，不需要添加到 files 中
    console.log('📁 customScripts will be copied via extraFiles configuration');
    
    // 排除备份和混淆目录
    const excludePatterns = [
      '!src-original',
      '!src-temp-backup', 
      '!src-obfuscated',
      '!temp-build-src'
    ];
    
    excludePatterns.forEach(pattern => {
      if (!updatedFiles.includes(pattern)) {
        updatedFiles.push(pattern);
      }
    });
    
    build.files = updatedFiles;
    packageJson.build = build;
    
    // 确保 main 字段指向正确的 src 路径
    if (packageJson.main && packageJson.main.includes('temp-build-src')) {
      packageJson.main = packageJson.main.replace(/temp-build-src\/src\//, 'src/');
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log('📝 Package.json updated for clean src structure');
    console.log('✅ Build ready with obfuscated src, original src safely backed up');
    
    return true; // 返回true表示需要在构建后恢复配置
  } else {
    console.log('🔧 Using original source for development build');
    return false; // 返回false表示不需要恢复
  }
}

/**
 * 恢复原始配置
 */
function restoreOriginalSrc() {
  console.log('🔄 Restoring original configuration...');
  
  // 恢复 package.json 配置
  if (fs.existsSync('package.json.backup')) {
    const backupContent = fs.readFileSync('package.json.backup', 'utf-8');
    fs.writeFileSync('package.json', backupContent);
    fs.unlinkSync('package.json.backup');
    console.log('✅ Package.json configuration restored');
  }
  
  // 恢复原始 src 目录
  const tempBackupName = 'src-temp-backup';
  if (fs.existsSync(tempBackupName)) {
    try {
      // 删除混淆后的 src 目录
      if (fs.existsSync('src')) {
        fs.rmSync('src', { recursive: true, force: true });
        console.log('🗑️ Removed obfuscated src directory');
      }
      
      // 恢复原始 src 目录
      try {
        fs.renameSync(tempBackupName, 'src');
        console.log('✅ Original src directory restored from temp backup');
      } catch (renameError) {
        console.log('⚠️ Rename failed during restore, using copy method...');
        fs.cpSync(tempBackupName, 'src', { recursive: true });
        fs.rmSync(tempBackupName, { recursive: true, force: true });
        console.log('✅ Original src directory restored from temp backup (via copy)');
      }
    } catch (error) {
      console.error('❌ Failed to restore src directory:', error.message);
      console.log('🔄 Attempting fallback restore from permanent backup...');
    }
  }
  
  // 备用恢复机制：如果临时备份不存在，从永久备份恢复
  if (!fs.existsSync('src') && fs.existsSync('src-original')) {
    fs.cpSync('src-original', 'src', { recursive: true });
    console.log('✅ Original src restored from permanent backup');
  }
}

/**
 * 混淆单个文件（输出到混淆目录）
 */
function obfuscateFile(originalFilePath, obfuscatedFilePath) {
  try {
    const sourceCode = fs.readFileSync(originalFilePath, 'utf-8');
    
    // 跳过已经混淆的文件
    if (sourceCode.includes('javascript-obfuscator')) {
      console.log(`⏭️ Skipping already obfuscated: ${originalFilePath}`);
      return true;
    }
    
    console.log(`🔒 Obfuscating: ${originalFilePath} → ${obfuscatedFilePath}`);
    
    const obfuscatedResult = JavaScriptObfuscator.obfuscate(sourceCode, OBFUSCATION_CONFIG);
    
    // 添加混淆标记注释
    const obfuscatedCode = `// Obfuscated by javascript-obfuscator
${obfuscatedResult.getObfuscatedCode()}`;
    
    // 确保输出目录存在
    const outputDir = path.dirname(obfuscatedFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(obfuscatedFilePath, obfuscatedCode, 'utf-8');
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to obfuscate ${originalFilePath}:`, error.message);
    return false;
  }
}

/**
 * 生成版本信息文件
 */
function generateVersionFile() {
  console.log('📋 Generating version file...');
  
  try {
    const { execSync } = require('child_process');
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // 获取Git信息
    let gitCommitHash = 'unknown';
    let gitCommitHashFull = 'unknown';
    let gitBranch = 'unknown';
    
    try {
      gitCommitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
      gitCommitHashFull = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      gitBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.warn('⚠️ Failed to get Git information:', error.message);
    }
    
    const versionInfo = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      buildDate: new Date().toISOString(),
      buildMode: process.env.NODE_ENV || 'production',
      git: {
        commitHash: gitCommitHash,
        commitHashFull: gitCommitHashFull,
        branch: gitBranch
      },
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: packageJson.devDependencies?.electron || 'unknown'
    };
    
    // 写入版本文件到src目录
    const versionFilePath = path.join('src', 'version.json');
    fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2), 'utf-8');
    
    console.log(`✅ Version file created: ${versionFilePath}`);
    console.log(`📊 Version: ${versionInfo.version}, Commit: ${versionInfo.git.commitHash}, Build: ${versionInfo.buildMode}`);
    
    return versionInfo;
  } catch (error) {
    console.error('❌ Failed to generate version file:', error.message);
    return null;
  }
}

/**
 * 清理临时文件
 */
function cleanupTempFiles() {
  console.log('🧹 Cleaning up temporary files...');
  
  const tempFiles = [OBFUSCATED_DIR, 'temp-build-src', 'src-temp-backup'];
  
  for (const file of tempFiles) {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { recursive: true, force: true });
      console.log(`🗑️ Removed: ${file}`);
    }
  }
}

/**
 * 主混淆函数
 */
async function obfuscateSource() {
  try {
    // 1. 清理旧的构建文件
    cleanBuildFiles();
    
    // 2. 生成版本信息文件
    generateVersionFile();
    
    // 3. 创建混淆输出目录
    createObfuscatedDir();
    
    // 4. 获取所有需要混淆的JS文件
    let allFiles = [];
    
    for (const dir of SOURCE_DIRS) {
      if (fs.existsSync(dir)) {
        const files = getJavaScriptFiles(dir);
        allFiles = allFiles.concat(files);
      }
    }
    
    if (allFiles.length === 0) {
      console.log('⚠️ No JavaScript files found to obfuscate');
      return;
    }
    
    console.log(`📄 Found ${allFiles.length} JavaScript files to obfuscate`);
    
    // 5. 混淆所有文件到输出目录
    let successCount = 0;
    let failCount = 0;
    
    for (const file of allFiles) {
      // 计算相对应的混淆输出路径
      const relativePath = path.relative('src', file);
      const obfuscatedPath = path.join(OBFUSCATED_DIR, relativePath);
      
      if (obfuscateFile(file, obfuscatedPath)) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log('\n📊 Obfuscation Summary:');
    console.log(`✅ Successfully obfuscated: ${successCount} files`);
    console.log(`❌ Failed: ${failCount} files`);
    
    if (failCount > 0) {
      console.log('\n⚠️ Some files failed to obfuscate. Check the errors above.');
      console.log('💡 You can restore from backup using: npm run restore-backup');
      process.exit(1);
    } else {
      console.log('\n🎉 All files obfuscated successfully!');
      
      // 6. 不替换原始src目录，保持混淆文件在独立目录
      console.log('📁 Obfuscated files available in:', OBFUSCATED_DIR);
      
      console.log('\n✅ Obfuscation process completed successfully!');
      console.log('💡 Original source code remains untouched, obfuscated files in separate directory');
    }
    
  } catch (error) {
    console.error('❌ Obfuscation failed:', error.message);
    console.log('🔄 Attempting cleanup...');
    cleanupTempFiles();
    process.exit(1);
  }
}

/**
 * 处理命令行参数
 */
function handleArguments() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🛡️ WebGLHost Runtime App - Source Code Obfuscation Tool

Usage: node scripts/obfuscate-src.js [options]

Options:
  --help, -h         Show this help message
  --restore          Restore original source code from backup
  --clean            Clean all build and temporary files
  --prepare-build    Prepare source for build (use obfuscated in production)
  --dry-run          Show files that would be obfuscated without actually doing it

Examples:
  node scripts/obfuscate-src.js                 # Obfuscate source code  
  node scripts/obfuscate-src.js --restore       # Restore from backup
  node scripts/obfuscate-src.js --clean         # Clean temporary files
  node scripts/obfuscate-src.js --dry-run       # Preview files to obfuscate

Process:
  1. Generate version.json with Git commit info
  2. Create obfuscated copy without modifying original src
  3. Replace src with obfuscated version for build
  4. Restore original src after build
    `);
    process.exit(0);
  }
  
  if (args.includes('--restore')) {
    restoreOriginalSrc();
    cleanupTempFiles();
    process.exit(0);
  }
  
  if (args.includes('--clean')) {
    cleanBuildFiles();
    cleanupTempFiles();
    console.log('✅ Cleanup completed');
    process.exit(0);
  }
  
  if (args.includes('--prepare-build')) {
    const needsRestore = prepareBuildSource();
    if (needsRestore) {
      console.log('💡 Build preparation completed, remember to run --restore after build');
    }
    process.exit(0);
  }
  
  if (args.includes('--dry-run')) {
    console.log('🔍 Dry run - Files that would be obfuscated:');
    
    let allFiles = [];
    for (const dir of SOURCE_DIRS) {
      if (fs.existsSync(dir)) {
        const files = getJavaScriptFiles(dir);
        allFiles = allFiles.concat(files);
      }
    }
    
    allFiles.forEach(file => console.log(`  📄 ${file}`));
    console.log(`\nTotal: ${allFiles.length} files`);
    process.exit(0);
  }
}



// 主程序入口
if (require.main === module) {
  handleArguments();
  obfuscateSource();
}

module.exports = {
  obfuscateSource,
  generateVersionFile,
  restoreOriginalSrc,
  prepareBuildSource,
  cleanBuildFiles,
  cleanupTempFiles,
  OBFUSCATION_CONFIG
};