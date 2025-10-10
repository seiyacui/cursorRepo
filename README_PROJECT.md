# 📹 YouTube视频批量下载管理器

一个基于 Node.js + PostgreSQL + 纯HTML/CSS 的 YouTube 视频批量下载和数据管理系统。

## ✨ 功能特性

### 核心功能

1. **批量下载YouTube视频**
   - 支持批量输入多个视频URL
   - 支持多种视频格式：MP4, MKV, WebM
   - 支持多种视频质量：最佳、1080p、720p、480p
   - 可选同时下载音频（MP3, AAC, WAV）
   - 并发下载支持（默认3个并发）

2. **数据库管理**
   - PostgreSQL 存储视频元数据
   - 完整的视频信息（标题、时长、大小、格式等）
   - 支持按多种条件搜索和过滤

3. **实时进度显示**
   - 实时下载进度条
   - 累计耗时统计
   - 已完成/失败数量统计
   - 下载完成后的详细报告

4. **多格式导出**
   - HTML：美观的网页格式
   - PDF：适合打印的PDF文档
   - Markdown：纯文本格式
   - PNG：图片截图格式

5. **多渠道通知**
   - WxPusher（微信推送）
   - PushPlus（微信推送）
   - Resend（邮件通知）
   - Telegram（电报通知）

6. **搜索和过滤**
   - 关键字搜索（标题、文件名、作者）
   - 状态过滤（已完成、下载中、等待中、失败）
   - 时间范围过滤

## 🏗️ 技术架构

### 后端技术栈
- **Node.js**: 运行时环境
- **Express**: Web框架
- **PostgreSQL**: 数据库
- **yt-dlp-wrap**: YouTube下载库
- **Puppeteer**: PDF/PNG导出
- **Axios**: HTTP客户端

### 前端技术栈
- **纯HTML/CSS/JavaScript**: 无框架依赖
- **现代CSS**: 渐变、动画、响应式设计
- **原生JavaScript**: 无需额外库

## 📦 安装部署

### 1. 环境要求

- Node.js 16+ 
- PostgreSQL 12+
- yt-dlp (可选，会自动通过npm包安装)

### 2. 安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 或使用 yarn
yarn install
```

### 3. 配置数据库

创建 PostgreSQL 数据库：

```sql
CREATE DATABASE youtube_downloader;
```

配置 `.env` 文件（参考 `.env.example`）：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=youtube_downloader
```

初始化数据库表：

```bash
npm run init-db
```

### 4. 配置通知（可选）

在 `.env` 文件中配置通知渠道的凭证：

```env
# WxPusher 配置
WXPUSHER_TOKEN=your_token
WXPUSHER_UID=your_uid

# PushPlus 配置
PUSHPLUS_TOKEN=your_token

# Resend 邮件配置
RESEND_API_KEY=your_api_key
RESEND_TO_EMAIL=your_email

# Telegram 配置
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 5. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

访问 http://localhost:3000 即可使用系统。

## 📖 使用指南

### 下载视频

1. 在"下载配置"区域输入 YouTube 视频地址（每行一个）
2. 选择视频格式和质量
3. 可选：勾选"同时下载音频"并选择音频格式
4. 点击"开始下载"按钮
5. 实时查看下载进度和统计信息

### 搜索和过滤

1. 在搜索框输入关键字
2. 选择状态过滤器
3. 选择日期范围
4. 点击"搜索"按钮

### 导出列表

1. 选择导出格式（HTML/PDF/Markdown/PNG）
2. 点击"导出列表"按钮
3. 导出文件会自动下载

### 下载已完成的文件

- 在视频列表中，点击"📥 视频"或"🎵 音频"按钮下载文件
- 或在下载报告中点击"查看下载链接"统一下载

## 🗂️ 项目结构

```
youtube-downloader/
├── config/
│   └── database.js          # 数据库配置
├── models/
│   └── video.js             # 视频数据模型
├── routes/
│   └── videos.js            # API 路由
├── services/
│   ├── download.js          # 下载服务
│   └── notification.js      # 通知服务
├── utils/
│   └── export.js            # 导出工具
├── scripts/
│   └── init-database.js     # 数据库初始化脚本
├── public/
│   ├── index.html           # 前端页面
│   ├── style.css            # 样式文件
│   └── app.js               # 前端逻辑
├── downloads/               # 下载文件存储目录
│   ├── videos/
│   └── audios/
├── exports/                 # 导出文件存储目录
├── server.js                # 主服务器文件
├── package.json             # 项目配置
├── .env                     # 环境变量
└── README.md                # 说明文档
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| DB_USER | 数据库用户 | postgres |
| DB_PASSWORD | 数据库密码 | - |
| DB_NAME | 数据库名称 | youtube_downloader |
| PORT | 服务端口 | 3000 |
| DOWNLOAD_PATH | 下载文件保存路径 | ./downloads |
| MAX_CONCURRENT_DOWNLOADS | 最大并发下载数 | 3 |

