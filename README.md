# 🎬 YouTube视频批量下载器

一个基于Node.js + PostgreSQL + 纯HTML/CSS的YouTube视频批量下载和数据管理工具。

## ✨ 功能特性

### 🚀 核心功能
- **批量下载**: 支持批量输入YouTube视频地址，一键下载
- **多格式支持**: 支持MP4、MKV、WebM等视频格式
- **音频下载**: 可选择同时下载音频文件（MP3、AAC、WAV、FLAC）
- **质量选择**: 支持最佳质量、1080p、720p等多种清晰度选项
- **并发下载**: 支持多线程并发下载，提高效率

### 📊 数据管理
- **数据库存储**: 使用PostgreSQL存储视频元数据
- **实时搜索**: 支持按关键字、时间范围搜索视频
- **统计分析**: 提供下载统计和数据分析
- **文件管理**: 自动管理下载的视频、音频和缩略图文件

### 🔄 实时交互
- **进度显示**: 实时显示下载进度和累计耗时
- **WebSocket通信**: 实时更新下载状态
- **下载报告**: 完成后提供详细的下载报告

### 📤 数据导出
- **多格式导出**: 支持HTML、PDF、Markdown、PNG格式导出
- **筛选导出**: 可导出全部数据或当前筛选结果
- **美观报告**: 生成专业的数据报告

### 📱 通知推送
- **多渠道通知**: 支持WxPusher、PushPlus、邮件、Telegram四种通知方式
- **下载完成通知**: 自动发送下载完成通知
- **错误通知**: 下载失败时及时通知

### 🎨 用户界面
- **现代化设计**: 采用渐变背景和毛玻璃效果
- **响应式布局**: 支持桌面和移动设备
- **中文友好**: 完全支持中文，避免乱码问题

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **数据库**: PostgreSQL
- **前端**: 纯HTML/CSS/JavaScript
- **实时通信**: Socket.io
- **下载引擎**: yt-dlp
- **PDF生成**: Puppeteer
- **通知服务**: 多渠道推送

## 📋 系统要求

- Node.js 16.0+
- PostgreSQL 12.0+
- yt-dlp (YouTube下载工具)
- 足够的磁盘空间存储视频文件

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd youtube-batch-downloader
```

### 2. 安装依赖
```bash
npm install
```

### 3. 安装yt-dlp
```bash
# macOS
brew install yt-dlp

# Ubuntu/Debian
sudo apt install yt-dlp

# 或从官网下载: https://github.com/yt-dlp/yt-dlp
```

### 4. 配置数据库
```bash
# 创建PostgreSQL数据库
createdb youtube_downloader

# 配置环境变量
cp .env.example .env
# 编辑.env文件，设置数据库连接信息
```

### 5. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 6. 访问应用
打开浏览器访问: http://localhost:3000

## ⚙️ 配置说明

### 环境变量配置 (.env)
```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_downloader
DB_USER=postgres
DB_PASSWORD=your_password

# 服务器配置
PORT=3000
NODE_ENV=development

# 下载配置
DOWNLOAD_PATH=./downloads
MAX_CONCURRENT_DOWNLOADS=3

# 通知配置
WXPUSHER_TOKEN=your_wxpusher_token
WXPUSHER_UID=your_wxpusher_uid
PUSHPLUS_TOKEN=your_pushplus_token
RESEND_API_KEY=your_resend_api_key
RESEND_TO_EMAIL=your_email@example.com
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

## 📖 使用指南

### 1. 批量下载视频
1. 在输入框中粘贴YouTube视频地址（每行一个）
2. 选择视频格式和质量
3. 可选择是否同时下载音频
4. 点击"开始批量下载"按钮
5. 实时查看下载进度

### 2. 管理视频库
- 使用搜索功能查找特定视频
- 按时间范围筛选视频
- 查看视频详细信息和统计数据
- 下载已完成的视频和音频文件

### 3. 导出数据
- 点击"导出数据"按钮
- 选择导出格式（HTML/PDF/Markdown/PNG）
- 选择导出范围（全部数据或筛选结果）
- 下载生成的报告文件

## 🔧 API接口

### 视频管理
- `POST /api/download/batch` - 批量下载视频
- `GET /api/videos` - 获取视频列表
- `DELETE /api/videos/:id` - 删除视频记录

### 文件操作
- `GET /api/files/download/:videoId/:type` - 下载视频/音频文件
- `GET /api/files/thumbnail/:filename` - 获取缩略图

### 数据导出
- `GET /api/export` - 导出数据

### 统计信息
- `GET /api/stats` - 获取统计数据

## 📁 项目结构

```
youtube-batch-downloader/
├── config/                 # 配置文件
│   └── database.js         # 数据库配置
├── db/                     # 数据库相关
│   └── schema.sql          # 数据库模式
├── models/                 # 数据模型
│   ├── Video.js           # 视频模型
│   └── DownloadTask.js    # 下载任务模型
├── routes/                 # 路由
│   └── api.js             # API路由
├── services/              # 服务层
│   ├── downloadService.js # 下载服务
│   └── exportService.js   # 导出服务
├── public/                # 前端静态文件
│   ├── index.html         # 主页面
│   ├── css/
│   │   └── style.css      # 样式文件
│   └── js/
│       └── app.js         # 前端JavaScript
├── downloads/             # 下载文件存储目录
├── notification.js        # 通知服务
├── server.js             # 服务器入口
├── package.json          # 项目配置
└── README.md            # 项目说明
```

## 🎯 核心特性详解

### 并发下载
- 支持同时下载多个视频
- 可配置最大并发数量
- 智能队列管理，避免系统过载

### 实时进度
- WebSocket实时通信
- 详细的进度信息显示
- 下载速度和剩余时间估算

### 数据导出
- 支持4种导出格式
- 美观的报告模板
- 可自定义导出内容

### 通知系统
- 支持4种通知渠道
- 自动发送下载完成通知
- 详细的下载报告

## 🔒 安全考虑

- 输入验证和过滤
- SQL注入防护
- 文件路径安全检查
- 错误信息脱敏

## 🐛 故障排除

### 常见问题

1. **yt-dlp未找到**
   - 确保已安装yt-dlp
   - 检查PATH环境变量

2. **数据库连接失败**
   - 检查PostgreSQL服务状态
   - 验证数据库配置信息

3. **下载失败**
   - 检查网络连接
   - 验证YouTube URL格式
   - 查看服务器日志

4. **通知发送失败**
   - 检查通知服务配置
   - 验证API密钥和令牌

## 📝 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持批量下载YouTube视频
- 实现数据库存储和管理
- 添加实时进度显示
- 支持多格式数据导出
- 集成多渠道通知推送

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的YouTube下载工具
- [Express.js](https://expressjs.com/) - Web应用框架
- [Socket.io](https://socket.io/) - 实时通信
- [PostgreSQL](https://www.postgresql.org/) - 数据库
- [Puppeteer](https://pptr.dev/) - PDF生成

## 📞 支持

如有问题或建议，请提交Issue或联系开发者。

---

🎬 **YouTube批量下载器** - 让视频下载变得简单高效！