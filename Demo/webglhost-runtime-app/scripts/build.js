#!/usr/bin/env node

/**
 * WebGLHost Runtime App - CLI构建脚本
 * 
 * 跨平台构建脚本，支持Windows和macOS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

/**
 * 跨平台递归删除目录
 * @param {string} dirPath 要删除的目录路径
 */
function removeDirectoryRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (error) {
    // 如果新API失败，尝试老API
    try {
      if (fs.rmdir && fs.rmdir.sync) {
        fs.rmdir.sync(dirPath, { recursive: true });
      } else {
        // 手动递归删除
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            removeDirectoryRecursive(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        }
        fs.rmdirSync(dirPath);
      }
    } catch (secondError) {
      throw new Error(`Failed to remove directory ${dirPath}: ${secondError.message}`);
    }
  }
}

/**
 * 验证版本文件是否正确放置在构建产物中
 */
function verifyVersionFileInBuild(platform) {
  try {
    const distDir = path.join(__dirname, '..', 'dist');
    
    if (!fs.existsSync(distDir)) {
      console.warn('⚠️ Build directory not found, skipping version file verification');
      return;
    }
    
    const distFiles = fs.readdirSync(distDir);
    
    if (platform === 'darwin') {
      // macOS: 查找 .app 文件夹中的 Contents/version.json
      const appFiles = distFiles.filter(file => file.endsWith('.app'));
      
      if (appFiles.length > 0) {
        const appPath = path.join(distDir, appFiles[0]);
        const versionPath = path.join(appPath, 'Contents', 'version.json');
        
        if (fs.existsSync(versionPath)) {
          console.log('✅ Version file verified in macOS app bundle:', versionPath);
          
          // 读取并显示版本信息
          try {
            const versionContent = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
            console.log(`   📋 Version: ${versionContent.version} (${versionContent.buildMode})`);
            console.log(`   🔨 Build: ${versionContent.buildDate}`);
            console.log(`   📦 Platform: ${versionContent.platform}-${versionContent.arch}`);
          } catch (error) {
            console.warn('⚠️ Could not read version file content:', error.message);
          }
        } else {
          console.warn('⚠️ Version file not found in macOS app bundle:', versionPath);
        }
      } else {
        console.warn('⚠️ No .app bundle found in dist directory');
      }
      
    } else if (platform === 'win32') {
      // Windows: 查找应用目录中的 version.json
      const exeFiles = distFiles.filter(file => file.endsWith('.exe') || file.includes('win'));
      
      if (exeFiles.length > 0) {
        // 对于便携版，version.json 应该在应用目录根部
        const appDirs = distFiles.filter(file => {
          const filePath = path.join(distDir, file);
          return fs.statSync(filePath).isDirectory() && 
                 (file.includes('win') || file.includes('WebGLHost'));
        });
        
        if (appDirs.length > 0) {
          const appPath = path.join(distDir, appDirs[0]);
          const versionPath = path.join(appPath, 'version.json');
          
          if (fs.existsSync(versionPath)) {
            console.log('✅ Version file verified in Windows app directory:', versionPath);
            
            // 读取并显示版本信息
            try {
              const versionContent = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
              console.log(`   📋 Version: ${versionContent.version} (${versionContent.buildMode})`);
              console.log(`   🔨 Build: ${versionContent.buildDate}`);
              console.log(`   📦 Platform: ${versionContent.platform}-${versionContent.arch}`);
            } catch (error) {
              console.warn('⚠️ Could not read version file content:', error.message);
            }
          } else {
            console.warn('⚠️ Version file not found in Windows app directory:', versionPath);
          }
        } else {
          console.warn('⚠️ No Windows app directory found in dist');
        }
      } else {
        console.warn('⚠️ No Windows executable found in dist directory');
      }
    }
    
  } catch (error) {
    console.warn('⚠️ Version file verification failed:', error.message);
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
const platformArg = args.find(arg => arg.startsWith('--platform'));
const archArg = args.find(arg => arg.startsWith('--arch'));
const platform = platformArg ? platformArg.split('=')[1] || args[args.indexOf(platformArg) + 1] : os.platform();
const arch = archArg ? archArg.split('=')[1] || args[args.indexOf(archArg) + 1] : os.arch();

console.log(`🔨 Building WebGLHost Runtime App for ${platform}-${arch}`);

async function build() {
  let needsSourceRestore = false;
  let isProduction = false;
  let packageJsonBackup = null;
  
  try {
    // 1. 清理旧的构建产物和混淆文件
    console.log('🧹 Cleaning old build artifacts...');
    try {
      // Cross-platform clean with better error handling
      const cleanDirs = ['logs', 'dist', 'build'];
      for (const dir of cleanDirs) {
        const dirPath = path.join(__dirname, '..', dir);
        if (fs.existsSync(dirPath)) {
          removeDirectoryRecursive(dirPath);
          console.log(`   ✅ Cleaned ${dir}/`);
        }
      }
      
      // 清理混淆相关文件
      try {
        execSync('node scripts/obfuscate.js --clean', { stdio: 'inherit' });
      } catch (obfuscateError) {
        console.warn('⚠️ Obfuscate clean failed, continuing...', obfuscateError.message);
      }
    } catch (error) {
      console.warn('⚠️ Clean failed, continuing...', error.message);
    }

    // 2. 安装SDK依赖（从PCDemo/SDK目录）
    console.log('📦 Installing SDK dependencies...');
    try {
      execSync('npm run install:sdk', { stdio: 'inherit' });
      console.log('✅ SDK dependencies installed successfully');
    } catch (error) {
      console.warn('⚠️ SDK install failed:', error.message);
      console.log('Trying alternative installation method...');
      try {
        execSync('npm install ../../SDK/webglhost-sdk-1.0.0.tgz ../../SDK/webglhost-runtime-pc-1.0.0.tgz --force --legacy-peer-deps', { stdio: 'inherit' });
      } catch (retryError) {
        console.error('❌ SDK installation failed. Please run: npm run install:sdk');
        process.exit(1);
      }
    }

    // 4. 生成版本文件
    console.log('📋 Generating version file...');
    const { generateVersionFile } = require('./obfuscate.js');
    try {
      generateVersionFile();
      console.log('✅ Version file generated successfully');
    } catch (error) {
      console.warn('⚠️ Version file generation failed:', error.message);
    }

    // 5. 混淆源码 (仅在生产构建时)
    isProduction = process.env.NODE_ENV === 'production';
    
    // 5.1 动态修改package.json以排除source map（仅生产构建）
    if (isProduction) {
      console.log('🛡️ Production build - Configuring source map exclusion...');
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // 备份原始配置
      packageJsonBackup = JSON.stringify(packageJson, null, 2);
      
      // 添加source map排除规则
      if (packageJson.build && packageJson.build.files) {
        const files = packageJson.build.files;
        const sourceMapExcludes = ['!**/*.map', '!**/*.js.map'];
        
        // 检查是否已经存在source map排除规则
        const hasMapExclude = files.some(file => file.includes('*.map'));
        
        if (!hasMapExclude) {
          // 在node_modules/**/*之后添加source map排除规则
          const nodeModulesIndex = files.findIndex(file => file === 'node_modules/**/*');
          if (nodeModulesIndex !== -1) {
            files.splice(nodeModulesIndex + 1, 0, ...sourceMapExcludes);
          } else {
            files.push(...sourceMapExcludes);
          }
          
          console.log('📝 Added source map exclusion rules for production build');
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }
      }
    }
    
    if (isProduction) {
      console.log('🛡️ Production build - Obfuscating source code for security...');
      try {
        // 先执行混淆生成混淆文件
        execSync('node scripts/obfuscate.js', { stdio: 'inherit' });
        console.log('✅ Source code obfuscated successfully');
        
        // 然后准备构建源码（替换src为混淆版本）
        execSync('node scripts/obfuscate.js --prepare-build', { stdio: 'inherit' });
        needsSourceRestore = true;
      } catch (error) {
        console.error('❌ Source obfuscation failed:', error.message);
        process.exit(1);
      }
    } else {
      console.log('🔧 Debug build - Skipping obfuscation for development');
    }

    // 6. 根据平台构建 (直接调用 electron-builder)
    if (platform === 'win32') {
      console.log(`🪟 Building for Windows ${arch}...`);
      const archFlag = arch ? `--${arch}` : '';
      execSync(`npx electron-builder --win ${archFlag} --publish=never`, { stdio: 'inherit' });
    } else if (platform === 'darwin') {
      console.log(`🍎 Building for macOS ${arch}...`);
      const archFlag = arch ? `--${arch}` : '';
      execSync(`npx electron-builder --mac ${archFlag} --publish=never`, { stdio: 'inherit' });
    } else if (platform === 'linux') {
      console.log(`🐧 Building for Linux ${arch}...`);
      const archFlag = arch ? `--${arch}` : '';
      execSync(`npx electron-builder --linux ${archFlag} --publish=never`, { stdio: 'inherit' });
    } else {
      console.error(`❌ Unsupported platform for build: ${platform}. Supported platforms are 'win32', 'darwin', 'linux'.`);
      process.exit(1);
    }

    console.log('✅ Build completed successfully!');
    
    // 7. 后处理：验证版本文件是否正确放置
    console.log('🔍 Verifying version file placement...');
    verifyVersionFileInBuild(platform);
    
    // 8. 恢复源码 (如果进行了混淆替换)  
    if (needsSourceRestore) {
      console.log('🔄 Restoring original source code...');
      try {
        execSync('node scripts/obfuscate.js --restore', { stdio: 'inherit' });
        console.log('✅ Original source code restored successfully');
      } catch (error) {
        console.warn('⚠️ Failed to restore original source code:', error.message);
      }
    }
    
    // 8.1 恢复package.json配置（如果是生产构建）
    if (isProduction && packageJsonBackup) {
      console.log('🔄 Restoring original package.json configuration...');
      try {
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        fs.writeFileSync(packageJsonPath, packageJsonBackup);
        console.log('✅ Package.json configuration restored successfully');
      } catch (error) {
        console.warn('⚠️ Failed to restore package.json configuration:', error.message);
      }
    }
    
    // 9. 清理临时文件
    console.log('🧹 Cleaning up temporary files...');
    try {
      execSync('node scripts/obfuscate.js --clean', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
    
    // 10. 显示构建模式信息
    console.log(`\n🏗️ Build completed in ${isProduction ? 'PRODUCTION' : 'DEBUG'} mode`);
    if (isProduction) {
      console.log('🛡️ Code obfuscation: ✅ ENABLED');
    } else {
      console.log('🔧 Code obfuscation: ❌ DISABLED (debug mode)');
    }
    
    // 显示构建产物
    const distDir = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distDir)) {
      console.log('\n📂 Build artifacts:');
      const files = fs.readdirSync(distDir);
      files.forEach(file => {
        const filePath = path.join(distDir, file);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   📄 ${file} (${size} MB)`);
      });
    }

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    
    // 即使构建失败也要执行清理
    console.log('🧹 Performing cleanup after build failure...');
    try {
      if (needsSourceRestore) {
        execSync('node scripts/obfuscate.js --restore', { stdio: 'inherit' });
        console.log('✅ Source code restored after failure');
      }
      
      // 恢复package.json配置（如果是生产构建）
      if (isProduction && packageJsonBackup) {
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        fs.writeFileSync(packageJsonPath, packageJsonBackup);
        console.log('✅ Package.json configuration restored after failure');
      }
      
      execSync('node scripts/obfuscate.js --clean', { stdio: 'inherit' });
      console.log('✅ Cleanup completed after failure');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup after failure failed:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// 检查参数
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/build-cli.js [options]

Options:
  --help, -h     Show this help message
  --platform     Target platform (win32, darwin, linux)
  --arch         Target architecture (x64, arm64)

Examples:
  node scripts/build-cli.js                    # Build for current platform
  node scripts/build-cli.js --platform darwin --arch arm64 # Build for macOS arm64
  `);
  process.exit(0);
}

// 启动构建
build().catch(error => {
  console.error('❌ Build script failed:', error);
  
  // 最后的清理尝试
  console.log('🧹 Final cleanup attempt...');
  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    execSync('node scripts/obfuscate.js --restore', { stdio: 'inherit' });
    
    // 尝试恢复package.json配置（检查是否有备份文件）
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJsonBackupPath = packageJsonPath + '.build-backup';
    if (fs.existsSync(packageJsonBackupPath)) {
      const backupContent = fs.readFileSync(packageJsonBackupPath, 'utf-8');
      fs.writeFileSync(packageJsonPath, backupContent);
      fs.unlinkSync(packageJsonBackupPath);
      console.log('✅ Package.json configuration restored from backup');
    }
    
    execSync('node scripts/obfuscate.js --clean', { stdio: 'inherit' });
    console.log('✅ Final cleanup completed');
  } catch (cleanupError) {
    console.warn('⚠️ Final cleanup failed:', cleanupError.message);
  }
  
  process.exit(1);
});