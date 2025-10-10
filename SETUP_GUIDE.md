# 🚀 YouTube视频批量下载管理器 - 快速设置指南

## 📋 前置要求

在开始之前，请确保你的系统已安装以下软件：

1. **Node.js 16+**
   ```bash
   node --version  # 应显示 v16.0.0 或更高
   ```

2. **PostgreSQL 12+**
   ```bash
   psql --version  # 应显示 12.0 或更高
   ```

3. **Git** (可选)
   ```bash
   git --version
   ```

## 🔧 安装步骤

### 步骤 1: 安装依赖

```bash
# 使用 npm
npm install

# 或使用安装脚本
./install.sh
```

### 步骤 2: 配置数据库

#### 2.1 创建数据库

连接到 PostgreSQL：

```bash
psql -U postgres
```

创建数据库：

```sql
CREATE DATABASE youtube_downloader;
\q
```

#### 2.2 配置环境变量

编辑 `.env` 文件，修改数据库配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=你的密码
DB_NAME=youtube_downloader
```

### 步骤 3: 初始化数据库表

```bash
npm run init-db
```

你应该看到类似输出：

```
✅ 数据库表创建成功！
📊 已创建以下表：
  - videos (视频记录表)
  - download_queue (下载队列表)
  - notification_logs (通知日志表)
  - export_logs (导出记录表)
```

### 步骤 4: 启动服务器

```bash
# 方式 1: 使用 npm
npm start

# 方式 2: 使用启动脚本
./start.sh

# 方式 3: 开发模式（自动重启）
npm run dev
```

成功启动后，你应该看到：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 YouTube视频批量下载管理器已启动
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 服务地址: http://localhost:3000
🌐 Web界面: http://localhost:3000
🔧 API地址: http://localhost:3000/api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 步骤 5: 访问系统

在浏览器中打开：

```
http://localhost:3000
```

## 🔔 配置通知（可选）

如果需要启用通知功能，在 `.env` 文件中配置以下参数：

### WxPusher（微信推送）

1. 访问 https://wxpusher.zjiecode.com/
2. 注册账号并创建应用
3. 获取 AppToken 和 UID

```env
WXPUSHER_TOKEN=AT_xxxxxxxxxx
WXPUSHER_UID=UID_xxxxxxxxxx
```

### PushPlus（微信推送）

1. 访问 http://www.pushplus.plus/
2. 微信扫码登录
3. 获取 Token

```env
PUSHPLUS_TOKEN=xxxxxxxxxx
```

### Resend（邮件通知）

1. 访问 https://resend.com/
2. 注册账号并创建 API Key
3. 配置接收邮箱

```env
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_TO_EMAIL=your@email.com
```

### Telegram（电报通知）

1. 与 @BotFather 对话创建机器人
2. 获取 Bot Token
3. 获取你的 Chat ID

```env
TELEGRAM_BOT_TOKEN=xxxxxxxxxx:xxxxxxxxxxx
TELEGRAM_CHAT_ID=xxxxxxxxxx
```

## 📖 使用示例

### 1. 下载单个视频

在"下载配置"区域：

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

选择格式，点击"🚀 开始下载"。

### 2. 批量下载视频

每行输入一个 URL：

```
https://www.youtube.com/watch?v=video1
https://www.youtube.com/watch?v=video2
https://www.youtube.com/watch?v=video3
```

### 3. 搜索视频

在搜索框输入关键字，例如：

```
音乐
```

选择状态和日期范围，点击"🔍 搜索"。

### 4. 导出列表

1. 选择导出格式（HTML/PDF/Markdown/PNG）
2. 点击"📤 导出列表"
3. 文件会自动下载

## ⚙️ 高级配置

### 调整并发下载数

在 `.env` 文件中：

```env
MAX_CONCURRENT_DOWNLOADS=5  # 同时下载 5 个视频
```

### 修改下载路径

```env
DOWNLOAD_PATH=./my_downloads
```

### 更改服务端口

```env
PORT=8080
```

## 🐛 常见问题

### Q: 数据库连接失败

**A:** 检查以下几点：
1. PostgreSQL 是否正在运行
2. 数据库名称、用户名、密码是否正确
3. 防火墙是否阻止连接

### Q: 下载失败

**A:** 可能的原因：
1. 网络连接问题
2. YouTube 视频不可用或有地区限制
3. 磁盘空间不足

### Q: 导出 PDF 失败

**A:** Puppeteer 需要一些系统依赖：

```bash
# Ubuntu/Debian
sudo apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2

# macOS
brew install chromium
```

### Q: 中文乱码

**A:** 确保：
1. 数据库使用 UTF8 编码
2. 浏览器使用 UTF-8 编码
3. 系统支持中文字体

## 📊 性能优化

### 1. 增加数据库连接池

在 `config/database.js` 中：

```javascript
const pool = new Pool({
  // ...
  max: 50,  // 增加最大连接数
});
```

### 2. 使用 Redis 缓存（可选）

安装 Redis 并添加缓存层可以提高性能。

### 3. 定期清理

定期清理下载文件和导出文件：

```bash
# 删除 7 天前的导出文件
find exports/ -mtime +7 -delete

# 清理失败的下载记录
psql -U postgres youtube_downloader -c "DELETE FROM videos WHERE download_status='failed' AND created_at < NOW() - INTERVAL '30 days';"
```

## 🔐 安全建议

1. **生产环境**：
   - 使用强密码
   - 启用 HTTPS
   - 限制数据库访问
   - 设置防火墙规则

2. **备份**：
   ```bash
   # 备份数据库
   pg_dump -U postgres youtube_downloader > backup.sql
   
   # 恢复数据库
   psql -U postgres youtube_downloader < backup.sql
   ```

3. **日志**：
   - 定期检查日志文件
   - 监控异常下载活动

## 📞 支持

如遇到问题，请：

1. 查看日志文件
2. 检查 GitHub Issues
3. 阅读完整文档：`README_PROJECT.md`

## 🎉 完成！

现在你已经成功设置了 YouTube 视频批量下载管理器！

开始使用：http://localhost:3000

祝你使用愉快！🎊
