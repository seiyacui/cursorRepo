# 🎬 YouTube 视频批量下载器

基于 Node.js + PostgreSQL + WebUI 的 YouTube 视频批量下载和数据管理工具。

## ✨ 功能特性

### 核心功能
- ✅ **批量下载**: 支持同时下载多个 YouTube 视频
- ✅ **多格式支持**: 视频格式 (MP4, MKV, WebM)，音频格式 (MP3, AAC, WAV, M4A)
- ✅ **并发下载**: 支持配置并发下载数量，提高下载效率
- ✅ **实时进度**: WebSocket 实时显示下载进度、速度和预计时间
- ✅ **数据管理**: PostgreSQL 存储视频元数据，支持搜索和筛选
- ✅ **多格式导出**: 支持导出为 HTML, PDF, Markdown, PNG 格式
- ✅ **四通道通知**: 下载完成后通过 WxPusher、PushPlus、Resend Email、Telegram 发送通知
- ✅ **中文支持**: 完整的 UTF-8 编码支持，无乱码问题

### 界面特性
- 🎨 现代化 UI 设计，渐变色主题
- 📊 实时统计信息展示
- 🔍 关键字和时间范围搜索
- 📥 视频和音频文件下载链接
- 📱 响应式设计，支持移动端

## 🚀 快速开始

### 前置要求

1. **Node.js** (v14 或更高版本)
2. **PostgreSQL** (v12 或更高版本)
3. **yt-dlp** (必须预先安装)

#### 安装 yt-dlp (macOS)

```bash
# 使用 Homebrew 安装
brew install yt-dlp

# 或使用 pip 安装
pip3 install yt-dlp

# 验证安装
yt-dlp --version
```

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd youtube-video-downloader
```

2. **安装依赖**
```bash
npm install
```

3. **配置数据库**

创建 PostgreSQL 数据库:
```bash
psql -U postgres
CREATE DATABASE youtube_downloader;
\q
```

4. **配置环境变量**

复制 `.env.example` 到 `.env` 并修改配置:
```bash
cp .env.example .env
```

编辑 `.env` 文件，设置数据库连接信息:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_downloader
DB_USER=postgres
DB_PASSWORD=your_password
```

5. **初始化数据库**
```bash
npm run init-db
```

6. **启动服务器**
```bash
npm start
```

服务器将运行在 `http://localhost:3000`

## 📖 使用说明

### 1. 批量下载视频

1. 打开浏览器访问 `http://localhost:3000`
2. 在 "YouTube 视频地址列表" 输入框中，每行输入一个视频 URL
3. 选择视频格式和质量
4. 勾选 "同时下载音频" 并选择音频格式（如需要）
5. 点击 "开始下载" 按钮

### 2. 监控下载进度

下载开始后，进度区域会自动显示：
- 实时进度条
- 下载速度
- 预计剩余时间
- 批次总体进度

### 3. 搜索和筛选

使用搜索功能查找已下载的视频：
- 输入关键字搜索标题或文件名
- 选择日期范围筛选
- 点击 "搜索" 或 "重置"

### 4. 导出数据

点击导出按钮，选择格式：
- **HTML**: 网页格式，可在浏览器中查看
- **Markdown**: Markdown 文档格式
- **PDF**: PDF 文档格式
- **PNG**: 截图格式

### 5. 下载文件

在视频列表中，点击对应的 "视频" 或 "音频" 按钮即可下载文件。

## 🔔 通知配置

本项目支持四种通知渠道，在 `.env` 文件中配置：

