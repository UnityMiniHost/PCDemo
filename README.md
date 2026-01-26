# WebGLHost PC SDK Demo

WebGLHost PC SDK 示例项目集合，展示如何在 Windows 和 macOS 桌面应用中集成 WebGL 游戏。

## 项目结构

```
PCDemo/
├── PCDemo_cpp/     # C++ SDK 示例项目
├── PCDemo_js/      # JavaScript SDK 示例项目
└── README.md       # 本文件
```

## 示例项目

### PCDemo_cpp - C++ SDK Demo

使用原生 C++ 集成 WebGLHost SDK，适用于需要原生性能和直接系统访问的应用。

**特点**：
- 原生 C++ 实现
- 跨平台支持 (Windows + macOS)
- CMake 构建系统
- 自动获取游戏列表并启动

**快速开始**：
```bash
cd PCDemo_cpp

# Windows
scripts\build-and-run.bat

# macOS
./scripts/build-and-run.sh
```

详细文档请参阅 [PCDemo_cpp/README.md](./PCDemo_cpp/README.md)

### PCDemo_js - JavaScript SDK Demo

使用 JavaScript/Node.js 集成 WebGLHost SDK，基于 Electron 框架，适用于快速开发和 Web 技术栈团队。

**特点**：
- JavaScript/Node.js 实现
- 基于 Electron 框架
- 完整的应用示例
- 预构建的 SDK 包

**快速开始**：
```bash
cd PCDemo_js/Demo/webglhost-runtime-app

# 安装依赖
npm install

# 开发运行
npm run dev

# 构建
npm run build:mac     # macOS
npm run build:windows # Windows
```

详细文档请参阅 [PCDemo_js/README.md](./PCDemo_js/README.md)

## 系统要求

### C++ SDK (PCDemo_cpp)
- **Windows**: Windows 10+, Visual Studio 2019+, CMake 3.15+
- **macOS**: macOS 10.15+, Xcode Command Line Tools, CMake 3.15+

### JavaScript SDK (PCDemo_js)
- **Node.js**: >= 20
- **npm**: >= 10
- **操作系统**: Windows 10+, macOS 10.14+

## 许可证

请参阅 [LICENSE](./LICENSE) 文件。

## 技术支持

如有问题，请联系技术支持团队。
