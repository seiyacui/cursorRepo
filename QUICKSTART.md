# 快速启动指南

## 最小化配置快速启动

如果你想快速测试系统，按照以下步骤操作：

### 1. 安装 yt-dlp (MacOS)

```bash
brew install yt-dlp
```

### 2. 安装 Node.js 依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件（最小配置）：

```bash
cat > .env << 'EOF'
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_downloader
DB_USER=postgres
DB_PASSWORD=postgres

# 服务器配置
PORT=3000

# 下载配置
DOWNLOAD_DIR=./downloads
YT_DLP_PATH=yt-dlp
EOF
```

### 4. 创建数据库

```bash
# 如果你的 PostgreSQL 正在运行
createdb youtube_downloader

# 或者使用 psql
psql -U postgres -c "CREATE DATABASE youtube_downloader;"
```

### 5. 初始化数据库

```bash
npm run init-db
```

### 6. 启动服务器

```bash
npm start
```

### 7. 打开浏览器

访问 http://localhost:3000

## 配置通知（可选）

通知功能是可选的，不配置也不影响下载功能。如果需要配置通知：

### WxPusher (微信推送)

1. 访问 https://wxpusher.zjiecode.com/
2. 注册并创建应用
3. 在 `.env` 中添加：
```env
WXPUSHER_TOKEN=你的token
WXPUSHER_UID=你的uid
```

### PushPlus (推送加)

1. 访问 http://www.pushplus.plus/
2. 注册并获取 Token
3. 在 `.env` 中添加：
```env
PUSHPLUS_TOKEN=你的token
```

### Resend Email (邮件)

1. 访问 https://resend.com/
2. 注册并获取 API Key
3. 在 `.env` 中添加：
```env
RESEND_API_KEY=你的api_key
RESEND_TO_EMAIL=接收邮箱
```

### Telegram (电报)

1. 在 Telegram 中找到 @BotFather
2. 创建机器人并获取 Bot Token
3. 获取你的 Chat ID
4. 在 `.env` 中添加：
```env
TELEGRAM_BOT_TOKEN=你的bot_token
TELEGRAM_CHAT_ID=你的chat_id
```

## 常见问题

### Q: yt-dlp 未找到
**A**: 确保已安装 yt-dlp 并在 PATH 中：
```bash
which yt-dlp
brew install yt-dlp  # 如果未安装
```

### Q: 数据库连接失败
**A**: 检查 PostgreSQL 是否运行：
```bash
pg_isready
brew services start postgresql  # MacOS 启动 PostgreSQL
```

### Q: 端口被占用
**A**: 修改 `.env` 文件中的 PORT 值：
```env
PORT=4000  # 改为其他端口
```

### Q: 下载速度慢
**A**: 这取决于你的网络环境和 YouTube 服务器，可以尝试：
- 使用代理
- 更新 yt-dlp：`brew upgrade yt-dlp`

### Q: 导出 PDF/PNG 失败
**A**: 确保已安装 Chromium：
```bash
brew install chromium
```

## 测试视频

可以使用以下测试视频快速验证功能：

```
https://www.youtube.com/watch?v=jNQXAC9IVRw
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## 下一步

- 查看完整文档：[README_ZH.md](README_ZH.md)
- 了解 API 接口
- 配置通知系统
- 自定义界面样式

---

**提示**: 第一次下载可能需要一些时间，因为 yt-dlp 需要下载视频信息。
