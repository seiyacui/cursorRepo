# 🎥 YouTube 批量下载器 & 管理器

一个功能强大的 YouTube 视频批量下载和管理系统，基于 Node.js + PostgreSQL + 纯 HTML/CSS 构建。

## ✨ 功能特性

### 📥 批量下载
- **批量输入**: 支持一次性输入多个 YouTube 视频链接
- **格式选择**: 支持多种视频格式 (MP4, MKV, WebM, 最佳清晰度)
- **音频下载**: 可选择同时下载音频文件 (MP3, AAC, WAV, 最佳音质)
- **实时进度**: 实时显示每个视频的下载进度、速度和预计剩余时间
- **下载报告**: 下载完成后提供详细的统计报告

### 📊 数据管理
- **数据存储**: 所有视频信息存储在 PostgreSQL 数据库
- **列表展示**: 显示文件名、格式、时长、大小、创建日期等详细信息
- **搜索过滤**: 支持按关键字、时间范围、状态进行搜索
- **批量操作**: 支持批量选择和导出

### 📄 多格式导出
支持导出为以下格式：
- **HTML**: 网页格式，包含完整样式
- **PDF**: PDF 文档，适合打印和分享
- **Markdown**: Markdown 格式，便于编辑
- **PNG**: 图片格式，视觉化展示

### 📢 通知系统
下载完成后自动发送通知到 4 个渠道：
1. **WxPusher**: 微信推送通知
2. **PushPlus**: 推送加通知
3. **Resend Email**: 电子邮件通知
4. **Telegram**: Telegram 机器人通知

### 🌐 实时交互
- **WebSocket 连接**: 实时更新下载进度
- **进度条显示**: 可视化显示每个视频的下载进度
- **耗时统计**: 实时显示累计下载时间
- **状态指示**: 实时显示连接状态和下载状态

### 🎨 现代化 UI
- **响应式设计**: 完美适配桌面和移动设备
- **渐变配色**: 美观的紫色渐变主题
- **流畅动画**: 丝滑的过渡效果和动画
- **中文支持**: 完整的中文界面，无乱码问题

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 14.x
- **PostgreSQL**: >= 12.x
- **yt-dlp**: 已安装并配置在系统 PATH 中

### 安装 yt-dlp (MacOS)

```bash
# 使用 Homebrew 安装
brew install yt-dlp

# 或使用 pip 安装
pip install yt-dlp

# 验证安装
yt-dlp --version
```

### 安装依赖

```bash
# 安装 Node.js 依赖
npm install
```

### 配置数据库

1. 创建 PostgreSQL 数据库：

```bash
# 登录 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE youtube_downloader;

# 退出
\q
```

2. 配置环境变量：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
nano .env
```

3. 初始化数据库：

```bash
npm run init-db
```

### 环境变量配置

编辑 `.env` 文件，配置以下参数：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_downloader
DB_USER=postgres
DB_PASSWORD=your_password

# 服务器配置
PORT=3000

# 通知配置 - WxPusher (可选)
WXPUSHER_TOKEN=your_wxpusher_token
WXPUSHER_UID=your_wxpusher_uid

# 通知配置 - PushPlus (可选)
PUSHPLUS_TOKEN=your_pushplus_token

# 通知配置 - Resend Email (可选)
RESEND_API_KEY=your_resend_api_key
RESEND_TO_EMAIL=your_email@example.com

# 通知配置 - Telegram (可选)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# 下载配置
DOWNLOAD_DIR=./downloads
YT_DLP_PATH=yt-dlp
```

### 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 📖 使用指南

### 1. 批量下载视频

1. 在"批量下载视频"区域的文本框中输入 YouTube 视频链接（每行一个）
2. 选择视频格式（MP4、MKV、WebM 或最佳清晰度）
3. 如需下载音频，勾选"同时下载音频"并选择音频格式
4. 点击"开始下载"按钮
5. 实时查看每个视频的下载进度

### 2. 搜索和筛选

1. 在"搜索与筛选"区域输入关键字
2. 选择日期范围（可选）
3. 选择状态过滤（已完成、下载中、失败等）
4. 点击"搜索"按钮

### 3. 导出列表

1. 在视频列表中选择要导出的视频（或导出全部）
2. 点击相应的导出按钮（HTML、PDF、Markdown、PNG）
3. 浏览器将自动下载生成的文件

### 4. 下载视频/音频文件

