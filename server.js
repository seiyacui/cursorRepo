// Main Server File - YouTube Video Downloader
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db/database');
const VideoDownloader = require('./services/downloader');
const NotificationService = require('./services/notification-adapter');
const ExportService = require('./services/exporter');
const WebSocketServer = require('./services/websocket');

// 创建 Express 应用
const app = express();
const server = http.createServer(app);

// 初始化服务
const wsServer = new WebSocketServer(server);
const downloader = new VideoDownloader(wsServer);
const notificationService = new NotificationService();
const exportService = new ExportService();

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
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

// 获取视频信息（不下载）
app.post('/api/videos/info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少视频URL'
      });
    }

    const info = await downloader.getVideoInfo(url);
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('获取视频信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量添加视频到数据库（准备下载）
app.post('/api/videos/batch-add', async (req, res) => {
  try {
    const { urls, videoFormat, audioFormat, downloadAudio } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少视频URL列表'
      });
    }

    const videos = [];
    const errors = [];

    // 批量获取视频信息并创建数据库记录
    for (const url of urls) {
      try {
        const info = await downloader.getVideoInfo(url);
        
        const video = await db.videos.create({
          video_url: url,
          video_id: info.video_id,
          title: info.title,
          filename: `${info.video_id}.${videoFormat || 'mp4'}`,
          video_format: videoFormat || 'mp4',
          audio_format: downloadAudio ? (audioFormat || 'mp3') : null,
          duration: info.duration,
          thumbnail_url: info.thumbnail
        });
        
        videos.push(video);
      } catch (error) {
        console.error(`获取视频信息失败 (${url}):`, error);
        errors.push({ url, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        added: videos.length,
        failed: errors.length,
        videos,
        errors
      }
    });
  } catch (error) {
    console.error('批量添加视频失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 开始批量下载
app.post('/api/videos/batch-download', async (req, res) => {
  try {
    const { videoIds, videoFormat, audioFormat, downloadAudio, batchName } = req.body;
    
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少视频ID列表'
      });
    }

    // 发送开始通知
    await notificationService.sendDownloadStarted(videoIds.length);

    // 异步执行下载任务
    res.json({
      success: true,
      message: '下载任务已启动',
      data: {
        videoCount: videoIds.length,
        status: 'started'
      }
    });

    // 在后台执行下载
    const startTime = Date.now();
    const result = await downloader.downloadBatch(videoIds, {
      videoFormat,
      audioFormat,
      downloadAudio,
      batchName
    });

    const totalTime = (Date.now() - startTime) / 1000;

    // 获取所有视频的详细信息
    const videos = await db.batches.getVideos(result.batchId);

    // 发送完成通知
    await notificationService.sendBatchDownloadComplete(result, videos);

    // 通过 WebSocket 发送完成消息
    wsServer.sendNotification({
      type: 'batch_complete',
      batchId: result.batchId,
      result,
      totalTime
    });

  } catch (error) {
    console.error('批量下载失败:', error);
    wsServer.sendError(error);
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
      limit: parseInt(limit) || 100,
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
    // 先清理文件
    await downloader.cleanupDownloadedFiles(req.params.id);
    
    // 再删除数据库记录
    const video = await db.videos.delete(req.params.id);
    
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

// 取消下载
app.post('/api/videos/:id/cancel', async (req, res) => {
  try {
    const success = await downloader.cancelDownload(req.params.id);
    
    res.json({
      success,
      message: success ? '下载已取消' : '未找到正在进行的下载任务'
    });
  } catch (error) {
    console.error('取消下载失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取批次列表
app.get('/api/batches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM download_batches
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取批次列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取批次详情
app.get('/api/batches/:id', async (req, res) => {
  try {
    const batch = await db.batches.getById(req.params.id);
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: '批次不存在'
      });
    }

    const videos = await db.batches.getVideos(req.params.id);
    
    res.json({
      success: true,
      data: {
        ...batch,
        videos
      }
    });
  } catch (error) {
    console.error('获取批次详情失败:', error);
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
    // 检查 yt-dlp
    const ytDlpInstalled = await downloader.checkYtDlp();
    if (!ytDlpInstalled) {
      console.warn('⚠️  警告: yt-dlp 未安装，下载功能将无法使用');
    }

    // 测试数据库连接
    await db.query('SELECT NOW()');
    console.log('✅ 数据库连接成功');

    // 启动服务器
    server.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🚀 YouTube视频批量下载器启动成功！');
      console.log('='.repeat(50));
      console.log(`📡 HTTP服务: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`📁 前端页面: http://localhost:${PORT}/index.html`);
      console.log(`💾 下载目录: ${downloader.downloadPath}`);
      console.log(`📊 并发下载: ${downloader.concurrentDownloads}`);
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
