# 📖 快速参考卡

一页纸速查手册 - 常用命令和配置

---

## 🚀 常用命令

```bash
# 安装依赖
npm install

# 初始化数据库
npm run init-db

# 启动服务（开发模式）
npm run dev

# 启动服务（生产模式）
npm start

# 测试 API
./test-api.sh

# 查看帮助
./start.sh
```

---

## 🔧 配置文件位置

| 文件 | 路径 | 用途 |
|------|------|------|
| 环境变量 | `.env` | 数据库、端口、通知配置 |
| 数据库配置 | `config/database.js` | 连接池设置 |
| 服务器配置 | `server.js` | Express 配置 |

---

## 🌐 默认端口和路径

```
Web界面:   http://localhost:3000
API地址:   http://localhost:3000/api
健康检查:  http://localhost:3000/health
下载目录:  ./downloads/
导出目录:  ./exports/
```

---

## 📡 API 端点速查

| 方法 | 端点 | 功能 |
|------|------|------|
| POST | `/api/videos/download` | 批量下载 |
| GET | `/api/videos` | 获取列表 |
| GET | `/api/videos/:id` | 获取详情 |
| DELETE | `/api/videos/:id` | 删除视频 |
| GET | `/api/videos/stats/summary` | 获取统计 |
| POST | `/api/videos/export` | 导出列表 |
| GET | `/api/videos/download-file/:id/:type` | 下载文件 |

---

## 📝 环境变量速查

### 必需配置
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=你的密码     # 必须修改
DB_NAME=youtube_downloader
```

### 可选配置
```env
PORT=3000
NODE_ENV=development
DOWNLOAD_PATH=./downloads
MAX_CONCURRENT_DOWNLOADS=3
```

### 通知配置（可选）
```env
WXPUSHER_TOKEN=AT_xxx
WXPUSHER_UID=UID_xxx
PUSHPLUS_TOKEN=xxx
RESEND_API_KEY=re_xxx
RESEND_TO_EMAIL=your@email.com
TELEGRAM_BOT_TOKEN=xxx:xxx
TELEGRAM_CHAT_ID=xxx
```

---

## 🎯 支持的格式

### 视频格式
- MP4（推荐）
- MKV
- WebM

### 视频质量
- 最佳质量
- 1080p
- 720p
- 480p

### 音频格式
- MP3（推荐）
- AAC
- WAV
- 最佳音质

### 导出格式
- HTML
- PDF
- Markdown
- PNG

---

## 🔍 常用 SQL 查询

```sql
-- 查看所有视频
SELECT * FROM videos ORDER BY created_at DESC;

-- 查看已完成的视频
SELECT * FROM videos WHERE download_status = 'completed';

-- 查看失败的视频
SELECT * FROM videos WHERE download_status = 'failed';

-- 统计信息
SELECT 
  download_status, 
  COUNT(*) as count,
  SUM(video_size) as total_size
FROM videos 
GROUP BY download_status;

-- 删除失败记录
DELETE FROM videos WHERE download_status = 'failed';

-- 清空所有记录
TRUNCATE TABLE videos RESTART IDENTITY CASCADE;
```

---

## 🐛 故障排除速查

### 问题：数据库连接失败
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 重启 PostgreSQL
sudo systemctl restart postgresql

# 测试连接
psql -U postgres -d youtube_downloader
```

### 问题：端口被占用
```bash
# 查看占用端口的进程
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# 杀死进程
kill -9 <PID>

# 或修改 .env 中的 PORT
```

### 问题：下载失败
```bash
# 检查网络
ping youtube.com

# 查看日志
tail -f logs/*.log  # 如果有日志
pm2 logs youtube-downloader  # 如果使用 PM2

# 手动测试 yt-dlp
npx yt-dlp --version
npx yt-dlp "VIDEO_URL" --dump-json
```

### 问题：导出失败
```bash
# 检查 Puppeteer 依赖（Linux）
sudo apt-get install -y chromium-browser

# 或安装系统库
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0
```

---

## 📊 性能调优

### 增加并发数
```env
MAX_CONCURRENT_DOWNLOADS=5
```

### 数据库优化
```javascript
// config/database.js
max: 50,  // 增加连接池
```

### 限制下载速度
```javascript
// services/download.js
'--limit-rate', '5M'  // 5MB/s
```

---

## 🔐 安全最佳实践

✅ 修改默认数据库密码  
✅ `.env` 不要提交到 Git  
✅ 生产环境使用 HTTPS  
✅ 定期备份数据库  
✅ 限制 API 访问（如需要）  
✅ 设置防火墙规则  

---

## 📚 文档快速索引

| 想要... | 查看文档 |
|---------|----------|
| 快速开始 | `QUICKSTART.md` |
| 详细设置 | `SETUP_GUIDE.md` |
| 使用示例 | `USAGE_EXAMPLES.md` |
| 技术架构 | `PROJECT_OVERVIEW.md` |
| 完整参考 | `README_PROJECT.md` |
| 部署检查 | `DEPLOYMENT_CHECKLIST.md` |
| 项目总结 | `SUMMARY.txt` |

---

## 💡 实用技巧

### 1. 批量获取 YouTube 播放列表
```bash
yt-dlp --flat-playlist --get-url "PLAYLIST_URL"
```

### 2. 数据库备份
```bash
pg_dump -U postgres youtube_downloader > backup_$(date +%Y%m%d).sql
```

### 3. 使用 PM2 管理进程
```bash
pm2 start server.js --name youtube-downloader
pm2 save
pm2 startup
```

### 4. 定时任务（Linux）
```bash
# 编辑 crontab
crontab -e

# 每天凌晨2点备份
0 2 * * * pg_dump -U postgres youtube_downloader > /backup/db_$(date +\%Y\%m\%d).sql
```

### 5. 查看实时日志
```bash
# 使用 PM2
pm2 logs youtube-downloader --lines 100

# 或直接运行
npm start | tee logs/server.log
```

---

## 🎯 快速测试

```bash
# 1. 测试 API
curl http://localhost:3000/health

# 2. 测试下载（替换URL）
curl -X POST http://localhost:3000/api/videos/download \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    "videoFormat": "mp4",
    "quality": "best"
  }'

# 3. 查看列表
curl http://localhost:3000/api/videos?limit=5
```

---

## 📞 获取帮助

1. 查看详细文档
2. 运行 `./test-api.sh`
3. 查看服务器日志
4. 检查 `SETUP_GUIDE.md` 的故障排除章节

---

**打印此页作为快速参考！** 🖨️

---

© 2025 YouTube视频批量下载管理器 v1.0.0