```env
# WxPusher (微信推送)
WXPUSHER_TOKEN=your_token
WXPUSHER_UID=your_uid

# PushPlus
PUSHPLUS_TOKEN=your_token

# Resend Email
RESEND_API_KEY=your_api_key
RESEND_TO_EMAIL=your_email

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

下载完成后，系统会自动发送通知到配置的所有渠道。

## ⚙️ 配置选项

### 环境变量

| 变量 | 说明 | 默认值 |
|-----|------|--------|
| `PORT` | 服务器端口 | 3000 |
| `DOWNLOAD_DIR` | 下载目录 | ./downloads |
| `MAX_CONCURRENT_DOWNLOADS` | 最大并发下载数 | 3 |
| `DB_HOST` | 数据库主机 | localhost |
| `DB_PORT` | 数据库端口 | 5432 |
| `DB_NAME` | 数据库名称 | youtube_downloader |
| `DB_USER` | 数据库用户 | postgres |
| `DB_PASSWORD` | 数据库密码 | postgres |

### 支持的格式

**视频格式:**
- MP4 (推荐)
- MKV
- WebM

**音频格式:**
- MP3 (推荐)
- AAC
- WAV
- M4A

**视频质量:**
- 最佳质量
- 1080p
- 720p
- 480p

## 📁 项目结构

```
youtube-video-downloader/
├── db/
│   ├── init.js           # 数据库初始化脚本
│   └── database.js       # 数据库操作模块
├── services/
│   ├── downloader.js     # 下载服务模块
│   ├── export.js         # 导出服务模块
│   └── notificationAdapter.js  # 通知适配器
├── public/
│   ├── index.html        # 前端页面
│   ├── styles.css        # 样式文件
│   └── app.js            # 前端逻辑
├── downloads/            # 下载文件目录
│   ├── videos/           # 视频文件
│   └── audio/            # 音频文件
├── notification.js       # 通知服务模块
├── server.js             # 主服务器
├── package.json          # 项目配置
├── .env                  # 环境变量
└── README.md             # 说明文档
```

## 🔧 API 接口

### GET /api/videos
获取视频列表

**查询参数:**
- `keyword`: 搜索关键字
- `startDate`: 开始日期
- `endDate`: 结束日期
- `limit`: 返回数量限制

### POST /api/download
批量下载视频

**请求体:**
```json
{
  "urls": ["url1", "url2"],
  "videoFormat": "mp4",
  "audioFormat": "mp3",
  "downloadAudio": true,
  "quality": "best"
}
```

### POST /api/export
导出视频列表

**请求体:**
```json
{
  "format": "html|pdf|markdown|png",
  "filters": {
    "keyword": "搜索词",
    "startDate": "2023-01-01",
    "endDate": "2023-12-31"
  }
}
```

### GET /api/statistics
获取统计信息

### DELETE /api/videos/:id
删除视频记录和文件

### GET /api/queue-status
获取下载队列状态

## 🐛 故障排除

### 1. yt-dlp 未找到
```bash
# 确认 yt-dlp 已安装
which yt-dlp

# 如果未安装，使用 Homebrew 安装
brew install yt-dlp
```

### 2. 数据库连接失败
- 检查 PostgreSQL 是否运行: `pg_isready`
- 检查 `.env` 中的数据库配置是否正确
- 确认数据库已创建: `psql -U postgres -l`

### 3. 下载失败
- 检查网络连接
- 确认视频 URL 有效
- 检查 yt-dlp 版本: `yt-dlp --version`
- 更新 yt-dlp: `brew upgrade yt-dlp`

### 4. 中文乱码
- 确认数据库编码为 UTF-8
- 检查终端支持 UTF-8
- 浏览器设置为 UTF-8 编码

## 📝 开发说明

### 开发模式

```bash
npm run dev
```

使用 nodemon 自动重启服务器。

### 数据库管理

```bash
# 重新初始化数据库
npm run init-db

# 连接到数据库
psql -U postgres -d youtube_downloader
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube 下载工具
- [Express](https://expressjs.com/) - Web 框架
- [PostgreSQL](https://www.postgresql.org/) - 数据库
- [ws](https://github.com/websockets/ws) - WebSocket 库
- [Puppeteer](https://pptr.dev/) - 无头浏览器

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- Email: seigneurtsui@goallez.dpdns.org
- GitHub Issues: 在项目仓库提交 Issue
