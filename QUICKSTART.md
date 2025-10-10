# 快速启动指南 - 幻灯片视频生成器

## 🚀 5分钟快速部署

### 第一步：安装依赖

```bash
# 1. 安装 Node.js 依赖
npm install

# 2. 安装 FFmpeg (macOS)
brew install ffmpeg

# 或者 (Ubuntu/Debian)
sudo apt update
sudo apt install ffmpeg

# 3. 验证 FFmpeg 安装
ffmpeg -version
```

### 第二步：配置数据库

```bash
# 1. 登录 PostgreSQL
psql -U postgres

# 2. 创建数据库
CREATE DATABASE slideshow_generator WITH ENCODING 'UTF8';

# 3. 退出
\q

# 4. 配置环境变量
cp .env.example .env

# 5. 编辑 .env 文件，设置数据库密码
nano .env  # 或使用其他编辑器

# 6. 初始化表结构
npm run init-db
```

### 第三步：启动服务

```bash
# 启动服务器
npm start

# 或者使用开发模式（自动重启）
npm run dev
```

### 第四步：访问应用

打开浏览器访问：**http://localhost:3000**

## 📋 基本使用流程

### 生成第一个视频

1. **准备素材**
   - 一段文本内容
   - 一个背景音乐文件（MP3、WAV等）
   - （可选）一张背景图片

2. **在「生成视频」TAB中：**
   - 输入文本内容
   - 上传背景音乐
   - 上传背景图片（或选择背景颜色）
   - 调整字体样式
   - 设置文本位置
   - 选择动画效果
   - 点击「实时预览」查看效果
   - 点击「生成视频」

3. **等待生成**
   - 查看实时进度
   - 查看累计耗时
   - 生成完成后自动显示报告

4. **下载视频**
   - 点击下载按钮
   - 保存到本地

### 管理视频列表

1. **切换到「视频列表」TAB**

2. **查看所有视频**
   - 浏览生成的视频列表
   - 调整每页显示数量（10/20/30/50/100/全部）

3. **搜索和筛选**
   - 使用关键字搜索
   - 按日期范围筛选
   - 按状态筛选

4. **导出列表**
   - 选择导出格式（Excel/HTML/PDF/Markdown）
   - 自动下载导出文件

5. **下载或删除视频**
   - 点击下载按钮获取视频
   - 点击删除按钮删除视频

## ⚙️ 最小配置

`.env` 文件最小配置：

```env
# 数据库（必需）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slideshow_generator
DB_USER=postgres
DB_PASSWORD=your_password

# 服务器（可选，默认3000）
PORT=3000

# 路径（可选，使用默认值）
UPLOAD_PATH=./uploads
OUTPUT_PATH=./outputs
TEMP_PATH=./temp
```

## 🎨 推荐设置

### 最佳视频质量
- 分辨率：1920x1080 (默认)
- 帧率：30 FPS (默认)
- 格式：MP4

### 字体设置建议
- 字体大小：48-72px
- 字体颜色：白色（#FFFFFF）
- 字体背景：透明（或深色半透明）
- 边距：100-200px

### 动画效果推荐
- **专业感**：淡入淡出
- **活泼感**：滑动效果
- **强调感**：放大效果

## 🐛 常见问题

### Q: 安装 canvas 模块失败？
**A:** 需要先安装系统依赖：

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm install canvas
```

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
npm install canvas
```

### Q: FFmpeg 找不到？
**A:** 确保 FFmpeg 已安装并在 PATH 中：
```bash
which ffmpeg  # Linux/macOS
where ffmpeg  # Windows
```

### Q: 数据库连接失败？
**A:** 检查：
1. PostgreSQL 是否运行：`sudo systemctl status postgresql`
2. 数据库是否创建：`psql -U postgres -l`
3. 密码是否正确
4. 是否运行了 `npm run init-db`

### Q: 生成视频速度慢？
**A:** 这是正常的，取决于：
1. 视频时长
2. 服务器性能
3. 背景音乐大小
4. 动画复杂度

通常 5秒视频需要 30-60秒生成时间。

### Q: 中文字体显示为方框？
**A:** 上传自定义中文字体文件（.ttf 格式）。

### Q: 视频无声音？
**A:** 确保：
1. 背景音乐文件完整
2. 音频格式正确
3. 音频文件未损坏

## 📚 进阶使用

### 自定义字体
1. 准备 TTF、OTF 或 WOFF 格式的字体文件
2. 在表单中上传字体文件
3. 字体会自动应用到视频中

### 使用背景图片
1. 准备 JPG、PNG 等格式的图片
2. 建议分辨率：1920x1080 或更高
3. 上传后背景颜色设置自动失效

### 调整文本位置
- 居中显示：上下左右边距相等
- 底部字幕：增大上边距，减小下边距
- 左对齐：减小左边距
- 右对齐：减小右边距

### 选择合适的时长
- 短文本：3-5秒
- 中等文本：5-10秒
- 长文本：10-30秒
- 音乐时长自动匹配

## 🎯 性能优化建议

1. **图片优化**
   - 使用合适的分辨率（不要过大）
   - 压缩图片文件大小

2. **音频优化**
   - 使用 MP3 或 AAC 格式
   - 比特率：128-192 kbps 足够

3. **服务器配置**
   - 确保足够的磁盘空间
   - 定期清理旧文件
   - 增加内存提升性能

## 📞 获取帮助

- 查看完整文档：`README.md`
- 检查服务器日志
- 提交 GitHub Issue

---

**祝您使用愉快！** 🎉
