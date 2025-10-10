# 快速启动指南

## 🚀 5分钟快速部署

### 第一步：安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 安装 yt-dlp (macOS)
brew install yt-dlp

# 或者 (Linux)
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 第二步：配置数据库

```bash
# 1. 登录 PostgreSQL
psql -U postgres

# 2. 创建数据库
CREATE DATABASE youtube_downloader WITH ENCODING 'UTF8';

# 3. 退出
\q

# 4. 初始化表结构
npm run init-db
```

### 第三步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，至少配置以下内容：
# DB_PASSWORD=你的数据库密码
# PORT=3000
```

### 第四步：启动服务

```bash
# 启动服务器
npm start

# 或者使用开发模式（自动重启）
npm run dev
```

### 第五步：访问应用

打开浏览器访问：http://localhost:3000

## 📋 使用流程

1. **添加视频**
   - 在输入框中粘贴YouTube视频URL（每行一个）
   - 选择视频格式和音频选项
   - 点击「添加到列表」

2. **开始下载**
   - 点击「开始下载」按钮
   - 查看实时下载进度
   - 等待下载完成

3. **查看结果**
   - 查看下载报告
   - 点击视频/音频链接下载文件
   - 在视频列表中管理已下载的内容

4. **导出数据**
   - 使用搜索功能筛选视频
   - 点击导出按钮（HTML/PDF/Markdown/PNG）
   - 自动下载导出文件

## ⚡ 常用命令

```bash
# 安装依赖
npm install

# 初始化数据库
npm run init-db

# 启动服务（生产环境）
npm start

# 启动服务（开发模式）
npm run dev

# 检查 yt-dlp 版本
yt-dlp --version

# 测试数据库连接
psql -U postgres -d youtube_downloader -c "SELECT NOW();"
```

## 🔧 最小化配置示例

`.env` 文件最小配置：

```env
# 数据库（必需）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_downloader
DB_USER=postgres
DB_PASSWORD=your_password

# 服务器（可选，默认3000）
PORT=3000

# 下载配置（可选）
DOWNLOAD_PATH=./downloads
CONCURRENT_DOWNLOADS=3
```

通知配置是可选的，不配置也能正常使用下载功能。

## 🐛 常见问题

### Q: 找不到 yt-dlp？
A: 运行 `yt-dlp --version` 确认已安装。如果安装在自定义路径，在 `.env` 中设置：
```env
YT_DLP_PATH=/your/custom/path/yt-dlp
```

### Q: 数据库连接失败？
A: 检查以下几点：
1. PostgreSQL 服务是否运行：`pg_ctl status`
2. 数据库是否存在：`psql -U postgres -l`
3. 用户名密码是否正确
4. 是否运行了 `npm run init-db`

### Q: 下载失败？
A: 可能原因：
1. 视频有地区限制
2. 视频需要登录
3. 视频已被删除
4. 网络问题

查看控制台日志获取详细错误信息。

### Q: WebSocket 连接失败？
A: 刷新页面重试，或检查防火墙设置。

## 📦 生产环境部署建议

1. **使用进程管理器**
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name youtube-downloader

# 设置开机自启
pm2 startup
pm2 save
```

2. **使用反向代理**
- 使用 Nginx 作为反向代理
- 配置 HTTPS
- 设置域名

3. **数据库优化**
- 配置数据库连接池
- 定期备份数据
- 优化查询性能

4. **监控和日志**
- 配置日志收集
- 设置错误告警
- 监控资源使用

## 📞 获取帮助

遇到问题？
1. 查看完整文档：`README.md`
2. 检查日志输出
3. 提交 GitHub Issue

---

**祝您使用愉快！** 🎉
