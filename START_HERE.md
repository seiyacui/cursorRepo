# 🚀 从这里开始

欢迎使用 **YouTube视频批量下载管理器**！

---

## ⚡ 超快速启动（3步）

如果你很着急，只需3步：

```bash
# 1. 安装依赖
npm install

# 2. 配置数据库（编辑 .env 文件，设置数据库密码）
# 然后初始化数据库
npm run init-db

# 3. 启动服务
npm start
```

访问 http://localhost:3000 即可使用！

---

## 📚 选择你的学习路径

根据你的需求，选择合适的文档：

### 🏃 我想快速开始（推荐新手）
👉 阅读 [`QUICKSTART.md`](QUICKSTART.md)
- 5分钟完成部署
- 第一次使用教程
- 常见问题解答

### 🔧 我需要详细的安装步骤
👉 阅读 [`SETUP_GUIDE.md`](SETUP_GUIDE.md)
- 完整的安装指南
- 环境配置说明
- 通知渠道配置
- 性能优化建议

### 💡 我想看使用示例
👉 阅读 [`USAGE_EXAMPLES.md`](USAGE_EXAMPLES.md)
- 10个实际场景
- API调用示例
- 自动化脚本
- 最佳实践

### 🏗️ 我想了解技术架构
👉 阅读 [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md)
- 技术栈说明
- 数据库设计
- API文档
- 核心功能实现
- 扩展计划

### 📖 我需要完整参考
👉 阅读 [`README_PROJECT.md`](README_PROJECT.md)
- 项目完整文档
- 所有功能特性
- API参考
- 故障排除

---

## 🎯 核心功能一览

✅ **批量下载** - 同时下载多个YouTube视频  
✅ **多种格式** - MP4/MKV/WebM + MP3/AAC/WAV  
✅ **实时进度** - 查看下载进度和统计  
✅ **搜索过滤** - 快速找到你的视频  
✅ **多格式导出** - HTML/PDF/Markdown/PNG  
✅ **通知推送** - 4个渠道自动通知  
✅ **并发下载** - 智能并发控制  
✅ **完美中文** - 无乱码支持  

---

## 🔍 快速检查

在开始之前，确认以下内容：

### ✅ 环境要求
- [ ] Node.js 16+ 已安装
- [ ] PostgreSQL 12+ 已安装
- [ ] npm 或 yarn 可用

### ✅ 数据库准备
- [ ] PostgreSQL 正在运行
- [ ] 已创建 `youtube_downloader` 数据库
- [ ] `.env` 文件已配置

### ✅ 依赖安装
- [ ] 已运行 `npm install`
- [ ] 已运行 `npm run init-db`

---

## 🎬 第一次使用

启动服务后，你可以：

### 1. 下载第一个视频
在"下载配置"区域输入一个YouTube URL，选择格式，点击"开始下载"。

### 2. 查看下载列表
在"视频列表"区域查看所有已下载的视频。

### 3. 搜索视频
使用搜索功能快速找到特定视频。

### 4. 导出报告
选择导出格式，生成美观的下载报告。

---

## 🐛 遇到问题？

### 常见问题

**Q: 数据库连接失败**
```
A: 检查 PostgreSQL 是否运行，.env 配置是否正确
```

**Q: 端口被占用**
```
A: 在 .env 中修改 PORT=3001
```

**Q: 下载失败**
```
A: 检查网络连接和YouTube URL是否有效
```

查看完整的故障排除指南：[`SETUP_GUIDE.md`](SETUP_GUIDE.md)

---

## 📞 获取帮助

1. **查看文档** - 5个详细文档涵盖所有方面
2. **运行测试** - `./test-api.sh` 检查API状态
3. **查看日志** - 检查服务器日志获取详细错误

---

## 🎉 准备好了吗？

选择一个开始路径：

- 🏃 **快速开始** → [`QUICKSTART.md`](QUICKSTART.md)
- 🔧 **详细设置** → [`SETUP_GUIDE.md`](SETUP_GUIDE.md)
- 💡 **使用示例** → [`USAGE_EXAMPLES.md`](USAGE_EXAMPLES.md)

或者直接运行：

```bash
npm install && npm run init-db && npm start
```

---

**祝你使用愉快！** 🚀

如果这个项目对你有帮助，请给个星标 ⭐️
