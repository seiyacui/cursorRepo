# YouTube视频批量下载器

一个功能强大的YouTube视频批量下载和管理工具，基于 Node.js + PostgreSQL + 纯HTML/CSS 构建。

## ✨ 主要特性

### 📥 下载功能
- ✅ 批量下载YouTube视频
- ✅ 支持多种视频格式（MP4、MKV、WebM）
- ✅ 可选择下载音频文件（MP3、AAC、WAV）
- ✅ 支持并发下载（可配置并发数）
- ✅ 实时显示下载进度和速度
- ✅ 自动获取视频元信息（标题、时长、缩略图等）

### 💾 数据管理
- ✅ PostgreSQL数据库存储视频元数据
- ✅ 记录完整的下载历史
- ✅ 支持关键字和时间范围搜索
- ✅ 视频列表分页显示
- ✅ 统计数据实时更新

### 📊 导出功能
- ✅ 导出为HTML（美观的报告格式）
- ✅ 导出为PDF文档
- ✅ 导出为Markdown格式
- ✅ 导出为PNG图片
- ✅ 支持中文字符（无乱码）

### 🔔 通知功能
- ✅ WxPusher（微信推送）
- ✅ PushPlus
- ✅ Resend Email（邮件通知）
- ✅ Telegram Bot
- ✅ 下载完成自动发送通知到所有配置的渠道

### 🎨 用户界面
- ✅ 现代化的响应式设计
- ✅ WebSocket实时进度更新
- ✅ 下载报告和链接展示
- ✅ 直观的视频列表管理
- ✅ 移动端友好

## 🚀 快速开始

### 前置要求

1. **Node.js** >= 14.x
2. **PostgreSQL** >= 12.x
3. **yt-dlp** (YouTube下载工具)

#### 安装 yt-dlp

