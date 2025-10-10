# ⚡ 快速开始（5分钟部署）

## 🎯 目标

5分钟内启动 YouTube 视频批量下载管理器！

---

## 📋 前置条件检查

在终端运行以下命令检查：

```bash
# 检查 Node.js（需要 16+）
node --version

# 检查 PostgreSQL（需要 12+）
psql --version

# 检查 npm
npm --version
```

如果缺少任何工具，请先安装。

---

## 🚀 5分钟部署

### 步骤 1: 安装依赖（1分钟）

```bash
cd /workspace
npm install
```

等待依赖安装完成。

---

### 步骤 2: 配置数据库（2分钟）

#### 2.1 创建数据库

```bash
# 连接到 PostgreSQL
psql -U postgres

# 在 psql 中执行
CREATE DATABASE youtube_downloader;
\q
```

#### 2.2 编辑配置

编辑 `.env` 文件，修改数据库密码：

```bash
nano .env
# 或
vim .env
```

修改这一行：

```env
DB_PASSWORD=你的postgres密码
```

保存退出（nano: Ctrl+X → Y → Enter）

---

### 步骤 3: 初始化数据库（30秒）

```bash
npm run init-db
```

看到 `✅ 数据库表创建成功！` 即可。

---

### 步骤 4: 启动服务（30秒）

```bash
npm start
```

看到以下输出表示成功：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 YouTube视频批量下载管理器已启动
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 服务地址: http://localhost:3000
```

---

### 步骤 5: 访问系统（10秒）

打开浏览器访问：

```
http://localhost:3000
```

🎉 **完成！开始下载视频吧！**

---

## 🎬 第一次使用

### 下载你的第一个视频

1. 在"视频地址列表"输入框中粘贴一个 YouTube URL：
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```

2. 选择配置：
   - 视频格式：MP4
   - 视频质量：最佳质量
   - 可选：勾选"同时下载音频"

3. 点击 **🚀 开始下载**

4. 等待下载完成（查看实时进度）

5. 在视频列表中点击 **📥 视频** 下载到本地

---

## 🔍 验证安装

运行测试脚本：

```bash
./test-api.sh
```

应该看到 JSON 格式的 API 响应。

---

## 🐛 遇到问题？

### 问题 1: 数据库连接失败

```
❌ 数据库连接失败
```

**解决方案：**
1. 确认 PostgreSQL 正在运行
2. 检查 `.env` 中的数据库配置
3. 确认数据库已创建

### 问题 2: 端口被占用

```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案：**
在 `.env` 中修改端口：

```env
PORT=3001
```

### 问题 3: 下载失败

```
❌ 下载失败
```

**解决方案：**
1. 检查网络连接
2. 确认 YouTube URL 有效
3. 查看服务器日志获取详细错误

---

## 📚 下一步

### 了解更多功能

- 📖 [完整文档](README_PROJECT.md)
- 🔧 [设置指南](SETUP_GUIDE.md)
- 💡 [使用示例](USAGE_EXAMPLES.md)
- 📊 [项目概览](PROJECT_OVERVIEW.md)

### 配置通知

查看 `SETUP_GUIDE.md` 中的"配置通知"章节。

### 性能调优

在 `.env` 中调整并发数：

```env
MAX_CONCURRENT_DOWNLOADS=5
```

---

## 🎯 常用命令

```bash
# 启动服务器
npm start

# 开发模式（自动重启）
npm run dev

# 初始化数据库
npm run init-db

# 测试 API
./test-api.sh

# 查看日志（如果使用 PM2）
pm2 logs youtube-downloader
```

---

## 🎉 大功告成！

现在你可以：

✅ 批量下载 YouTube 视频  
✅ 管理视频数据库  
✅ 搜索和过滤视频  
✅ 导出多种格式报告  
✅ 接收下载完成通知  

开始享受高效的视频下载体验吧！🚀

---

**需要帮助？** 查看 [SETUP_GUIDE.md](SETUP_GUIDE.md) 或 [README_PROJECT.md](README_PROJECT.md)
