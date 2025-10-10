# 幻灯片视频生成器

一个功能强大的幻灯片视频生成工具，可以将文本、背景图片和背景音乐合成为视频，基于 Node.js + PostgreSQL + 纯HTML/CSS 构建。

## ✨ 主要特性

### 🎬 视频生成功能
- ✅ 文本内容输入（必选）
- ✅ 背景音乐上传（必选，支持所有音频格式）
- ✅ 背景图片上传（可选，支持所有图片格式）
- ✅ 背景颜色选择（可选，无图片时生效）
- ✅ 自定义字体上传（可选，支持TTF/OTF/WOFF格式）

### 🔤 字体设置
- ✅ 字体类型选择（10+种预设字体）
- ✅ 字体大小调节（12-200px）
- ✅ 字体颜色选择
- ✅ 字体背景色选择（支持透明）

### 📐 文本位置控制
- ✅ 上边距调节（0-1000px）
- ✅ 下边距调节（0-1000px）
- ✅ 左边距调节（0-1000px）
- ✅ 右边距调节（0-1000px）

### 🎨 动画效果
- ✅ 淡入淡出效果
- ✅ 从右滑入
- ✅ 从左滑入
- ✅ 从下滑入
- ✅ 从上滑入
- ✅ 放大效果
- ✅ 无动画

### 📹 视频设置
- ✅ 幻灯片时长调节（1-300秒）
- ✅ 视频格式选择（MP4/MKV/AVI）
- ✅ 分辨率：1920x1080 (Full HD)
- ✅ 帧率：30 FPS

### 👁️ 实时预览
- ✅ 动态预览文本显示效果
- ✅ 实时更新所有样式变化
- ✅ 预览动画效果

### 📊 进度监控
- ✅ WebSocket实时进度更新
- ✅ 进度条显示
- ✅ 累计耗时统计
- ✅ 详细的生成报告

### 📋 列表管理
- ✅ 独立的列表管理TAB
- ✅ 显示所有生成的视频记录
- ✅ 关键字搜索（文本内容）
- ✅ 时间范围筛选
- ✅ 状态筛选（待生成/生成中/已完成/失败）
- ✅ 分页功能（10/20/30/50/100/全部）
- ✅ 视频下载链接
- ✅ 视频删除功能

### 📤 导出功能
- ✅ 导出为Excel（XLSX格式）
- ✅ 导出为HTML（美观的报告）
- ✅ 导出为PDF文档
- ✅ 导出为Markdown格式
- ✅ 完美支持中文（无乱码）

### 💾 数据管理
- ✅ PostgreSQL数据库存储
- ✅ 完整的视频元数据
- ✅ 文件关联管理
- ✅ 自动时间戳

## 🚀 快速开始

### 前置要求

1. **Node.js** >= 14.x
2. **PostgreSQL** >= 12.x
3. **FFmpeg** (视频处理工具)

