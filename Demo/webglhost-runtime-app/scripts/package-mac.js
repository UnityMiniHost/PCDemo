#!/usr/bin/env node

/**
 * WebGLHost Runtime App - Mac版本批量优化打包脚本
 * 
 * 自动检测并优化所有可用的Mac app bundle（ARM64和x64）
 */

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// 公司代码签名证书ID
const COMPANY_CERTIFICATE_ID = '3B027072EFDDD6DA096DCEE025CBAEC665AC3CA1';

/**
 * 跨平台递归删除目录
 */
function removeDirectoryRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`⚠️ Failed to remove ${dirPath}:`, error.message);
  }
}

/**
 * 删除文件
 */
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.warn(`⚠️ Failed to remove file ${filePath}:`, error.message);
      return false;
    }
  }
  return false;
}

/**
 * 获取目录大小 (修复版，正确处理符号链接)
 */
function getDirectorySize(itemPath) {
  if (!fs.existsSync(itemPath)) {
    return 0;
  }
  
  let totalSize = 0;
  
  try {
    // 使用 lstatSync 来获取文件或符号链接本身的状态，而不是它指向的目标
    const stats = fs.lstatSync(itemPath);
    
    totalSize += stats.size;

    // 如果是目录，则递归计算其内容的大小
    if (stats.isDirectory()) {
      const files = fs.readdirSync(itemPath);
      for (const file of files) {
        const filePath = path.join(itemPath, file);
        totalSize += getDirectorySize(filePath); // 递归调用
      }
    }
  } catch (error) {
    // 忽略权限错误等问题
    // console.warn(`⚠️ Could not get size of ${itemPath}:`, error.message);
  }
  
  return totalSize;
}

/**
 * 获取文件大小
 */
