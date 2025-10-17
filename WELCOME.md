# 🎉 欢迎使用 YouTube 视频批量下载器

恭喜！您已经获得了一个功能完整的 YouTube 视频批量下载和管理系统。

## 🚀 立即开始（只需 3 步）

### 步骤 1: 验证安装环境

```bash
./verify.sh
```

这个脚本会自动检查：
- ✅ 系统依赖（Node.js, PostgreSQL, yt-dlp）
- ✅ 项目文件完整性
- ✅ 配置文件
- ✅ 数据库连接

### 步骤 2: 安装和配置

如果验证脚本发现问题，运行：

```bash
# 一键安装（推荐）
./setup.sh

# 或手动安装
npm install
cp .env.example .env
nano .env  # 编辑配置
npm run init-db
```

### 步骤 3: 启动服务

```bash
npm start
```

然后打开浏览器访问: **http://localhost:3000**

---

## 📚 快速导航

### 🔰 新手必读

1. **[QUICKSTART.md](QUICKSTART.md)** - 3分钟快速上手指南
   - 一键安装
   - 基本使用
   - 常见问题

2. **[README.md](README.md)** - 完整项目文档
   - 详细安装步骤
   - 功能说明
   - API 文档
   - 配置选项

### 📋 进阶资料

3. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - 项目技术总结
   - 技术栈详解
   - 架构设计
   - 实现细节

4. **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - 测试指南
   - 功能测试清单
   - 性能测试
   - 问题排查

---

## ✨ 核心功能一览

### 📥 批量下载
- 支持同时输入多个视频地址
- 智能并发下载（可配置，默认3个）
- 实时进度显示和速度监控

### 🎬 多格式支持
**视频格式:**
- MP4 (推荐) ⭐
- MKV
- WebM

**音频格式:**
- MP3 (推荐) ⭐
- AAC
- WAV
- M4A

### 📊 数据管理
- PostgreSQL 持久化存储
- 完整的视频元数据
- 关键字搜索
- 时间范围筛选

### 📤 多格式导出
- **HTML** - 精美网页报告
- **PDF** - 专业文档
- **Markdown** - 纯文本格式
- **PNG** - 截图图片

### 🔔 通知系统
下载完成后自动推送通知到：
- WxPusher (微信推送)
- PushPlus (微信推送)
- Resend Email (邮件)
- Telegram (Telegram Bot)

### 🎨 用户体验
- 现代化渐变色 UI
- 实时 WebSocket 通信
- 响应式设计（支持移动端）
- 完美中文支持

---

## 💡 使用技巧

### 技巧 1: 提高下载效率

编辑 `.env` 文件，增加并发数：
```env
MAX_CONCURRENT_DOWNLOADS=5
```

### 技巧 2: 批量输入 URL

可以直接从 Excel 或文本文件复制多行 URL，粘贴到输入框。

### 技巧 3: 快速导出

先用搜索功能筛选出需要的视频，然后点击导出按钮，只导出筛选后的结果。

### 技巧 4: 通知配置

在 `.env` 文件中配置通知渠道，下载完成自动收到提醒：
```env
WXPUSHER_TOKEN=your_token
WXPUSHER_UID=your_uid
```

### 技巧 5: 命令行快捷方式

创建 alias 方便启动：
```bash
echo "alias ytd='cd /path/to/youtube-downloader && npm start'" >> ~/.bashrc
```

---

## 📖 使用示例

### 示例 1: 下载单个视频

```
1. 打开 http://localhost:3000
2. 粘贴视频地址：https://www.youtube.com/watch?v=xxxxx
3. 选择 MP4 格式
4. 勾选下载音频，选择 MP3
5. 点击 "开始下载"
6. 等待完成，点击下载按钮获取文件
```

### 示例 2: 批量下载播放列表

```
1. 在 YouTube 播放列表页面
2. 复制所有视频链接
3. 粘贴到输入框（每行一个）
4. 配置格式和质量
5. 开始下载
6. 观察实时进度
```

