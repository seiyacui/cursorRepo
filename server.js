const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const database = require('./db/database');
const downloader = require('./services/downloader');
const exportService = require('./services/export');
const notificationAdapter = require('./services/notificationAdapter');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS) || 3;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/downloads', express.static(process.env.DOWNLOAD_DIR || './downloads'));

// WebSocket connections
const wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('✅ WebSocket客户端已连接');
  wsClients.add(ws);
  
  ws.on('close', () => {
    console.log('❌ WebSocket客户端已断开');
    wsClients.delete(ws);
  });
});

// Broadcast to all WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Download queue management
class DownloadQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.active = new Map();
  }
  
  async add(task) {
    this.queue.push(task);
    this.processQueue();
  }
  
  async processQueue() {
    while (this.queue.length > 0 && this.active.size < this.maxConcurrent) {
      const task = this.queue.shift();
      this.active.set(task.videoId, task);
      
      try {
        await task.execute();
      } catch (error) {
        console.error(`任务执行失败 (视频ID: ${task.videoId}):`, error);
      } finally {
        this.active.delete(task.videoId);
        this.processQueue();
      }
    }
  }
  
  getStatus() {
    return {
      queued: this.queue.length,
      active: this.active.size,
      total: this.queue.length + this.active.size
    };
  }
}

const downloadQueue = new DownloadQueue(MAX_CONCURRENT);

// API Routes