**macOS:**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Windows:**
下载 [yt-dlp.exe](https://github.com/yt-dlp/yt-dlp/releases/latest) 并添加到系统PATH

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

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库和通知参数：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_downloader
DB_USER=postgres
DB_PASSWORD=your_password

# 服务器配置
PORT=3000

# 下载配置
DOWNLOAD_PATH=./downloads
CONCURRENT_DOWNLOADS=3

# 通知配置（可选）
WXPUSHER_TOKEN=your_token
WXPUSHER_UID=your_uid
PUSHPLUS_TOKEN=your_token
RESEND_API_KEY=your_api_key
RESEND_TO_EMAIL=your_email
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

4. **初始化数据库**

首先创建数据库：
```bash
psql -U postgres
CREATE DATABASE youtube_downloader WITH ENCODING 'UTF8';
\q
```

然后初始化表结构：
```bash
npm run init-db
```

或者手动执行：
```bash
psql -U postgres -d youtube_downloader -f init.sql
```

5. **启动服务**
```bash
npm start
```

开发模式（自动重启）：
```bash
npm run dev
```

6. **访问应用**

打开浏览器访问：http://localhost:3000

## 📖 使用指南

### 1. 添加下载任务

1. 在「添加下载任务」区域的文本框中输入YouTube视频URL（每行一个）
2. 选择视频格式（MP4/MKV/WebM）
3. 如需下载音频，勾选「同时下载音频」并选择音频格式
4. 点击「➕ 添加到列表」按钮
5. 等待视频信息获取完成

### 2. 开始下载

1. 添加视频后，「🚀 开始下载」按钮会被激活
2. 点击按钮开始批量下载
3. 在「下载进度」区域查看实时进度
4. 下载完成后会显示详细的下载报告

### 3. 搜索和筛选

在「搜索和筛选」区域可以：
- 通过关键字搜索视频标题或文件名
- 按日期范围筛选
- 按下载状态筛选（待下载/下载中/已完成/失败）

### 4. 导出列表

在「导出列表」区域可以导出当前筛选的视频列表为：
- 📄 HTML - 美观的网页格式
- 📕 PDF - 适合打印和分享
- 📝 Markdown - 适合文档编写
- 🖼️ PNG - 图片格式

### 5. 管理视频

在「视频列表」区域可以：
- 查看所有视频的详细信息
- 删除不需要的视频记录和文件
- 分页浏览历史记录

## 🔧 API 接口

### 视频相关

#### 获取视频信息
```http
POST /api/videos/info
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=xxxxx"
}
```

#### 批量添加视频
```http
POST /api/videos/batch-add
Content-Type: application/json

{
  "urls": ["url1", "url2"],
  "videoFormat": "mp4",
  "audioFormat": "mp3",
  "downloadAudio": true
}
```

#### 开始批量下载
```http
POST /api/videos/batch-download
Content-Type: application/json

{
  "videoIds": [1, 2, 3],
  "videoFormat": "mp4",
  "audioFormat": "mp3",
  "downloadAudio": true,
  "batchName": "批次名称"
}
```

#### 获取视频列表
```http
GET /api/videos?keyword=xxx&status=completed&limit=50&offset=0
```

#### 删除视频
```http
DELETE /api/videos/:id
```

### 导出相关

#### 导出视频列表
```http
POST /api/videos/export
Content-Type: application/json

{
  "format": "html",
  "filters": {
    "keyword": "xxx",
    "status": "completed"
  }
}
```

### 统计相关

#### 获取统计信息
```http
GET /api/stats
```

#### 获取批次列表
```http
GET /api/batches
```

#### 获取批次详情
```http
GET /api/batches/:id
```

## 📁 项目结构

```
youtube-video-downloader/
├── db/                      # 数据库模块
│   ├── database.js         # 数据库连接和操作
│   └── init.js             # 数据库初始化脚本
├── services/               # 业务逻辑服务
│   ├── downloader.js       # 视频下载服务
│   ├── notification.js     # 通知服务（基础）
│   ├── notification-adapter.js  # 通知适配器
│   ├── exporter.js         # 导出服务
│   └── websocket.js        # WebSocket服务
├── public/                 # 前端文件
│   ├── index.html          # 主页面
│   ├── style.css           # 样式文件
│   └── app.js              # 前端逻辑
├── downloads/              # 下载文件存储目录
├── exports/                # 导出文件存储目录
├── server.js               # 主服务器文件
├── init.sql                # 数据库初始化SQL
├── package.json            # 项目配置
├── .env.example            # 环境变量示例
└── README.md               # 项目文档
```

## 🎯 技术栈

### 后端
- **Node.js** - JavaScript运行时
- **Express.js** - Web框架
- **PostgreSQL** - 关系型数据库
- **WebSocket (ws)** - 实时通信
- **yt-dlp** - YouTube下载工具
- **Puppeteer** - 网页截图
- **html-pdf-node** - PDF生成
- **Marked** - Markdown解析
- **Axios** - HTTP客户端

### 前端
- **纯HTML/CSS/JavaScript** - 无框架依赖
- **WebSocket** - 实时更新
- **Fetch API** - HTTP请求
- **CSS Grid/Flexbox** - 响应式布局

## ⚙️ 配置说明

### 并发下载

默认并发下载数为3，可以在 `.env` 文件中修改：

```env
CONCURRENT_DOWNLOADS=5
```

### 下载目录

默认下载到 `./downloads` 目录，可以修改：

```env
DOWNLOAD_PATH=/path/to/your/downloads
```

### 通知渠道

所有通知渠道都是可选的，不配置不会影响下载功能。配置任意一个或多个通知渠道后，下载完成会自动发送通知。

## 🐛 故障排除

### yt-dlp 未找到

**错误信息**: `yt-dlp 未安装或不在 PATH 中`

**解决方案**:
1. 确保已安装 yt-dlp
2. 验证安装: `yt-dlp --version`
3. 如果使用自定义路径，在 `.env` 中设置: `YT_DLP_PATH=/path/to/yt-dlp`

### 数据库连接失败

**错误信息**: `数据库连接错误`

**解决方案**:
1. 确保 PostgreSQL 服务正在运行
2. 检查 `.env` 中的数据库配置
3. 确认数据库已创建: `CREATE DATABASE youtube_downloader;`
4. 运行初始化脚本: `npm run init-db`

### 下载失败

**常见原因**:
1. 视频地区限制
2. 需要登录才能观看
3. 视频已被删除
4. 网络问题

**解决方案**:
- 检查视频URL是否正确
- 尝试使用代理
- 查看服务器日志了解详细错误

### WebSocket 连接失败

**解决方案**:
1. 检查防火墙设置
2. 确认服务器正常运行
3. 刷新页面重新连接

## 📝 开发计划

- [ ] 支持代理设置
- [ ] 支持字幕下载
- [ ] 支持播放列表批量下载
- [ ] 添加用户认证系统
- [ ] 支持断点续传
- [ ] 添加下载队列管理
- [ ] 支持更多导出格式
- [ ] 添加视频预览功能

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件到项目维护者

---

**注意**: 请遵守YouTube的服务条款，仅下载您有权下载的内容。本工具仅供学习和个人使用。