#### 安装 FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
下载 [FFmpeg](https://ffmpeg.org/download.html) 并添加到系统PATH

验证安装：
```bash
ffmpeg -version
```

### 安装步骤

1. **安装依赖**
```bash
npm install
```

2. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slideshow_generator
DB_USER=postgres
DB_PASSWORD=your_password

# 服务器配置
PORT=3000

# 上传和输出路径
UPLOAD_PATH=./uploads
OUTPUT_PATH=./outputs
TEMP_PATH=./temp
```

3. **创建数据库**
```bash
# 登录 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE slideshow_generator WITH ENCODING 'UTF8';

# 退出
\q
```

4. **初始化数据库表**
```bash
npm run init-db
```

5. **启动服务**
```bash
npm start
```

开发模式（自动重启）：
```bash
npm run dev
```

6. **访问应用**

打开浏览器访问：http://localhost:3000

## 📖 使用指南

### 生成视频

1. **切换到「生成视频」TAB**

2. **输入文本内容**（必填）
   - 在文本框中输入要显示的文本

3. **上传背景音乐**（必填）
   - 点击选择音频文件
   - 支持所有常见音频格式

4. **上传背景图片**（可选）
   - 如果不上传，将使用背景颜色

5. **选择背景颜色**（可选）
   - 在无背景图片时生效

6. **上传自定义字体**（可选）
   - 支持 TTF、OTF、WOFF 格式

7. **设置字体属性**
   - 字体类型（10+种预设）
   - 字体大小（12-200px）
   - 字体颜色
   - 字体背景色（可设为透明）

8. **调整文本位置**
   - 上下左右边距（0-1000px）

9. **选择动画效果**
   - 7种动画效果可选

10. **设置幻灯片时长**
    - 1-300秒可调

11. **选择视频格式**
    - MP4（推荐）
    - MKV
    - AVI

12. **实时预览**
    - 点击「实时预览」按钮查看效果
    - 所有设置实时更新

13. **生成视频**
    - 点击「生成视频」按钮
    - 查看实时进度
    - 等待生成完成
    - 下载视频

### 管理视频列表

1. **切换到「视频列表」TAB**

2. **搜索视频**
   - 关键字搜索
   - 日期范围筛选
   - 状态筛选

3. **查看列表**
   - 显示所有视频记录
   - 分页浏览
   - 调整每页显示数量

4. **下载视频**
   - 点击下载按钮

5. **删除视频**
   - 点击删除按钮
   - 确认删除

6. **导出列表**
   - 选择导出格式
   - 自动下载导出文件

## 🔧 API 接口

### 视频相关

#### 创建视频记录
```http
POST /api/videos/create
Content-Type: multipart/form-data

text_content: "文本内容"
background_music: <file>
background_image: <file> (可选)
custom_font: <file> (可选)
...其他参数
```

#### 生成视频
```http
POST /api/videos/:id/generate
```

#### 获取视频列表
```http
GET /api/videos?keyword=xxx&status=completed&limit=50&offset=0
```

#### 获取单个视频
```http
GET /api/videos/:id
```

#### 删除视频
```http
DELETE /api/videos/:id
```

### 导出相关

#### 导出视频列表
```http
POST /api/videos/export
Content-Type: application/json

{
  "format": "excel",
  "filters": {
    "keyword": "xxx",
    "status": "completed"
  }
}
```

### 统计相关

#### 获取统计信息
```http
GET /api/stats
```

## 📁 项目结构

```
slideshow-video-generator/
├── db/                      # 数据库模块
│   ├── database.js         # 数据库连接和操作
│   └── init.js             # 数据库初始化脚本
├── services/               # 业务逻辑服务
│   ├── video-generator.js  # 视频生成服务
│   ├── exporter.js         # 导出服务
│   └── websocket.js        # WebSocket服务
├── public/                 # 前端文件
│   ├── index.html          # 主页面（双TAB）
│   ├── style.css           # 样式文件
│   └── app.js              # 前端逻辑
├── uploads/                # 上传文件目录
├── outputs/                # 生成的视频目录
├── temp/                   # 临时文件目录
├── exports/                # 导出文件目录
├── server.js               # 主服务器文件
├── init.sql                # 数据库初始化SQL
├── package.json            # 项目配置
├── .env.example            # 环境变量示例
└── README.md               # 项目文档
```

## 🎯 技术栈

### 后端
- **Node.js** - JavaScript运行时
- **Express.js** - Web框架
- **PostgreSQL** - 关系型数据库
- **WebSocket (ws)** - 实时通信
- **FFmpeg** - 视频处理
- **fluent-ffmpeg** - FFmpeg Node.js封装
- **Canvas** - 图像生成
- **Multer** - 文件上传
- **ExcelJS** - Excel生成
- **html-pdf-node** - PDF生成
- **Marked** - Markdown解析

### 前端
- **纯HTML/CSS/JavaScript** - 无框架依赖
- **WebSocket** - 实时更新
- **Fetch API** - HTTP请求
- **CSS Grid/Flexbox** - 响应式布局
- **CSS Animations** - 动画效果

## ⚙️ 配置说明

### 视频分辨率

默认分辨率为 1920x1080 (Full HD)，可在 `.env` 中修改：

```env
DEFAULT_VIDEO_WIDTH=1920
DEFAULT_VIDEO_HEIGHT=1080
DEFAULT_FPS=30
```

### 文件大小限制

默认上传文件大小限制为 100MB，可在 `server.js` 中修改：

```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});
```

### 视频时长限制

默认最大视频时长为 300秒（5分钟），可在 `.env` 中修改：

```env
MAX_VIDEO_DURATION=300
```

## 🐛 故障排除

### FFmpeg 未找到

**错误信息**: `FFmpeg 未安装或配置错误`

**解决方案**:
1. 确保已安装 FFmpeg
2. 验证安装: `ffmpeg -version`
3. 如果使用自定义路径，在 `.env` 中设置:
```env
FFMPEG_PATH=/path/to/ffmpeg
FFPROBE_PATH=/path/to/ffprobe
```

### 数据库连接失败

**错误信息**: `数据库连接错误`

**解决方案**:
1. 确保 PostgreSQL 服务正在运行
2. 检查 `.env` 中的数据库配置
3. 确认数据库已创建
4. 运行初始化脚本: `npm run init-db`

### Canvas 安装失败

**错误信息**: `Canvas模块安装失败`

**解决方案** (Ubuntu/Debian):
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm install canvas
```

**解决方案** (macOS):
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
npm install canvas
```

### 视频生成失败

**常见原因**:
1. 音频文件损坏
2. 图片格式不支持
3. 磁盘空间不足
4. FFmpeg配置错误

**解决方案**:
- 检查上传的文件是否完整
- 查看服务器日志了解详细错误
- 确保有足够的磁盘空间

### 中文字体显示问题

**解决方案**:
1. 上传自定义中文字体文件
2. 或在系统中安装中文字体:
```bash
# Ubuntu/Debian
sudo apt-get install fonts-wqy-zenhei fonts-wqy-microhei
```

## 📝 开发计划

- [ ] 支持多段文本（场景切换）
- [ ] 支持视频转场效果
- [ ] 添加更多动画效果
- [ ] 支持字幕SRT导入
- [ ] 批量视频生成
- [ ] 视频模板功能
- [ ] 音乐淡入淡出
- [ ] 视频预览功能

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 本工具生成的视频仅供个人使用，请勿用于商业用途。
