// Main Server File - Slideshow Video Generator
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const db = require('./db/database');
const VideoGenerator = require('./services/video-generator');
const ExportService = require('./services/exporter');
const WebSocketServer = require('./services/websocket');

// 创建 Express 应用
const app = express();
const server = http.createServer(app);

// 初始化服务
const wsServer = new WebSocketServer(server);
const videoGenerator = new VideoGenerator(wsServer);
const exportService = new ExportService();

// Multer 配置 - 文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== API 路由 ====================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    wsClients: wsServer.getClientCount()
  });
});

// 获取系统统计
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.videos.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 创建视频记录（带文件上传）
app.post('/api/videos/create',
  upload.fields([
    { name: 'background_image', maxCount: 1 },
    { name: 'background_music', maxCount: 1 },
    { name: 'custom_font', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const videoData = {
        text_content: req.body.text_content,
        background_color: req.body.background_color || '#000000',
        font_family: req.body.font_family || 'Arial',
        font_size: parseInt(req.body.font_size) || 48,
        font_color: req.body.font_color || '#FFFFFF',
        font_background_color: req.body.font_background_color || 'transparent',
        text_margin_top: parseInt(req.body.text_margin_top) || 100,
        text_margin_bottom: parseInt(req.body.text_margin_bottom) || 100,
        text_margin_left: parseInt(req.body.text_margin_left) || 100,
        text_margin_right: parseInt(req.body.text_margin_right) || 100,
        slide_duration: parseInt(req.body.slide_duration) || 5,
        text_animation: req.body.text_animation || 'fade',
        video_format: req.body.video_format || 'mp4',
        video_width: parseInt(req.body.video_width) || 1920,
        video_height: parseInt(req.body.video_height) || 1080,
        video_fps: parseInt(req.body.video_fps) || 30
      };

      // 添加上传的文件路径
      if (req.files.background_image) {
        videoData.background_image = req.files.background_image[0].path;
      }
      if (req.files.background_music) {
        videoData.background_music = req.files.background_music[0].path;
      } else {
        return res.status(400).json({
          success: false,
          error: '背景音乐是必需的'
        });
      }
      if (req.files.custom_font) {
        videoData.custom_font = req.files.custom_font[0].path;
      }

      const video = await db.videos.create(videoData);

      res.json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('创建视频记录失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// 生成视频
app.post('/api/videos/:id/generate', async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await db.videos.getById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        error: '视频记录不存在'
      });
    }

    // 异步生成视频
    res.json({
      success: true,
      message: '视频生成任务已启动',
      videoId
    });

    // 在后台生成视频
    videoGenerator.generateVideo(videoId).catch(error => {
      console.error('视频生成失败:', error);
      wsServer.sendError(error);
    });

  } catch (error) {
    console.error('启动视频生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取视频列表（支持搜索和分页）
app.get('/api/videos', async (req, res) => {
  try {
    const { keyword, start_date, end_date, status, limit, offset } = req.query;

    const result = await db.videos.list({
      keyword,
      start_date,
      end_date,
      status,
      limit: limit || 50,
      offset: parseInt(offset) || 0
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个视频详情
app.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await db.videos.getById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        error: '视频不存在'
      });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('获取视频详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除视频
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const success = await videoGenerator.deleteVideo(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '视频不存在'
      });
    }

    res.json({
      success: true,
      message: '视频已删除'
    });
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 导出视频列表
app.post('/api/videos/export', async (req, res) => {
  try {
    const { format, filters } = req.body;

    if (!format) {
      return res.status(400).json({
        success: false,
        error: '缺少导出格式'
      });
    }

    // 获取要导出的视频列表
    const result = await db.videos.list(filters || {});

    if (result.videos.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有可导出的视频'
      });
    }

    // 导出
    const exportResult = await exportService.export(result.videos, format, filters);

    res.json({
      success: true,
      data: {
        format,
        filename: exportResult.filename,
        filepath: exportResult.filepath,
        downloadUrl: `/exports/${exportResult.filename}`,
        videoCount: result.videos.length
      }
    });
  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 生成预览数据
app.post('/api/videos/preview', async (req, res) => {
  try {
    const {
      text_content,
      background_color,
      font_family,
      font_size,
      font_color,
      font_background_color,
      text_margin_top,
      text_margin_bottom,
      text_margin_left,
      text_margin_right
    } = req.body;

    // 返回预览配置
    res.json({
      success: true,
      data: {
        text_content,
        background_color,
        font_family,
        font_size,
        font_color,
        font_background_color,
        text_margin_top,
        text_margin_bottom,
        text_margin_left,
        text_margin_right
      }
    });
  } catch (error) {
    console.error('生成预览失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

// ==================== 启动服务器 ====================

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 检查 FFmpeg
    const ffmpegInstalled = await videoGenerator.checkFFmpeg();
    if (!ffmpegInstalled) {
      console.warn('⚠️  警告: FFmpeg 未安装，视频生成功能将无法使用');
    }

    // 测试数据库连接
    await db.query('SELECT NOW()');
    console.log('✅ 数据库连接成功');

    // 启动服务器
    server.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🎬 幻灯片视频生成器启动成功！');
      console.log('='.repeat(50));
      console.log(`📡 HTTP服务: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🌐 前端页面: http://localhost:${PORT}/index.html`);
      console.log(`📁 输出目录: ${videoGenerator.outputPath}`);
      console.log('='.repeat(50) + '\n');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n收到 SIGTERM 信号，正在关闭服务器...');
  wsServer.close();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在关闭服务器...');
  wsServer.close();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 启动
startServer();

module.exports = { app, server };
