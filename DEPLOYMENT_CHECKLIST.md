# ✅ 部署检查清单

在部署和使用系统前，请完成以下检查项。

---

## 📋 部署前检查

### 1. 系统环境

- [ ] 操作系统已更新到最新版本
- [ ] 有足够的磁盘空间（建议 50GB+）
- [ ] 网络连接稳定

### 2. 软件安装

- [ ] Node.js 16+ 已安装
  ```bash
  node --version  # 应显示 v16.0.0 或更高
  ```

- [ ] PostgreSQL 12+ 已安装并运行
  ```bash
  psql --version
  sudo systemctl status postgresql  # Linux
  ```

- [ ] npm 已安装
  ```bash
  npm --version
  ```

### 3. 项目文件

- [ ] 所有代码文件已下载/克隆
- [ ] 文件权限正确（脚本可执行）
  ```bash
  chmod +x *.sh
  ```

---

## 🔧 配置检查

### 1. 环境变量

- [ ] `.env` 文件已创建（从 `.env.example` 复制）
- [ ] 数据库配置已填写
  ```env
  DB_HOST=localhost
  DB_PORT=5432
  DB_USER=postgres
  DB_PASSWORD=你的密码  ← 必须修改
  DB_NAME=youtube_downloader
  ```

- [ ] 服务端口已配置（默认 3000）
- [ ] 下载路径已配置（默认 ./downloads）
- [ ] 并发数已配置（默认 3）

### 2. 通知配置（可选）

- [ ] WxPusher Token 和 UID（如需要）
- [ ] PushPlus Token（如需要）
- [ ] Resend API Key 和 Email（如需要）
- [ ] Telegram Bot Token 和 Chat ID（如需要）

---

## 💾 数据库检查

### 1. 数据库创建

- [ ] PostgreSQL 服务已启动
- [ ] 数据库 `youtube_downloader` 已创建
  ```bash
  psql -U postgres -c "CREATE DATABASE youtube_downloader;"
  ```

### 2. 数据库初始化

- [ ] 依赖已安装
  ```bash
  npm install
  ```

- [ ] 数据库表已创建
  ```bash
  npm run init-db
  ```

- [ ] 看到成功消息：
  ```
  ✅ 数据库表创建成功！
  📊 已创建以下表：
    - videos (视频记录表)
    - download_queue (下载队列表)
    - notification_logs (通知日志表)
    - export_logs (导出记录表)
  ```

---

## 🚀 启动检查

### 1. 首次启动

- [ ] 运行启动命令
  ```bash
  npm start
  ```

- [ ] 看到成功消息：
  ```
  ✅ 数据库连接成功
  🎉 YouTube视频批量下载管理器已启动
  📍 服务地址: http://localhost:3000
  ```

- [ ] 没有错误信息

### 2. API 测试

- [ ] 运行测试脚本
  ```bash
  ./test-api.sh
  ```

- [ ] 健康检查通过
  ```json
  {"status":"ok","message":"YouTube下载管理器运行中"}
  ```

- [ ] 统计接口正常
  ```json
  {"success":true,"data":{...}}
  ```

### 3. Web 界面

- [ ] 浏览器打开 http://localhost:3000
- [ ] 页面正常加载
- [ ] 没有控制台错误
- [ ] 所有控件正常显示
- [ ] 中文显示正常

---

## 🧪 功能测试

### 1. 下载功能

- [ ] 输入测试视频 URL
- [ ] 选择视频格式
- [ ] 点击"开始下载"
- [ ] 进度条正常显示
- [ ] 下载成功完成
- [ ] 视频出现在列表中

### 2. 搜索功能

- [ ] 输入关键字搜索
- [ ] 选择状态过滤
- [ ] 设置日期范围
- [ ] 搜索结果正确

### 3. 导出功能

- [ ] 选择 HTML 格式导出
- [ ] 文件成功下载
- [ ] 内容显示正常
- [ ] 中文无乱码

### 4. 通知功能（如已配置）

- [ ] 下载完成后收到通知
- [ ] 通知内容正确
- [ ] 所有渠道正常

---

## 🔒 安全检查

### 1. 敏感信息

- [ ] `.env` 文件未提交到版本控制
- [ ] 数据库密码已修改（不使用默认密码）
- [ ] 通知 Token 已保护

### 2. 权限设置

- [ ] 下载目录权限正确
- [ ] 数据库用户权限最小化
- [ ] 文件上传限制已设置

### 3. 网络安全

- [ ] 防火墙规则已配置（如需要）
- [ ] 只开放必要端口
- [ ] 生产环境使用 HTTPS（如需要）

---

## 📊 性能检查

### 1. 资源使用

- [ ] CPU 使用率正常
- [ ] 内存使用合理
- [ ] 磁盘空间充足
- [ ] 网络带宽充足

### 2. 并发测试

- [ ] 批量下载测试（3个视频）
- [ ] 并发下载正常工作
- [ ] 系统响应正常
- [ ] 无内存泄漏

---

## 📝 文档检查

- [ ] 阅读 QUICKSTART.md
- [ ] 阅读 SETUP_GUIDE.md
- [ ] 了解 USAGE_EXAMPLES.md
- [ ] 熟悉常见问题解答

---

## 🎯 生产环境额外检查

如果要在生产环境部署：

### 1. 进程管理

- [ ] 安装 PM2
  ```bash
  npm install -g pm2
  ```

- [ ] 使用 PM2 启动
  ```bash
  pm2 start server.js --name youtube-downloader
  ```

- [ ] 设置开机自启
  ```bash
  pm2 startup
  pm2 save
  ```

### 2. 日志管理

- [ ] 日志目录已创建
- [ ] 日志轮转已配置
- [ ] 定期清理旧日志

### 3. 备份策略

- [ ] 数据库定期备份
  ```bash
  pg_dump -U postgres youtube_downloader > backup.sql
  ```

- [ ] 下载文件备份
- [ ] 配置文件备份

### 4. 监控

- [ ] 服务状态监控
- [ ] 磁盘空间监控
- [ ] 错误日志监控

---

## ✅ 最终确认

部署完成后，确认：

- [ ] 系统稳定运行 24 小时无错误
- [ ] 所有功能测试通过
- [ ] 文档已阅读并理解
- [ ] 备份策略已实施
- [ ] 团队成员已培训（如适用）

---

## 🎉 部署完成！

所有检查项都完成后，你的系统已准备好投入使用！

**下一步：**
- 阅读 USAGE_EXAMPLES.md 学习高级用法
- 配置定期备份
- 根据需要优化性能

---

**祝你使用愉快！** 🚀

如有问题，请参考：
- SETUP_GUIDE.md（故障排除）
- PROJECT_OVERVIEW.md（技术细节）
- GitHub Issues（社区支持）
