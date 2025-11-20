# PCDemo - WebGLHost PC SDK 示例项目

WebGLHost PC SDK的完整示例项目，展示如何使用SDK构建桌面游戏宿主应用。

## 📦 项目结构

```
PCDemo/
├── SDK/                              # 预构建的SDK包
│   ├── webglhost-sdk.tgz             # SDK核心包
│   └── webglhost-runtime-pc.tgz      # PC运行时包
├── Demo/                             # 示例应用
    └── webglhost-runtime-app/        # 完整的应用示例

```

## 🚀 快速开始

### 方法：手动构建

```bash
cd Demo/webglhost-runtime-app

# 安装依赖
npm install

# 构建Windows应用
npm run build:windows

# 构建macOS应用
npm run build:mac
```

## 📋 系统要求

- **Node.js** >= 20
- **npm** >= 10
- **操作系统**: Windows 10+、macOS 10.14+


## 🔧 构建命令

```bash
cd Demo/webglhost-runtime-app

# Windows
npm run build:windows        # Release版本
npm run build:windows-debug  # Debug版本

# macOS
npm run build:mac            # Release版本
npm run build:mac-debug      # Debug版本

# 开发运行
npm run dev

# 清理
npm run clean
```

## 📦 构建产物

### Windows

```
dist/
└── WebGLHost-Runtime-App-Portable-win-x64.zip
```

### macOS

```
dist/
├── WebGLHostRuntimeApp-1.0.4-darwin-arm64-mac.tar.gz  # Apple Silicon
├── WebGLHostRuntimeApp-1.0.4-darwin-x64-mac.tar.gz    # Intel
├── WebGLHostRuntimeApp-1.0.4-darwin-arm64-mac.zip     # Apple Silicon
└── WebGLHostRuntimeApp-1.0.4-darwin-x64-mac.zip       # Intel
```

## 🎯 主要功能

### SDK包

- ✅ 预构建的SDK核心包
- ✅ PC平台运行时包
- ✅ 完整的API支持
- ✅ TypeScript类型定义

### 示例应用

- ✅ 完整的源代码
- ✅ 构建脚本
- ✅ 配置示例
- ✅ 自定义脚本示例

## 🎓 学习资源

### 示例代码

查看 `Demo/webglhost-runtime-app/src/` 目录：

- `index.js` - 应用入口
- `GameLauncher.js` - 游戏启动器
- `GameManager.js` - 游戏管理
- `CommandParser.js` - 命令解析

### 配置示例

查看 `Demo/webglhost-runtime-app/config/` 目录：

- `development.json` - 开发配置

### 自定义脚本

查看 `Demo/webglhost-runtime-app/customScripts/` 目录：

- `auth.js` - 认证脚本示例
- `ad.js` - 广告脚本示例

## 🔄 开发工作流

### 1. 首次设置

```bash
cd Demo/webglhost-runtime-app
npm install
```

### 2. 开发调试

```bash
npm run dev
```

### 3. 构建测试

```bash
npm run build:mac-debug
```

### 4. 生产构建

```bash
npm run build:mac
```

## ❓ 常见问题

### Q: npm install 报错

**A**: 确保使用了正确的Node.js版本（>= 20.0.0）

```bash
node --version
npm --version
```

### Q: 构建失败

**A**: 检查以下几点：
1. SDK包是否存在于 `SDK/` 目录
2. 依赖是否正确安装
3. 查看构建日志中的错误信息

### Q: 如何更新SDK

**A**: 替换 `SDK/` 目录中的 `.tgz` 文件，然后重新安装：

```bash
cd Demo/webglhost-runtime-app
rm -rf node_modules package-lock.json
npm install
```

## 📞 技术支持

如有问题，请联系技术支持团队。