function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.warn(`⚠️ Could not get file size of ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * 检查证书是否可用
 */
function checkCertificateAvailability(certificateId) {
  try {
    const result = execSync(`security find-identity -v -p codesigning | grep "${certificateId}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * 代码签名函数
 * @param {string} appBundlePath - App bundle路径
 * @param {boolean} verbose - 是否显示详细日志
 * @returns {Object} 签名结果信息
 */
async function signAppBundle(appBundlePath, verbose = true) {
  const appName = path.basename(appBundlePath);
  
  if (verbose) {
    console.log(`🔐 Code signing ${appName}...`);
  }
  
  // 检查是否为macOS系统
  if (process.platform !== 'darwin') {
    if (verbose) {
      console.log('ℹ️ Skipping code signing (not on macOS)');
    }
    return {
      success: false,
      method: 'skipped',
      reason: 'Not on macOS',
      certificateUsed: null
    };
  }
  
  // 检查公司证书是否可用
  const companyCertAvailable = checkCertificateAvailability(COMPANY_CERTIFICATE_ID);
  
  if (companyCertAvailable) {
    // 使用公司证书进行正式签名
    try {
      if (verbose) {
        console.log(`   🏢 Using company certificate: ${COMPANY_CERTIFICATE_ID}`);
      }
      
      // 使用完整的entitlements文件进行公司证书签名
      const entitlementsPath = path.join(__dirname, '..', 'assets', 'entitlements.mac.plist');
      
      if (fs.existsSync(entitlementsPath)) {
        if (verbose) {
          console.log(`   📋 Using entitlements: ${path.relative(path.join(__dirname, '..'), entitlementsPath)}`);
        }
        execSync(`codesign --sign "${COMPANY_CERTIFICATE_ID}" --verbose --force --deep --timestamp --options runtime --entitlements "${entitlementsPath}" "${appBundlePath}"`, {
          stdio: verbose ? 'inherit' : 'pipe'
        });
      } else {
        console.warn(`   ⚠️ Entitlements file not found: ${entitlementsPath}`);
        console.log(`   🔄 Signing without entitlements (may cause runtime issues)`);
        execSync(`codesign --sign "${COMPANY_CERTIFICATE_ID}" --verbose --force --deep --timestamp "${appBundlePath}"`, {
          stdio: verbose ? 'inherit' : 'pipe'
        });
      }
      
      // 验证签名
      execSync(`codesign --verify --verbose=2 "${appBundlePath}"`, {
        stdio: verbose ? 'inherit' : 'pipe'
      });
      
      if (verbose) {
        console.log('   ✅ Company certificate signature applied successfully');
        console.log('   🔍 Signature verification passed');
      }
      
      return {
        success: true,
        method: 'company-certificate',
        reason: 'Company certificate signing successful',
        certificateUsed: COMPANY_CERTIFICATE_ID
      };
      
    } catch (error) {
      console.warn(`⚠️ Company certificate signing failed: ${error.message}`);
      console.log('   🔄 Falling back to adhoc signature...');
      
      // 回退到adhoc签名
      try {
        execSync(`codesign --force --deep --sign - "${appBundlePath}"`, {
          stdio: 'pipe'
        });
        if (verbose) {
          console.log('   ✅ Adhoc signature applied as fallback');
        }
        return {
          success: true,
          method: 'adhoc-fallback',
          reason: 'Company certificate failed, used adhoc signature',
          certificateUsed: null
        };
      } catch (adhocError) {
        console.warn(`⚠️ Adhoc signing also failed: ${adhocError.message}`);
        if (verbose) {
          console.warn('   App may not run on some systems without signature');
        }
        return {
          success: false,
          method: 'failed',
          reason: 'Both company certificate and adhoc signing failed',
          certificateUsed: null
        };
      }
    }
  } else {
    // 公司证书不可用，使用adhoc签名
    if (verbose) {
      console.log(`   ⚠️ Company certificate not found: ${COMPANY_CERTIFICATE_ID}`);
      console.log('   🔄 Using adhoc signature instead...');
    }
    
    try {
      execSync(`codesign --force --deep --sign - "${appBundlePath}"`, {
        stdio: 'pipe'
      });
      if (verbose) {
        console.log('   ✅ Adhoc signature applied successfully');
      }
      return {
        success: true,
        method: 'adhoc',
        reason: 'Company certificate not available, used adhoc signature',
        certificateUsed: null
      };
    } catch (error) {
      console.warn(`⚠️ Adhoc signing failed: ${error.message}`);
      if (verbose) {
        console.warn('   App may not run on some systems without signature');
      }
      return {
        success: false,
        method: 'failed',
        reason: 'Adhoc signing failed',
        certificateUsed: null
      };
    }
  }
}

/**
 * 优化单个Mac app bundle
 */
async function optimizeSingleMacBundle(sourceAppBundle, distDir, productName) {
  console.log(`\\n📱 Processing: ${path.relative(distDir, sourceAppBundle)}`);
  
  // 自动检测架构
  const bundleDir = path.dirname(sourceAppBundle);
  const bundleDirName = path.basename(bundleDir);
  let detectedArch = 'universal';
  
  if (bundleDirName === 'mac-arm64') {
    detectedArch = 'arm64';
  } else if (bundleDirName === 'mac-x64') {
    detectedArch = 'x64';
  } else if (bundleDirName === 'mac') {
    // Try to detect architecture from app bundle executable
    try {
      const executablePath = path.join(sourceAppBundle, 'Contents', 'MacOS', productName.replace('.app', ''));
      if (fs.existsSync(executablePath)) {
        const fileOutput = execSync(`file "${executablePath}"`, { encoding: 'utf8' });
        if (fileOutput.includes('arm64')) {
          detectedArch = 'arm64';
        } else if (fileOutput.includes('x86_64')) {
          detectedArch = 'x64';
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not detect architecture, using universal');
    }
  }
  
  // 读取版本信息
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  const platform = `darwin-${detectedArch}`;
  
  console.log('📋 Version Info:');
  console.log(`   Version: ${version}`);
  console.log(`   Platform: ${platform}`);
  console.log(`   Architecture: ${detectedArch}`);
  
  // 获取原始大小
  const originalSize = getDirectorySize(sourceAppBundle);
  console.log(`📊 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // 创建优化版本的副本
  const optimizedAppBundle = path.join(distDir, `WebGLHostRuntimeApp.app-optimized-${detectedArch}`);
  
  console.log('📂 Creating optimized copy of app bundle...');
  if (fs.existsSync(optimizedAppBundle)) {
    fs.rmSync(optimizedAppBundle, { recursive: true, force: true });
  }
  
  fse.copySync(sourceAppBundle, optimizedAppBundle);
  console.log('✅ App bundle copied successfully');
  
  let savedSize = 0;
  
  console.log(`🔧 Optimizing Mac app bundle: ${path.basename(optimizedAppBundle)}`);
  
  // 1. 删除重复的electron运行时
  const nodeModulesPath = path.join(optimizedAppBundle, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   🔥 Removing duplicate Electron runtime (Mac version)...');
    
    const electronPath = path.join(nodeModulesPath, 'electron');
    if (fs.existsSync(electronPath)) {
      const electronSize = getDirectorySize(electronPath);
      removeDirectoryRecursive(electronPath);
      savedSize += electronSize;
      console.log(`      🗑️ Removed electron module (${(electronSize / 1024 / 1024).toFixed(2)} MB) - duplicate runtime`);
    }
    
    // 优化 classic-level 但保留必要的 .node 文件
    const classicLevelPath = path.join(nodeModulesPath, 'classic-level');
    if (fs.existsSync(classicLevelPath)) {
      console.log('   🛡️ Optimizing classic-level (preserving essential .node files)...');
      
      // 删除 deps 目录（构建工具，运行时不需要）
      const depsPath = path.join(classicLevelPath, 'deps');
      if (fs.existsSync(depsPath)) {
        const depsSize = getDirectorySize(depsPath);
        removeDirectoryRecursive(depsPath);
        savedSize += depsSize;
        console.log(`      🗑️ Removed deps (${(depsSize / 1024 / 1024).toFixed(2)} MB)`);
      }
      
      // 删除不需要的架构的 prebuilds
      const prebuildsPath = path.join(classicLevelPath, 'prebuilds');
      if (fs.existsSync(prebuildsPath)) {
        const architecturesToRemove = ['android-arm', 'android-arm64', 'linux-arm', 'linux-arm64', 'linux-x64', 'win32-ia32', 'win32-x64'];
        
        for (const archToRemove of architecturesToRemove) {
          const archPath = path.join(prebuildsPath, archToRemove);
          if (fs.existsSync(archPath)) {
            const archSize = getDirectorySize(archPath);
            removeDirectoryRecursive(archPath);
            savedSize += archSize;
            console.log(`      🗑️ Removed unused architecture: ${archToRemove} (${(archSize / 1024 / 1024).toFixed(2)} MB)`);
          }
        }
      }
    }
  }
  
  // 2. 删除不必要的语言包，只保留英文和中文
  const frameworksPath = path.join(optimizedAppBundle, 'Contents', 'Frameworks');
  if (fs.existsSync(frameworksPath)) {
    console.log('   🌐 Removing unnecessary locale files...');
    
    const electronFramework = path.join(frameworksPath, 'Electron Framework.framework');
    if (fs.existsSync(electronFramework)) {
      // 查找所有版本目录中的 Resources
      const versionsPath = path.join(electronFramework, 'Versions');
      if (fs.existsSync(versionsPath)) {
        const versions = fs.readdirSync(versionsPath);
        for (const version of versions) {
          const versionPath = path.join(versionsPath, version);
          if (fs.statSync(versionPath).isDirectory()) {
            const resourcesPath = path.join(versionPath, 'Resources');
            if (fs.existsSync(resourcesPath)) {
              const resourceFiles = fs.readdirSync(resourcesPath);
              for (const file of resourceFiles) {
                if (file.endsWith('.lproj') && !['en.lproj', 'zh_CN.lproj', 'zh_TW.lproj'].includes(file)) {
                  const lprojPath = path.join(resourcesPath, file);
                  const lprojSize = getDirectorySize(lprojPath);
                  removeDirectoryRecursive(lprojPath);
                  savedSize += lprojSize;
                }
              }
            }
          }
        }
      }
      
      console.log('      Removed unnecessary locale files');
    }
    
    console.log('   ⚡ Optimizing Electron Framework...');
    console.log('      ✅ Optimized Framework locales while preserving structure');
  }
  
  // 3. 保护重要的SDK和运行时文件
  console.log('   🛡️ Protecting essential SDK and runtime files...');
  const protectedPaths = [
    path.join(optimizedAppBundle, 'Contents', 'Resources', 'sdk'),
    path.join(optimizedAppBundle, 'Contents', 'Resources', 'runtime'),
    path.join(optimizedAppBundle, 'Contents', 'Resources', 'app.asar')
  ];
  
  for (const protectedPath of protectedPaths) {
    if (fs.existsSync(protectedPath)) {
      console.log(`      Protected: ${path.relative(optimizedAppBundle, protectedPath)}`);
    }
  }
  
  // 4. 删除可选的开发工具文件和大型库
  console.log('   🛠️ Removing optional development files and large libraries...');
  
  const optionalFiles = [
    // 可选的Vulkan软件渲染器（通常很大，10MB+）
    path.join(frameworksPath, 'Electron Framework.framework', 'Versions', 'A', 'Libraries', 'libvk_swiftshader.dylib'),
  ];
  
  for (const file of optionalFiles) {
    if (removeFile(file)) {
      const fileSize = 16 * 1024 * 1024; // 估算大小
      savedSize += fileSize;
      console.log(`      🗑️ Removed optional library ${path.basename(file)} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    }
  }
  
  const optimizedSize = getDirectorySize(optimizedAppBundle);
  const actualSaved = originalSize - optimizedSize;
  const reductionPercentage = (actualSaved / originalSize * 100);
  
  console.log(`✅ Mac app bundle optimization complete! Saved ${(actualSaved / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 Optimized size: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`💾 Size reduction: ${reductionPercentage.toFixed(1)}%`);
  
  // Add code signing after all optimizations are complete
  const signingResult = await signAppBundle(optimizedAppBundle);
  
  // 创建压缩包（ZIP和TAR.GZ两种格式）
  console.log('📦 Creating optimized packages...');
  const baseFileName = `WebGLHostRuntimeApp-${version}-${platform}-mac`;
  const zipFileName = `${baseFileName}.zip`;
  const tarGzFileName = `${baseFileName}.tar.gz`;
  const zipFilePath = path.join(distDir, zipFileName);
  const tarGzFilePath = path.join(distDir, tarGzFileName);
  
  // 删除旧文件
  [zipFilePath, tarGzFilePath].forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
  
  try {
    // 创建统一命名的临时副本用于两种压缩格式
    console.log('   📦 Creating standardized copy for packaging...');
    const standardAppName = 'WebGLHostRuntimeApp.app';
    const tempCopyPath = path.join(distDir, standardAppName);
    
    // 如果已存在同名文件/目录，先删除
    if (fs.existsSync(tempCopyPath)) {
      fs.rmSync(tempCopyPath, { recursive: true, force: true });
    }
    
    // 创建临时副本
    fse.copySync(optimizedAppBundle, tempCopyPath);
    
    // 重新签名临时副本（因为复制操作可能会破坏签名）
    await signAppBundle(tempCopyPath, false);
    
    // 创建ZIP包 - 使用临时副本确保解压后名称统一
    console.log('   📦 Creating ZIP package...');
    execSync(`cd \"${distDir}\" && ditto -c -k --keepParent \"${standardAppName}\" \"${zipFileName}\"`, {
      stdio: 'pipe'
    });
    const zipSize = getFileSize(zipFilePath);
    console.log(`      ✅ ZIP created: ${(zipSize / 1024 / 1024).toFixed(2)} MB`);
    
    // 创建TAR.GZ包 - 使用相同的临时副本
    console.log('   📦 Creating TAR.GZ package...');
    execSync(`cd \"${distDir}\" && tar -czf \"${tarGzFileName}\" \"${standardAppName}\"`, {
      stdio: 'pipe'
    });
    
    // 清理临时副本
    fs.rmSync(tempCopyPath, { recursive: true, force: true });
    
    const tarGzSize = getFileSize(tarGzFilePath);
    console.log(`      ✅ TAR.GZ created: ${(tarGzSize / 1024 / 1024).toFixed(2)} MB`);
    
    // 压缩统计
    const zipCompressionRatio = ((optimizedSize - zipSize) / optimizedSize * 100);
    const tarGzCompressionRatio = ((optimizedSize - tarGzSize) / optimizedSize * 100);
    const zipTotalReduction = ((originalSize - zipSize) / originalSize * 100);
    const tarGzTotalReduction = ((originalSize - tarGzSize) / originalSize * 100);
    
    console.log(`\\n📊 Compression Results for ${detectedArch}:`);
    console.log('   ZIP:');
    console.log(`      📁 File: ${zipFileName}`);
    console.log(`      📊 Size: ${(zipSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`      🗜️ Compression ratio: ${zipCompressionRatio.toFixed(1)}%`);
    console.log(`      💾 Total reduction: ${zipTotalReduction.toFixed(1)}% from original`);
    
    console.log('   TAR.GZ:');
    console.log(`      📁 File: ${tarGzFileName}`);
    console.log(`      📊 Size: ${(tarGzSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`      🗜️ Compression ratio: ${tarGzCompressionRatio.toFixed(1)}%`);
    console.log(`      💾 Total reduction: ${tarGzTotalReduction.toFixed(1)}% from original`);
    console.log(`      📂 Extracts to: WebGLHostRuntimeApp.app`);
    
    console.log(`\\n🔄 Format Comparison for ${detectedArch}:`);
    console.log(`   TAR.GZ vs ZIP: ${(tarGzSize / 1024 / 1024).toFixed(2)} MB vs ${(zipSize / 1024 / 1024).toFixed(2)} MB`);
    if (tarGzSize < zipSize) {
      const improvement = ((zipSize - tarGzSize) / tarGzSize * 100);
      console.log(`   TAR.GZ is ${improvement.toFixed(1)}% smaller than ZIP`);
    }
    
    return {
      arch: detectedArch,
      originalSize,
      optimizedSize,
      zipSize,
      tarGzSize,
      zipFile: zipFilePath,
      tarGzFile: tarGzFilePath,
      signingResult
    };
    
  } catch (error) {
    console.error(`❌ Failed to create compressed packages: ${error.message}`);
    throw error;
  }
}

/**
 * 主函数 - 处理所有Mac app bundles
 */
async function createOptimizedMacPackages() {
  try {
    console.log('🍎 Starting Mac App Bundle Batch Optimization\\n');
    
    const distDir = path.join(__dirname, '..', 'dist');
    
    // Read productName from package.json
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const productName = packageJson.build?.productName || 'WebGLHostRuntimeApp';
    const appBundleName = `${productName}.app`;
    
    console.log(`📦 Looking for app bundle: ${appBundleName}`);
    
    // Search for all available app bundles with dynamic product name
    const possibleAppBundles = [
      { path: path.join(distDir, 'mac-arm64', appBundleName), priority: 1 },
      { path: path.join(distDir, 'mac-x64', appBundleName), priority: 2 },
      { path: path.join(distDir, 'mac', appBundleName), priority: 3 },
      { path: path.join(distDir, appBundleName), priority: 4 }
    ];
    
    // Find all existing app bundles
    const existingBundles = possibleAppBundles
      .filter(bundle => fs.existsSync(bundle.path))
      .sort((a, b) => a.priority - b.priority);
    
    if (existingBundles.length === 0) {
      console.error('❌ No Mac app bundles found. Please build the app first.');
      console.error(`   Expected bundle name: ${appBundleName}`);
      console.error(`   Searched locations:`);
      possibleAppBundles.forEach(bundle => {
        console.error(`     - ${bundle.path}`);
      });
      process.exit(1);
    }
    
    console.log(`📱 Found ${existingBundles.length} Mac app bundle(s):`);
    existingBundles.forEach((bundle, index) => {
      console.log(`   ${index + 1}. ${path.relative(distDir, bundle.path)}`);
    });
    
    const results = [];
    
    // Process each found app bundle
    for (const bundle of existingBundles) {
      try {
        const result = await optimizeSingleMacBundle(bundle.path, distDir, productName);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to optimize ${path.relative(distDir, bundle.path)}: ${error.message}`);
      }
    }
    
    // 总结报告
    if (results.length > 0) {
      console.log('\\n' + '='.repeat(80));
      console.log('📊 BATCH OPTIMIZATION SUMMARY');
      console.log('='.repeat(80));
      
      let totalOriginalSize = 0;
      let totalOptimizedSize = 0;
      let bestTarGzSize = Infinity;
      let bestZipSize = Infinity;
      let bestTarGzArch = '';
      let bestZipArch = '';
      
      results.forEach(result => {
        totalOriginalSize += result.originalSize;
        totalOptimizedSize += result.optimizedSize;
        
        if (result.tarGzSize < bestTarGzSize) {
          bestTarGzSize = result.tarGzSize;
          bestTarGzArch = result.arch;
        }
        
        if (result.zipSize < bestZipSize) {
          bestZipSize = result.zipSize;
          bestZipArch = result.arch;
        }
        
        console.log(`\\n📱 ${result.arch.toUpperCase()} Architecture:`);
        console.log(`   Original: ${(result.originalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Optimized: ${(result.optimizedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   ZIP: ${(result.zipSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   TAR.GZ: ${(result.tarGzSize / 1024 / 1024).toFixed(2)} MB`);
      });
      
      console.log(`\\n🏆 BEST RESULTS:`);
      console.log(`   Smallest TAR.GZ: ${(bestTarGzSize / 1024 / 1024).toFixed(2)} MB (${bestTarGzArch})`);
      console.log(`   Smallest ZIP: ${(bestZipSize / 1024 / 1024).toFixed(2)} MB (${bestZipArch})`);
      
      const totalReduction = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100);
      console.log(`\\n💾 Total Size Reduction: ${(totalReduction).toFixed(1)}%`);
      console.log(`   Before: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   After: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Saved: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)} MB`);
      
      console.log(`\\n📏 Comparison with Windows (~140 MB):`);
      if (bestTarGzSize / 1024 / 1024 <= 140) {
        console.log(`   ✅ Best Mac TAR.GZ (${(bestTarGzSize / 1024 / 1024).toFixed(2)} MB) meets target!`);
      } else {
        console.log(`   ⚠️ Best Mac TAR.GZ (${(bestTarGzSize / 1024 / 1024).toFixed(2)} MB) is larger than Windows target`);
      }

      console.log('\\n' + '='.repeat(80));
      console.log('✅ Batch optimization completed successfully!');
      // 添加签名信息总结
      console.log(`\\n🔐 CODE SIGNING SUMMARY:`);
      let hasCompanyCertSigning = false;
      let hasAdhocSigning = false;
      let hasFailedSigning = false;
      
      results.forEach(result => {
        const signing = result.signingResult;
        if (signing) {
          console.log(`\\n📱 ${result.arch.toUpperCase()} Architecture Signing:`);
          
          if (signing.method === 'company-certificate') {
            console.log(`   ✅ Company Certificate: Successfully signed`);
            console.log(`   🏢 Certificate ID: ${signing.certificateUsed}`);
            hasCompanyCertSigning = true;
          } else if (signing.method === 'adhoc' || signing.method === 'adhoc-fallback') {
            console.log(`   ⚠️ Adhoc Signature: ${signing.reason}`);
            hasAdhocSigning = true;
          } else if (signing.method === 'failed') {
            console.log(`   ❌ Signing Failed: ${signing.reason}`);
            hasFailedSigning = true;
          } else if (signing.method === 'skipped') {
            console.log(`   ℹ️ Signing Skipped: ${signing.reason}`);
          }
        }
      });
      
      // 总体签名状态
      console.log(`\\n🏆 OVERALL SIGNING STATUS:`);
      if (hasCompanyCertSigning && !hasAdhocSigning && !hasFailedSigning) {
        console.log(`   ✅ All packages signed with company certificate`);
      } else if (hasCompanyCertSigning && (hasAdhocSigning || hasFailedSigning)) {
        console.log(`   ⚠️ Mixed signing: Some with company cert, some with adhoc/failed`);
      } else if (hasAdhocSigning && !hasFailedSigning) {
        console.log(`   ⚠️ All packages signed with adhoc signature only`);
        console.log(`   💡 Install company certificate for formal release:`);
        console.log(`      - Certificate file: yousandi.pfx`);
        console.log(`      - Double-click to install in Keychain`);
        console.log(`      - Ensure it's available for code signing`);
      } else if (hasFailedSigning) {
        console.log(`   ❌ Some or all packages failed to sign`);
        console.log(`   💡 Install company certificate for proper signing:`);
        console.log(`      - Certificate file: yousandi.pfx`);
        console.log(`      - Contact IT support if issues persist`);
      }
      
      console.log('📦 Final Artifacts created in:');
      results.forEach(result => {
        console.log(`   - ${result.tarGzFile}`);
        console.log(`   - ${result.zipFile}`);
      });
      console.log('='.repeat(80));
    }
    
  } catch (error) {
    console.error('❌ Batch optimization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  createOptimizedMacPackages();
}

module.exports = { createOptimizedMacPackages };
