# 安装和部署指南

## 系统要求

- macOS 10.15+
- Node.js 14.x 或更高
- PostgreSQL 12.x 或更高
- yt-dlp (通过 Homebrew 安装)

## 详细安装步骤

### 1. 安装必要软件

```bash
# 安装 Homebrew (如果还没有安装)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# 安装 yt-dlp
brew install yt-dlp

# 验证安装
node --version
psql --version
yt-dlp --version
```

### 2. 克隆并设置项目

```bash
# 进入项目目录
cd /path/to/youtube-batch-downloader

# 安装 Node.js 依赖
npm install
```

### 3. 配置数据库

```bash
# 创建数据库用户（如果需要）
createuser -s postgres

# 创建数据库
createdb youtube_downloader

# 或者使用 psql
psql postgres -c "CREATE DATABASE youtube_downloader;"
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

最小配置示例：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_downloader
DB_USER=postgres
DB_PASSWORD=

# 服务器配置
PORT=3000

# 下载配置
DOWNLOAD_DIR=./downloads
YT_DLP_PATH=yt-dlp
```

### 5. 初始化数据库

```bash
npm run init-db
```

如果看到 "✅ Database initialization complete!"，说明初始化成功。

### 6. 启动服务器

```bash
# 开发模式（推荐用于测试）
npm run dev

# 或生产模式
npm start
```

### 7. 访问系统

在浏览器中打开：http://localhost:3000

## 可选：配置通知功能

### WxPusher (微信推送)

```bash
# 在 .env 文件中添加
WXPUSHER_TOKEN=你的token
WXPUSHER_UID=你的uid
```

获取方式：访问 https://wxpusher.zjiecode.com/

### PushPlus (推送加)

```bash
# 在 .env 文件中添加
PUSHPLUS_TOKEN=你的token
```

获取方式：访问 http://www.pushplus.plus/

### Resend Email (邮件通知)

```bash
# 在 .env 文件中添加
RESEND_API_KEY=你的api_key
RESEND_TO_EMAIL=接收邮箱
```

获取方式：访问 https://resend.com/

### Telegram (电报通知)

```bash
# 在 .env 文件中添加
TELEGRAM_BOT_TOKEN=你的bot_token
TELEGRAM_CHAT_ID=你的chat_id
```

获取方式：
1. 在 Telegram 中搜索 @BotFather
2. 发送 `/newbot` 创建机器人
3. 获取 Bot Token
4. 获取你的 Chat ID（可以使用 @userinfobot）

## 验证安装

### 1. 测试下载功能

在浏览器中：
1. 输入测试视频链接：`https://www.youtube.com/watch?v=jNQXAC9IVRw`
2. 选择 MP4 格式
3. 点击"开始下载"
4. 观察实时进度

### 2. 检查 WebSocket 连接

页面底部应该显示：`连接状态: 已连接`（绿色）

### 3. 测试数据库

下载完成后，视频应该出现在"视频列表"中。

### 4. 测试导出功能

点击任意导出按钮（HTML/PDF/Markdown/PNG），应该能成功下载文件。

## 故障排除

### 问题 1: yt-dlp 未找到

**解决方案：**
```bash
# 安装 yt-dlp
brew install yt-dlp

# 或更新
brew upgrade yt-dlp

# 验证
which yt-dlp
```

### 问题 2: 数据库连接失败

**解决方案：**
```bash
# 启动 PostgreSQL
brew services start postgresql@14

# 检查状态
brew services list

# 测试连接
psql postgres -c "SELECT version();"
```

### 问题 3: 端口已被占用

**解决方案：**
```bash
# 查看占用端口 3000 的进程
lsof -i :3000

# 杀死进程（如果需要）
kill -9 <PID>

# 或者修改 .env 中的端口
PORT=4000
```

### 问题 4: npm install 失败

**解决方案：**
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题 5: 导出 PDF 失败

**解决方案：**
```bash
# 安装 Chromium
brew install chromium

# 或者确保 puppeteer 正确安装
npm install puppeteer
```

### 问题 6: 下载速度慢

**可能原因：**
- 网络连接问题
- YouTube 限速
- 视频清晰度太高

**解决方案：**
- 选择较低清晰度
- 使用代理
- 更新 yt-dlp

## 性能优化建议

### 1. 数据库优化

```sql
-- 为常用查询创建索引
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_videos_status ON videos(status);
```

### 2. 下载目录管理

```bash
# 定期清理下载文件
cd downloads
find . -mtime +30 -delete  # 删除30天前的文件
```

### 3. 日志管理

```bash
# 使用 PM2 管理进程（推荐生产环境）
npm install -g pm2
pm2 start server.js --name youtube-downloader
pm2 logs youtube-downloader
```

## 生产环境部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name youtube-downloader

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs youtube-downloader
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 安全建议

1. **不要提交 .env 文件到 Git**
2. **使用强密码保护数据库**
3. **定期更新依赖包**: `npm audit fix`
4. **限制下载目录权限**: `chmod 755 downloads`
5. **使用 HTTPS**: 生产环境配置 SSL 证书

## 备份和恢复

### 备份数据库

```bash
# 备份数据库
pg_dump youtube_downloader > backup.sql

# 或者使用时间戳
pg_dump youtube_downloader > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复数据库

```bash
# 恢复数据库
psql youtube_downloader < backup.sql
```

## 更新应用

```bash
# 拉取最新代码
git pull

# 安装新依赖
npm install

# 更新数据库（如有变更）
npm run init-db

# 重启服务
pm2 restart youtube-downloader
```

## 卸载

```bash
# 停止服务
pm2 stop youtube-downloader
pm2 delete youtube-downloader

# 删除数据库
dropdb youtube_downloader

# 删除项目文件
rm -rf /path/to/youtube-batch-downloader
```

## 技术支持

如遇到问题：
1. 查看日志文件
2. 检查 .env 配置
3. 确认所有依赖已安装
4. 查阅文档：README_ZH.md
5. 提交 Issue

---

**祝使用愉快！** 🎉
