# 🚀 快速开始指南

## 一键安装（推荐）

```bash
# 运行安装脚本
./setup.sh
```

安装脚本会自动：
- ✅ 检查依赖（Node.js, PostgreSQL, yt-dlp）
- ✅ 安装 npm 包
- ✅ 创建配置文件
- ✅ 创建下载目录
- ✅ 初始化数据库

## 手动安装

### 1. 安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 安装 yt-dlp (如未安装)
brew install yt-dlp
```

### 2. 配置环境

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置（修改数据库密码等）
nano .env
```

### 3. 初始化数据库

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE youtube_downloader;"

# 初始化表结构
npm run init-db
```

### 4. 启动服务

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

### 5. 访问应用

打开浏览器访问: **http://localhost:3000**

## ⚡ 使用示例

### 批量下载视频

1. 在输入框中粘贴 YouTube 视频链接（每行一个）：
```
https://www.youtube.com/watch?v=xxxxx
https://www.youtube.com/watch?v=yyyyy
https://www.youtube.com/watch?v=zzzzz
```

2. 选择视频格式：**MP4**（推荐）
3. 选择质量：**最佳质量**
4. 勾选 **"同时下载音频"**，选择 **MP3** 格式
5. 点击 **"开始下载"**

### 实时监控

下载过程中可以看到：
- 📊 每个视频的下载进度
- ⚡ 下载速度
- ⏱️ 预计剩余时间
- 📈 批次总体进度

### 搜索和管理

- 🔍 在搜索框输入关键字查找视频
- 📅 选择日期范围筛选
- 📥 点击 "视频" 或 "音频" 按钮下载文件
- 🗑️ 点击 "删除" 按钮移除记录和文件

### 导出数据

点击导出按钮，支持格式：
- 📄 **HTML** - 精美的网页报告
- 📝 **Markdown** - Markdown 文档
- 📕 **PDF** - PDF 文档
- 🖼️ **PNG** - 截图

## 🔧 常用命令

```bash
# 启动服务器
npm start

# 开发模式（自动重启）
npm run dev

# 初始化/重置数据库
npm run init-db

# 查看日志
tail -f logs/app.log

# 检查 yt-dlp 版本
yt-dlp --version

# 更新 yt-dlp
brew upgrade yt-dlp
```

## 🎯 配置优化

### 提高下载速度

编辑 `.env` 文件：
```env
# 增加并发下载数（根据网络和机器性能调整）
MAX_CONCURRENT_DOWNLOADS=5
```

### 更改下载目录

```env
# 指定自定义下载目录
DOWNLOAD_DIR=/path/to/your/downloads
```

### 配置通知

```env
# WxPusher
WXPUSHER_TOKEN=your_token
WXPUSHER_UID=your_uid

# PushPlus
PUSHPLUS_TOKEN=your_token

# Email
RESEND_API_KEY=your_api_key
RESEND_TO_EMAIL=your_email

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## 🐛 常见问题

### Q: 下载失败 "yt-dlp: command not found"
**A:** 安装 yt-dlp: `brew install yt-dlp`

### Q: 数据库连接失败
**A:** 检查 PostgreSQL 是否运行: `brew services start postgresql`

### Q: 下载速度慢
**A:** 增加 `MAX_CONCURRENT_DOWNLOADS` 值，或检查网络连接

### Q: 视频质量不理想
**A:** 选择 "最佳质量" 选项，或尝试不同的视频格式

### Q: 中文显示乱码
**A:** 确保浏览器编码设置为 UTF-8

## 📞 获取帮助

- 📖 查看完整文档: [README.md](README.md)
- 🐛 报告问题: 提交 GitHub Issue
- 💬 讨论交流: GitHub Discussions

## 🎉 开始使用

现在可以开始批量下载 YouTube 视频了！

```bash
npm start
# 访问 http://localhost:3000
```

享受便捷的批量下载体验！ 🚀