### 示例 3: 搜索和导出

```
1. 在搜索框输入关键字，如 "教程"
2. 选择日期范围
3. 点击搜索
4. 查看筛选结果
5. 点击 "导出 PDF" 生成报告
```

---

## 🔧 快速命令参考

```bash
# 安装
./setup.sh                  # 一键安装
npm install                 # 安装依赖
npm run init-db             # 初始化数据库

# 运行
npm start                   # 启动服务器
npm run dev                 # 开发模式（自动重启）

# 验证
./verify.sh                 # 验证安装

# 数据库
psql -U postgres -d youtube_downloader  # 连接数据库

# 更新
npm update                  # 更新依赖
brew upgrade yt-dlp         # 更新 yt-dlp
```

---

## ⚙️ 环境配置速查

编辑 `.env` 文件：

```env
# 基本配置
PORT=3000                           # 服务器端口
DOWNLOAD_DIR=./downloads            # 下载目录
MAX_CONCURRENT_DOWNLOADS=3          # 并发数

# 数据库（必须配置）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_downloader
DB_USER=postgres
DB_PASSWORD=your_password

# 通知（可选）
WXPUSHER_TOKEN=xxx                  # WxPusher
PUSHPLUS_TOKEN=xxx                  # PushPlus
RESEND_API_KEY=xxx                  # Email
TELEGRAM_BOT_TOKEN=xxx              # Telegram
```

---

## 🐛 遇到问题？

### 常见问题速查

**Q: 提示 "yt-dlp: command not found"**
```bash
brew install yt-dlp
```

**Q: 数据库连接失败**
```bash
brew services start postgresql
npm run init-db
```

**Q: 端口被占用**
```bash
# 修改 .env 中的 PORT 值
PORT=3001
```

**Q: 下载速度慢**
```bash
# 增加并发数
MAX_CONCURRENT_DOWNLOADS=5
```

### 获取帮助

1. 📖 查看 [README.md](README.md) 详细文档
2. 🔍 查看 [TESTING_GUIDE.md](TESTING_GUIDE.md) 排查问题
3. 🐛 提交 GitHub Issue
4. 📧 发送邮件: seigneurtsui@goallez.dpdns.org

---

## 🎯 下一步

### 推荐操作流程

1. ✅ **运行验证脚本**
   ```bash
   ./verify.sh
   ```

2. ✅ **阅读快速开始**
   ```bash
   cat QUICKSTART.md
   ```

3. ✅ **启动服务器**
   ```bash
   npm start
   ```

4. ✅ **测试下载**
   - 访问 http://localhost:3000
   - 下载一个测试视频

5. ✅ **配置通知**（可选）
   - 编辑 `.env` 配置通知
   - 测试通知功能

6. ✅ **开始使用**
   - 批量下载视频
   - 管理视频库
   - 导出报告

---

## 🌟 功能亮点

### 为什么选择这个工具？

✨ **易用性**
- 一键安装脚本
- 美观的 Web 界面
- 实时进度反馈

⚡ **高效性**
- 并发下载支持
- 智能队列管理
- 最佳性能优化

🎯 **完整性**
- 视频+音频下载
- 多格式支持
- 完整的数据管理

🔔 **智能化**
- 自动通知推送
- 实时状态同步
- 错误自动处理

🌏 **本地化**
- 完美中文支持
- UTF-8 无乱码
- 符合国人习惯

---

## 🎉 开始您的下载之旅！

现在，您已经准备好使用这个强大的 YouTube 视频下载器了！

```bash
# 开始吧！
npm start
```

**访问: http://localhost:3000**

祝您使用愉快！ 🚀

---

## 📞 联系方式

- 📧 Email: seigneurtsui@goallez.dpdns.org
- 🐛 Issues: GitHub Issues
- 💬 讨论: GitHub Discussions

---

<div align="center">
  
**⭐ 如果觉得这个项目有帮助，请给个 Star！⭐**

Made with ❤️ by YouTube Video Downloader Team

</div>