// Get all videos
app.get('/api/videos', async (req, res) => {
  try {
    const filters = {
      keyword: req.query.keyword,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit
    };
    
    const videos = await database.getVideos(filters);
    res.json({ success: true, data: videos });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get video statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await database.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download videos (batch)
app.post('/api/download', async (req, res) => {
  try {
    const { urls, videoFormat, audioFormat, downloadAudio, quality } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的URL列表' });
    }
    
    const batchId = Date.now();
    const results = [];
    const startTime = Date.now();
    
    // Create database records for all videos
    for (const url of urls) {
      try {
        const videoRecord = await database.insertVideo({
          url: url.trim(),
          videoFormat: videoFormat || 'mp4',
          audioFormat: downloadAudio ? (audioFormat || 'mp3') : null
        });
        
        results.push({
          id: videoRecord.id,
          url: url.trim(),
          status: 'queued'
        });
      } catch (error) {
        console.error(`创建视频记录失败 (${url}):`, error);
        results.push({
          url: url.trim(),
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // Send immediate response
    res.json({
      success: true,
      batchId,
      message: `已添加 ${results.length} 个视频到下载队列`,
      results
    });
    
    // Process downloads asynchronously
    processDownloads(results.filter(r => r.id), {
      videoFormat,
      audioFormat,
      downloadAudio,
      quality,
      batchId,
      startTime
    });
    
  } catch (error) {
    console.error('批量下载失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process downloads with queue
async function processDownloads(videos, options) {
  const { batchId, startTime } = options;
  const downloadResults = [];
  
  broadcast({
    type: 'batch_start',
    batchId,
    total: videos.length
  });
  
  for (const video of videos) {
    const task = {
      videoId: video.id,
      execute: async () => {
        try {
          // Update status to downloading
          await database.updateVideo(video.id, { status: 'downloading' });
          
          broadcast({
            type: 'download_start',
            batchId,
            videoId: video.id,
            url: video.url
          });
          
          // Get video info first
          const videoInfo = await downloader.getVideoInfo(video.url);
          
          await database.updateVideo(video.id, {
            title: videoInfo.title,
            duration: videoInfo.duration,
            thumbnail_url: videoInfo.thumbnail,
            description: videoInfo.description
          });
          
          // Listen to progress events
          const progressHandler = (progress) => {
            if (progress.videoId === video.id) {
              broadcast({
                type: 'progress',
                batchId,
                videoId: video.id,
                progress: progress.progress,
                speed: progress.speed,
                eta: progress.eta
              });
            }
          };
          
          downloader.on('progress', progressHandler);
          
          // Download video
          const downloadResult = await downloader.downloadVideo(
            video.id,
            video.url,
            {
              videoFormat: options.videoFormat || 'mp4',
              audioFormat: options.audioFormat || 'mp3',
              downloadAudio: options.downloadAudio !== false,
              quality: options.quality || 'best'
            }
          );
          
          downloader.off('progress', progressHandler);
          
          // Update database with results
          const updatedVideo = await database.updateVideo(video.id, {
            status: 'completed',
            video_path: downloadResult.videoPath,
            video_size: downloadResult.videoSize,
            audio_path: downloadResult.audioPath,
            audio_size: downloadResult.audioSize,
            completed_at: new Date()
          });
          
          downloadResults.push(updatedVideo);
          
          broadcast({
            type: 'download_complete',
            batchId,
            videoId: video.id,
            result: updatedVideo
          });
          
        } catch (error) {
          console.error(`下载失败 (视频ID: ${video.id}):`, error);
          
          const failedVideo = await database.updateVideo(video.id, {
            status: 'failed',
            error_message: error.message,
            completed_at: new Date()
          });
          
          downloadResults.push(failedVideo);
          
          broadcast({
            type: 'download_error',
            batchId,
            videoId: video.id,
            error: error.message
          });
        }
      }
    };
    
    await downloadQueue.add(task);
  }
  
  // Wait for all downloads to complete
  await waitForQueueCompletion();
  
  const totalTime = (Date.now() - startTime) / 1000;
  
  broadcast({
    type: 'batch_complete',
    batchId,
    results: downloadResults,
    totalTime
  });
  
  // Send notifications
  try {
    await notificationAdapter.sendBatchDownloadNotification(downloadResults, totalTime);
  } catch (error) {
    console.error('发送通知失败:', error);
  }
}

// Wait for download queue to complete
function waitForQueueCompletion() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const status = downloadQueue.getStatus();
      if (status.total === 0) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000);
  });
}

// Export videos
app.post('/api/export', async (req, res) => {
  try {
    const { format, filters } = req.body;
    
    if (!format || !['html', 'pdf', 'markdown', 'png'].includes(format)) {
      return res.status(400).json({ success: false, error: '无效的导出格式' });
    }
    
    const videos = await database.getVideos(filters || {});
    
    let result;
    let contentType;
    let filename;
    
    switch (format) {
      case 'html':
        result = await exportService.exportToHTML(videos);
        contentType = 'text/html; charset=utf-8';
        filename = `videos_export_${Date.now()}.html`;
        break;
      
      case 'markdown':
        result = await exportService.exportToMarkdown(videos);
        contentType = 'text/markdown; charset=utf-8';
        filename = `videos_export_${Date.now()}.md`;
        break;
      
      case 'pdf':
        result = await exportService.exportToPDF(videos);
        contentType = 'application/pdf';
        filename = `videos_export_${Date.now()}.pdf`;
        break;
      
      case 'png':
        result = await exportService.exportToPNG(videos);
        contentType = 'image/png';
        filename = `videos_export_${Date.now()}.png`;
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(result);
    
  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get download queue status
app.get('/api/queue-status', (req, res) => {
  const status = downloadQueue.getStatus();
  const activeDownloads = downloader.getAllProgress();
  
  res.json({
    success: true,
    data: {
      ...status,
      activeDownloads
    }
  });
});

// Delete video
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const video = await database.getVideoById(id);
    
    if (!video) {
      return res.status(404).json({ success: false, error: '视频不存在' });
    }
    
    // Delete files
    if (video.video_path) {
      try {
        await fs.unlink(video.video_path);
      } catch (error) {
        console.error('删除视频文件失败:', error);
      }
    }
    
    if (video.audio_path) {
      try {
        await fs.unlink(video.audio_path);
      } catch (error) {
        console.error('删除音频文件失败:', error);
      }
    }
    
    // Delete database record
    await database.deleteVideo(id);
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   🎬 YouTube 视频批量下载器                            ║
║   服务器运行在: http://localhost:${PORT}                ║
║   最大并发下载: ${MAX_CONCURRENT}                         ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