在视频列表的"操作"列中：
- 点击"视频"按钮下载视频文件
- 点击"音频"按钮下载音频文件
- 点击"删除"按钮删除记录和文件

## 🏗️ 项目结构

```
youtube-batch-downloader/
├── db/                      # 数据库相关
│   ├── database.js         # 数据库连接
│   ├── schema.sql          # 数据库结构
│   └── init.js             # 初始化脚本
├── services/                # 服务模块
│   ├── downloader.js       # 下载服务
│   ├── notification.js     # 通知服务
│   ├── exporter.js         # 导出服务
│   └── websocket.js        # WebSocket 服务
├── public/                  # 前端文件
│   ├── index.html          # 主页面
│   ├── styles.css          # 样式文件
│   └── app.js              # 前端逻辑
├── downloads/               # 下载目录
├── exports/                 # 导出文件目录
├── server.js                # 主服务器
├── package.json             # 项目配置
├── .env.example             # 环境变量模板
└── README_ZH.md             # 中文说明文档
```

## 🔧 API 接口

### 批量下载
```
POST /api/download/batch
Body: {
  "urls": ["url1", "url2", ...],
  "videoFormat": "mp4",
  "audioFormat": "mp3",
  "downloadAudio": true
}
```

### 获取视频列表
```
GET /api/videos?search=关键字&dateFrom=2024-01-01&dateTo=2024-12-31&status=completed
```

### 获取单个视频
```
GET /api/videos/:id
```

### 删除视频
```
DELETE /api/videos/:id
```

### 导出视频列表
```
POST /api/export
Body: {
  "format": "html|pdf|markdown|png",
  "videoIds": [1, 2, 3] // 可选，不传则导出全部
}
```

### 获取统计信息
```
GET /api/stats
```

## 🔌 WebSocket 事件

### 客户端接收事件

- `connected`: 连接建立
- `download_start`: 开始下载
- `download_progress`: 下载进度更新
- `download_complete`: 下载完成
- `download_error`: 下载失败
- `batch_complete`: 批量下载完成

## 📢 通知配置说明

### WxPusher

1. 访问 [WxPusher 官网](https://wxpusher.zjiecode.com/)
2. 注册并创建应用
3. 获取 `APP_TOKEN` 和 `UID`
4. 配置到 `.env` 文件

### PushPlus

1. 访问 [PushPlus 官网](http://www.pushplus.plus/)
2. 注册并获取 Token
3. 配置到 `.env` 文件

### Resend Email

1. 访问 [Resend 官网](https://resend.com/)
2. 注册并获取 API Key
3. 配置 API Key 和接收邮箱到 `.env` 文件

### Telegram

1. 在 Telegram 中找到 @BotFather
2. 创建机器人并获取 Bot Token
3. 获取你的 Chat ID
4. 配置到 `.env` 文件

## ⚠️ 注意事项

1. **下载速度**: 取决于网络环境和 YouTube 服务器
2. **磁盘空间**: 确保有足够的磁盘空间存储下载的视频
3. **合法使用**: 请遵守 YouTube 服务条款和版权法律
4. **通知配置**: 通知功能为可选，未配置不影响下载功能
5. **中文编码**: 所有文件均使用 UTF-8 编码，确保正确显示中文

## 🐛 故障排除

### yt-dlp 未找到

```bash
# 检查 yt-dlp 是否安装
which yt-dlp

# 如未安装，使用 Homebrew 安装（MacOS）
brew install yt-dlp
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
pg_isready

# 检查 .env 中的数据库配置是否正确
```

### 下载失败

1. 检查 YouTube 视频链接是否有效
2. 检查网络连接
3. 更新 yt-dlp 到最新版本：`brew upgrade yt-dlp`

### 导出 PDF/PNG 失败

确保已正确安装 puppeteer 的依赖：

```bash
# MacOS
brew install chromium

# 或使用项目内置的 Chromium
npm install puppeteer
```

## 📝 更新日志

### v1.0.0 (2024-10-10)

- ✅ 批量下载 YouTube 视频
- ✅ 支持多种视频和音频格式
- ✅ PostgreSQL 数据库存储
- ✅ 实时进度显示
- ✅ 多格式导出（HTML、PDF、Markdown、PNG）
- ✅ 4 种通知渠道
- ✅ 现代化响应式 Web 界面
- ✅ 完整的中文支持

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请提交 Issue。

---

**注意**: 本工具仅供学习和研究使用，请遵守 YouTube 服务条款和相关法律法规。
