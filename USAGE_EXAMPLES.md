# 📖 使用示例

## 🎯 场景 1: 下载单个视频

### 需求
下载一个 YouTube 视频，MP4 格式，1080p 质量，同时下载 MP3 音频。

### 操作步骤

1. 打开浏览器访问 http://localhost:3000
2. 在"视频地址列表"输入框中输入：
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
3. 选择配置：
   - 视频格式：MP4
   - 视频质量：1080p
   - 勾选"同时下载音频"
   - 音频格式：MP3
4. 点击"🚀 开始下载"
5. 等待下载完成，在进度区域查看实时状态
6. 下载完成后，在视频列表中点击"📥 视频"或"🎵 音频"下载文件

---

## 🎯 场景 2: 批量下载播放列表

### 需求
批量下载一个 YouTube 播放列表中的所有视频。

### 操作步骤

1. 复制播放列表中所有视频的 URL（每个视频一个 URL）
2. 在"视频地址列表"输入框中粘贴：
   ```
   https://www.youtube.com/watch?v=video1
   https://www.youtube.com/watch?v=video2
   https://www.youtube.com/watch?v=video3
   https://www.youtube.com/watch?v=video4
   https://www.youtube.com/watch?v=video5
   ```
3. 选择配置（统一应用到所有视频）
4. 点击"🚀 开始下载"
5. 系统会自动并发下载（默认3个并发）
6. 实时查看进度和统计信息

### 批量获取播放列表 URL 的方法

**方法 1: 使用浏览器控制台**

在 YouTube 播放列表页面，打开浏览器控制台（F12），运行：

```javascript
// 获取当前页面所有视频链接
Array.from(document.querySelectorAll('a#video-title'))
  .map(a => a.href)
  .filter(url => url.includes('watch?v='))
  .join('\n');
```

**方法 2: 使用 yt-dlp 命令行**

```bash
yt-dlp --flat-playlist --get-url "PLAYLIST_URL"
```

---

## 🎯 场景 3: 搜索和过滤

### 需求
查找所有包含"教程"关键字、已完成下载的视频，时间范围在最近一周。

### 操作步骤

1. 在"搜索关键字"输入框中输入：`教程`
2. 在"状态"下拉框选择：`已完成`
3. 设置日期范围：
   - 开始日期：一周前的日期
   - 结束日期：今天
4. 点击"🔍 搜索"
5. 查看筛选后的结果

### 清空搜索

点击"🔄 重置"按钮恢复全部列表。

---

## 🎯 场景 4: 导出下载报告

### 需求
将所有已完成的视频下载记录导出为 PDF 报告。

### 操作步骤

1. 使用搜索功能筛选"已完成"的视频
2. 在导出区域选择格式：`PDF`
3. 点击"📤 导出列表"
4. 等待导出完成
5. PDF 文件会自动下载到本地

### 不同格式的用途

- **HTML**: 可以在浏览器中打开，样式美观
- **PDF**: 适合打印或存档
- **Markdown**: 纯文本格式，可以编辑
- **PNG**: 图片格式，可以直接分享

---

## 🎯 场景 5: 使用 API 下载

### 需求
通过编程方式调用 API 批量下载视频。

### 使用 curl 命令

```bash
curl -X POST http://localhost:3000/api/videos/download \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.youtube.com/watch?v=video1",
      "https://www.youtube.com/watch?v=video2"
    ],
    "videoFormat": "mp4",
    "audioFormat": "mp3",
    "downloadAudio": true,
    "quality": "best"
  }'
```

### 使用 Python 脚本

```python
import requests

url = "http://localhost:3000/api/videos/download"

data = {
    "urls": [
        "https://www.youtube.com/watch?v=video1",
        "https://www.youtube.com/watch?v=video2"
    ],
    "videoFormat": "mp4",
    "audioFormat": "mp3",
    "downloadAudio": True,
    "quality": "best"
}

response = requests.post(url, json=data)
print(response.json())
```

### 使用 JavaScript (Node.js)

```javascript
const axios = require('axios');

async function downloadVideos() {
  const response = await axios.post('http://localhost:3000/api/videos/download', {
    urls: [
      'https://www.youtube.com/watch?v=video1',
      'https://www.youtube.com/watch?v=video2'
    ],
    videoFormat: 'mp4',
    audioFormat: 'mp3',
    downloadAudio: true,
    quality: 'best'
  });
  
  console.log(response.data);
}

downloadVideos();
```

---

## 🎯 场景 6: 定时任务下载

### 需求
每天凌晨 2 点自动下载指定频道的最新视频。

### 使用 cron (Linux/Mac)

创建脚本 `auto-download.sh`：

