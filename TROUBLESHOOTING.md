# 故障排除指南

## 常见错误及解决方案

### ❌ FFmpeg错误: Error binding filtergraph

**错误信息:**
```
FFmpeg错误: ffmpeg exited with code 234: Error binding filtergraph inputs/outputs: Invalid argument
```

**原因:** 复杂的视频滤镜语法错误

**解决方案:**
1. 使用「淡入淡出」动画（最稳定）
2. 或选择「无动画」
3. 避免使用复杂的滑动和放大动画

---

### ❌ Canvas 模块安装失败

**错误信息:**
```
Error: Cannot find module 'canvas'
```

**解决方案 (Ubuntu/Debian):**
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm install canvas
```

**解决方案 (macOS):**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
npm install canvas
```

**解决方案 (Windows):**
1. 安装 [Windows Build Tools](https://github.com/felixrieseberg/windows-build-tools)
2. 安装 [GTK](https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases)
3. 运行: `npm install canvas`

---

### ❌ 数据库连接失败

**错误信息:**
```
数据库连接错误: connection refused
```

**解决方案:**
1. 检查 PostgreSQL 是否运行:
   ```bash
   # macOS
   brew services list
   brew services start postgresql
   
   # Linux
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   ```

2. 检查 `.env` 配置是否正确

3. 确认数据库已创建:
   ```bash
   psql -U postgres -l
   ```

4. 重新初始化:
   ```bash
   npm run init-db
   ```

---

### ❌ 视频生成失败 - 音频问题

**错误信息:**
```
Invalid data found when processing input
```

**原因:** 音频文件损坏或格式不支持

**解决方案:**
1. 确保音频文件完整
2. 使用常见格式：MP3, WAV, AAC
3. 转换音频格式:
   ```bash
   ffmpeg -i input.audio output.mp3
   ```

---

### ❌ 中文字体显示为方框

**原因:** 系统缺少中文字体

**解决方案 1 - 上传自定义字体:**
1. 下载中文 TTF 字体文件
2. 在表单中上传字体文件
3. 字体会自动应用

**解决方案 2 - 系统安装字体 (Linux):**
```bash
# Ubuntu/Debian
sudo apt-get install fonts-wqy-zenhei fonts-wqy-microhei

# CentOS/RHEL
sudo yum install wqy-zenhei-fonts wqy-microhei-fonts
```

---

### ❌ 上传文件失败

**错误信息:**
```
File too large
```

**原因:** 文件超过100MB限制

**解决方案:**
1. 压缩音频文件（降低比特率）
2. 压缩图片文件（降低分辨率）
3. 或修改 `server.js` 中的限制:
   ```javascript
   const upload = multer({
     storage: storage,
     limits: {
       fileSize: 200 * 1024 * 1024 // 改为200MB
     }
   });
   ```

---

### ❌ 视频生成速度慢

**原因:** 正常现象，取决于多个因素

**影响因素:**
1. 视频时长（越长越慢）
2. 服务器性能
3. 音频/图片大小
4. 动画复杂度

**优化建议:**
1. 使用 MP4 格式（编码更快）
2. 使用简单动画（淡入淡出）
3. 压缩上传的文件
4. 升级服务器硬件

**预期时间:**
- 5秒视频: 30-60秒
- 10秒视频: 60-120秒
- 30秒视频: 2-5分钟

---

### ❌ WebSocket 连接失败

**错误信息:**
```
WebSocket connection failed
```

**解决方案:**
1. 刷新页面重试
2. 检查防火墙设置
3. 确认服务器正在运行
4. 检查端口是否被占用:
   ```bash
   lsof -i :3000  # macOS/Linux
   netstat -ano | findstr :3000  # Windows
   ```

---

### ❌ 内存不足错误

**错误信息:**
```
JavaScript heap out of memory
```

**解决方案:**
1. 增加 Node.js 内存限制:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm start
   ```

2. 或在 `package.json` 中修改:
   ```json
   "scripts": {
     "start": "node --max-old-space-size=4096 server.js"
   }
   ```

---

### ❌ 磁盘空间不足

**检查磁盘空间:**
```bash
df -h  # Linux/macOS
```

**清理方案:**
1. 删除旧的视频文件:
   ```bash
   rm -rf outputs/*.mp4
   ```

2. 清理临时文件:
   ```bash
   rm -rf temp/*
   ```

3. 清理上传文件:
   ```bash
   rm -rf uploads/*
   ```

---

## 调试技巧

### 查看详细日志

1. **服务器日志:**
   ```bash
   # 启动时查看完整输出
   npm start
   ```

2. **数据库查询日志:**
   - 已在代码中启用
   - 查看控制台输出

3. **FFmpeg 详细日志:**
   修改 `services/video-generator.js`:
   ```javascript
   command.on('stderr', (stderrLine) => {
     console.log('FFmpeg:', stderrLine);
   });
   ```

### 测试组件

1. **测试 FFmpeg:**
   ```bash
   ffmpeg -version
   ffmpeg -formats
   ```

2. **测试数据库:**
   ```bash
   psql -U postgres -d slideshow_generator -c "SELECT COUNT(*) FROM videos;"
   ```

3. **测试 Canvas:**
   ```bash
   node -e "const { createCanvas } = require('canvas'); console.log('Canvas OK');"
   ```

---

## 性能优化

### 1. 数据库优化

```sql
-- 创建额外索引
CREATE INDEX idx_videos_filename ON videos(video_filename);

-- 清理旧数据
DELETE FROM videos WHERE created_at < NOW() - INTERVAL '30 days' AND generation_status = 'failed';

-- 分析表
ANALYZE videos;
```

### 2. 文件清理脚本

创建 `cleanup.sh`:
```bash
#!/bin/bash
# 清理30天前的文件
find ./outputs -name "*.mp4" -mtime +30 -delete
find ./temp -name "*" -mtime +1 -delete
find ./uploads -name "*" -mtime +30 -delete
find ./exports -name "*" -mtime +7 -delete
```

### 3. 定期维护

```bash
# 添加到 crontab
0 2 * * * /path/to/cleanup.sh
```

---

## 获取帮助

如果以上方案都无法解决问题：

1. **查看完整日志**
2. **记录错误信息**
3. **提供以下信息:**
   - 操作系统版本
   - Node.js 版本
   - FFmpeg 版本
   - 错误截图
   - 完整错误日志

4. **提交 Issue 或联系支持**

---

## 常用命令速查

```bash
# 启动服务
npm start

# 开发模式
npm run dev

# 初始化数据库
npm run init-db

# 检查 FFmpeg
ffmpeg -version

# 检查端口占用
lsof -i :3000

# 查看磁盘空间
df -h

# 查看内存使用
free -h

# 清理 node_modules
rm -rf node_modules && npm install

# 重启 PostgreSQL
sudo systemctl restart postgresql
```
