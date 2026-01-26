# Scripts Usage Quick Reference

## 快速命令

从demo目录执行：

```bat
# 一键构建并运行（推荐）
scripts\build-and-run.bat

# 仅构建
scripts\build.bat

# 仅运行
scripts\run.bat

# 清理
scripts\clean.bat

# 打包SDK（用于分发）
scripts\pack.bat

```

## 脚本说明

### build.bat
- 自动检查并解压host和runtime（如果不存在）
- 使用CMake构建demo.exe
- 自动复制到demo根目录
- 输出: `demo.exe`

### run.bat
- 自动检查并解压host和runtime（如果不存在）
- 检查所有依赖是否存在
- 运行demo.exe
- 显示日志位置

### build-and-run.bat
- 执行完整流程：解压（如需要） → 构建 → 运行
- 任何步骤失败都会停止
- 最方便的使用方式

### clean.bat
- 删除build目录和demo.exe
- 可选删除runtime和logs
- 交互式确认

### pack.bat
- 压缩host和runtime目录到native_sdk
- 自动创建native_sdk目录
- 自动处理大文件分片（>50MB）
- 用于SDK打包和分发

### compress_split.ps1
- PowerShell脚本，用于压缩目录并分片
- 每个分片最大50MB
- 用法：
  ```bat
  powershell -ExecutionPolicy Bypass -File "scripts\compress_split.ps1" -SourceDir "目录名" -OutputDir "输出目录" -ArchiveName "归档名" -ChunkSizeMB 50
  ```

### decompress_split.ps1
- PowerShell脚本，用于解压分片或普通压缩包
- 自动检测并合并分片
- 用法：
  ```bat
  powershell -ExecutionPolicy Bypass -File "scripts\decompress_split.ps1" -SourceDir "压缩包目录" -OutputDir "输出目录" -ArchiveName "归档名"
  ```

## 依赖要求

SDK文件以压缩包形式存储在 `native_sdk/` 目录：
1. `native_sdk/windows/host.zip` - SDK核心DLL（压缩）
2. `native_sdk/windows/runtime.z01~z04` - 运行时环境（分片压缩）

**自动解压**: 构建和运行脚本会自动检查并解压这些文件到 `host/` 和 `runtime/` 目录。

## 故障排除

### DLL未找到
- 脚本会自动从 `native_sdk/windows/host.zip` 解压
- 如果自动解压失败，检查 `native_sdk/windows/host.zip` 是否存在
- 手动解压：
  ```bat
  powershell -ExecutionPolicy Bypass -File "scripts\decompress_split.ps1" -SourceDir "native_sdk" -OutputDir "." -ArchiveName "host"
  ```

### Runtime未找到
- 脚本会自动从 `native_sdk/windows/runtime.z01~z04` 解压
- 如果自动解压失败，检查所有分片文件是否完整
- 手动解压：
  ```bat
  powershell -ExecutionPolicy Bypass -File "scripts\decompress_split.ps1" -SourceDir "native_sdk" -OutputDir "." -ArchiveName "runtime"
  ```

### 解压失败
- 确认 `native_sdk/` 目录中所有文件完整
- 检查PowerShell执行策略
- 确认磁盘空间充足（runtime约150MB）

### CMake错误
检查Visual Studio 2019是否已安装，或修改build.bat使用其他版本：
```bat
cmake -G "Visual Studio 17 2022" -A x64 ..
```

## 注意事项

- 所有脚本必须从demo目录调用
- 使用 `scripts\` 前缀
- SDK文件以压缩形式存储在 `native_sdk/` 目录
- `host/` 和 `runtime/` 目录会自动解压，无需手动操作
- 首次运行时解压可能需要几秒钟时间

## 高级用法

### 打包SDK用于分发

如果您更新了host或runtime目录，需要重新打包：

```bat
# 方式1：使用pack.bat（推荐）
scripts\pack.bat

# 方式2：手动压缩单个目录
powershell -ExecutionPolicy Bypass -File "scripts\compress_split.ps1" -SourceDir "host" -OutputDir "native_sdk" -ArchiveName "host" -ChunkSizeMB 50
powershell -ExecutionPolicy Bypass -File "scripts\compress_split.ps1" -SourceDir "runtime" -OutputDir "native_sdk" -ArchiveName "runtime" -ChunkSizeMB 50
```

### 清理并重新解压

如果怀疑解压的文件有问题：

```bat
# 1. 删除已解压的目录
rmdir /s /q host
rmdir /s /q runtime

# 2. 重新运行构建脚本（会自动解压）
scripts\build.bat
```