```bash
#!/bin/bash

# 定义要下载的视频 URL
URLS=(
  "https://www.youtube.com/watch?v=latest1"
  "https://www.youtube.com/watch?v=latest2"
)

# 转换为 JSON 数组
URLS_JSON=$(printf '"%s",' "${URLS[@]}" | sed 's/,$//')

# 调用 API
curl -X POST http://localhost:3000/api/videos/download \
  -H "Content-Type: application/json" \
  -d "{
    \"urls\": [$URLS_JSON],
    \"videoFormat\": \"mp4\",
    \"downloadAudio\": true,
    \"audioFormat\": \"mp3\",
    \"quality\": \"best\"
  }"
```

添加到 crontab：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨 2 点执行）
0 2 * * * /path/to/auto-download.sh
```

---

## 🎯 场景 7: 监控下载进度

### 需求
通过 API 实时监控下载进度。

### 使用 Shell 脚本

```bash
#!/bin/bash

while true; do
  clear
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 下载状态监控"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  curl -s http://localhost:3000/api/videos/stats/summary | jq '.data'
  
  echo ""
  echo "刷新间隔: 5秒 (Ctrl+C 退出)"
  echo ""
  
  sleep 5
done
```

---

## 🎯 场景 8: 清理磁盘空间

### 需求
删除 30 天前的下载文件和失败的记录。

### 方法 1: 通过 Web 界面

1. 使用搜索功能筛选失败的视频
2. 在视频列表中点击"🗑️"按钮删除

### 方法 2: 使用 SQL 命令

```sql
-- 连接数据库
psql -U postgres youtube_downloader

-- 查看失败的记录
SELECT id, title, created_at 
FROM videos 
WHERE download_status = 'failed' 
AND created_at < NOW() - INTERVAL '30 days';

-- 删除失败的记录
DELETE FROM videos 
WHERE download_status = 'failed' 
AND created_at < NOW() - INTERVAL '30 days';
```

### 方法 3: 使用 Shell 脚本

```bash
#!/bin/bash

# 删除 30 天前的失败下载文件
find downloads/ -name "*.mp4" -mtime +30 -delete
find downloads/ -name "*.mp3" -mtime +30 -delete

# 删除 30 天前的导出文件
find exports/ -mtime +30 -delete

echo "清理完成！"
```

---

## 🎯 场景 9: 备份和恢复

### 备份数据库

```bash
# 备份数据库
pg_dump -U postgres youtube_downloader > backup_$(date +%Y%m%d).sql

# 备份下载文件
tar -czf downloads_backup_$(date +%Y%m%d).tar.gz downloads/
```

### 恢复数据库

```bash
# 恢复数据库
psql -U postgres youtube_downloader < backup_20251010.sql

# 恢复下载文件
tar -xzf downloads_backup_20251010.tar.gz
```

---

## 🎯 场景 10: 性能调优

### 增加并发数

编辑 `.env` 文件：

```env
MAX_CONCURRENT_DOWNLOADS=10
```

重启服务器：

```bash
npm start
```

### 限制下载速度

如果需要限制带宽占用，可以在 `services/download.js` 中添加参数：

```javascript
const videoArgs = [
  videoRecord.video_url,
  '-f', this.getVideoFormatString(videoFormat, quality),
  '-o', videoPath,
  '--limit-rate', '5M',  // 限制下载速度为 5MB/s
  '--no-playlist',
  '--encoding', 'utf-8',
  '--newline'
];
```

---

## 💡 实用技巧

### 1. 快速获取视频信息

使用 yt-dlp 命令行：

```bash
yt-dlp --dump-json "VIDEO_URL" | jq '.title, .duration, .filesize'
```

### 2. 下载最佳质量

设置视频质量为"最佳质量"，系统会自动选择最高可用质量。

### 3. 仅下载音频

不勾选"同时下载音频"，在视频格式中选择音频格式，或者直接使用 yt-dlp：

```bash
yt-dlp -x --audio-format mp3 "VIDEO_URL"
```

### 4. 批量重命名文件

下载后可以使用脚本批量重命名：

```bash
cd downloads/videos
for file in *.mp4; do
  mv "$file" "prefix_$file"
done
```

### 5. 生成下载报告邮件

导出 HTML 格式后，通过邮件发送：

```bash
mutt -s "下载报告" -a export.html -- recipient@example.com < /dev/null
```

---

## 🎉 总结

这个系统支持多种使用场景，从简单的单个视频下载到复杂的自动化批量处理。

关键特性：
- ✅ 灵活的配置选项
- ✅ 强大的搜索和过滤
- ✅ 多格式导出
- ✅ API 支持自动化
- ✅ 实时进度监控
- ✅ 多渠道通知

祝你使用愉快！🎊