### 并发下载

在 `.env` 文件中修改 `MAX_CONCURRENT_DOWNLOADS` 来调整并发数：

```env
MAX_CONCURRENT_DOWNLOADS=5  # 同时下载5个视频
```

## 🎨 前端界面

系统采用现代化、响应式设计：

- **渐变色主题**: 紫色渐变，视觉效果优雅
- **实时反馈**: 所有操作都有实时反馈
- **Toast通知**: 操作结果即时通知
- **响应式布局**: 支持各种屏幕尺寸
- **中文优化**: 完美支持中文字符，无乱码

## 🔔 通知功能

系统在以下情况会发送通知：

1. **批量下载完成**: 包含成功/失败统计、总耗时等信息
2. **单个视频下载完成**: 包含视频详情、文件大小等

通知内容包括：
- 视频标题和文件名
- 下载状态（成功/失败）
- 文件大小和格式
- 下载耗时
- 错误信息（如果失败）

## 📊 数据库表结构

### videos 表
存储视频下载记录和元数据

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | SERIAL | 主键 |
| video_url | VARCHAR | 视频URL |
| video_id | VARCHAR | YouTube视频ID |
| title | VARCHAR | 视频标题 |
| filename | VARCHAR | 文件名 |
| video_format | VARCHAR | 视频格式 |
| audio_format | VARCHAR | 音频格式 |
| duration | INTEGER | 时长（秒） |
| video_size | BIGINT | 视频文件大小 |
| audio_size | BIGINT | 音频文件大小 |
| download_status | VARCHAR | 下载状态 |
| created_at | TIMESTAMP | 创建时间 |
| ... | ... | ... |

## 🚀 API 文档

### 下载视频
```
POST /api/videos/download
Content-Type: application/json

{
  "urls": ["https://youtube.com/watch?v=xxx"],
  "videoFormat": "mp4",
  "audioFormat": "mp3",
  "downloadAudio": true,
  "quality": "best"
}
```

### 获取视频列表
```
GET /api/videos?page=1&limit=20&keyword=test&status=completed
```

### 导出列表
```
POST /api/videos/export
Content-Type: application/json

{
  "format": "pdf",
  "filters": {
    "status": "completed"
  }
}
```

### 获取统计信息
```
GET /api/videos/stats/summary
```

## ⚠️ 注意事项

1. **版权问题**: 请确保你有权下载相关视频，遵守YouTube的服务条款
2. **磁盘空间**: 批量下载前请确保有足够的磁盘空间
3. **网络带宽**: 并发下载会占用较多带宽
4. **数据库备份**: 建议定期备份PostgreSQL数据库
5. **文件管理**: 定期清理不需要的下载文件

## 🐛 故障排除

### 下载失败

1. 检查网络连接
2. 确认YouTube视频是否可访问
3. 查看服务器日志获取详细错误信息
4. 尝试降低并发数

### 数据库连接失败

1. 检查PostgreSQL是否运行
2. 验证数据库配置信息
3. 确认数据库已创建

### 导出失败

1. 确保 Puppeteer 正常安装
2. 检查磁盘空间
3. 查看服务器日志

## 📝 开发计划

- [ ] 支持更多视频平台（Bilibili、Vimeo等）
- [ ] 添加用户认证系统
- [ ] 实现视频预览功能
- [ ] 支持播放列表批量下载
- [ ] 添加视频剪辑功能
- [ ] 实现云存储集成

## 📄 许可证

MIT License

## 👨‍💻 作者

开发者：AI Assistant
时间：2025-10

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Express](https://expressjs.com/) - Web框架
- [PostgreSQL](https://www.postgresql.org/) - 数据库
- [Puppeteer](https://pptr.dev/) - 浏览器自动化工具
