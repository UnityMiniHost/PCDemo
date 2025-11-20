#!/usr/bin/env node

/**
 * Postinstall script to ensure latest SDK is installed
 * This script runs after npm install to:
 * 1. Update SDK from PCDemo/SDK directory
 * 2. Update package-lock.json with new SDK integrity hash
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Prevent recursive postinstall execution
if (process.env.SKIP_POSTINSTALL === 'true') {
  console.log('⏭️  Skipping postinstall (SKIP_POSTINSTALL=true)');
  process.exit(0);
}

// Only run on top-level install, not during nested installs
if (process.env.npm_config_global === 'true') {
  console.log('⏭️  Skipping postinstall (global install)');
  process.exit(0);
}

try {
  console.log('📦 [Postinstall] Updating SDK to latest version...');
  
  // 1. Install latest SDK
  execSync('npm run install:sdk', { 
    stdio: 'inherit',
    env: { ...process.env, SKIP_POSTINSTALL: 'true' }
  });
  
  // 2. Update package-lock.json with new SDK integrity hash
  const packageLockPath = path.join(__dirname, '..', 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    console.log('📝 [Postinstall] Updating package-lock.json...');
    execSync('npm install --package-lock-only', { 
      stdio: 'pipe',
      env: { ...process.env, SKIP_POSTINSTALL: 'true' }
    });
    console.log('✅ [Postinstall] Package-lock.json updated with new SDK hash');
  }
  
  console.log('✅ [Postinstall] SDK updated and synchronized successfully');
} catch (error) {
  console.warn('⚠️  [Postinstall] Failed:', error.message);
  // Don't fail the entire install if SDK update fails
  process.exit(0);
}

