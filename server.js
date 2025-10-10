// Main Express server for YouTube Batch Downloader
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./db/database');
const WebSocketHandler = require('./services/websocket');
const DownloaderService = require('./services/downloader');
const NotificationService = require('./services/notification');
const ExporterService = require('./services/exporter');

const app = express();
const server = http.createServer(app);

// Initialize services
const wsHandler = new WebSocketHandler(server);
const downloaderService = new DownloaderService(wsHandler);
const notificationService = new NotificationService();
const exporterService = new ExporterService();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==================== API Routes ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start batch download
app.post('/api/download/batch', async (req, res) => {
  try {
    const { urls, videoFormat, audioFormat, downloadAudio } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    if (!videoFormat) {
      return res.status(400).json({ error: 'Video format is required' });
    }

    // Validate URLs
    const validUrls = urls.filter(url => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'No valid YouTube URLs provided' });
    }

    // Start download process (non-blocking)
    res.json({ 
      message: 'Download started',
      totalVideos: validUrls.length
    });

    // Run download in background
    (async () => {
      const result = await downloaderService.batchDownload(
        validUrls,
        videoFormat,
        audioFormat,
        downloadAudio
      );

      // Get all videos from database for notification
      const videosResult = await db.query(
        'SELECT * FROM videos WHERE id = ANY($1)',
        [result.results.map(r => r.videoId)]
      );

      const videos = videosResult.rows;

      // Send notification
      await notificationService.sendBatchDownloadNotification(videos, parseFloat(result.totalTime));

      wsHandler.broadcast({
        type: 'batch_complete',
        totalTime: result.totalTime,
        successCount: result.successCount,
        failedCount: result.failedCount
      });
    })();

  } catch (error) {
    console.error('Batch download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all videos
app.get('/api/videos', async (req, res) => {
  try {
    const { search, dateFrom, dateTo, status } = req.query;

    let query = 'SELECT * FROM videos WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Add search filter
    if (search) {
      query += ` AND (title ILIKE $${paramCount} OR filename ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Add date range filter
    if (dateFrom) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(dateTo);
      paramCount++;
    }

    // Add status filter
    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      videos: result.rows
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single video
app.get('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM videos WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      success: true,
      video: result.rows[0]
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete video
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get video info first
    const videoResult = await db.query('SELECT * FROM videos WHERE id = $1', [id]);
    
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];

    // Delete files
    if (video.video_path && fs.existsSync(video.video_path)) {
      fs.unlinkSync(video.video_path);
    }
    if (video.audio_path && fs.existsSync(video.audio_path)) {
      fs.unlinkSync(video.audio_path);
    }

    // Delete from database
    await db.query('DELETE FROM videos WHERE id = $1', [id]);

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export videos
app.post('/api/export', async (req, res) => {
  try {
    const { format, videoIds } = req.body;

    if (!format || !['html', 'pdf', 'markdown', 'png', 'excel'].includes(format)) {
      return res.status(400).json({ error: 'Invalid export format' });
    }

    // Get videos to export
    let query = 'SELECT * FROM videos';
    let params = [];

    if (videoIds && Array.isArray(videoIds) && videoIds.length > 0) {
      query += ' WHERE id = ANY($1)';
      params = [videoIds];
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    const videos = result.rows;

    if (videos.length === 0) {
      return res.status(404).json({ error: 'No videos to export' });
    }

    let exportResult;

    switch (format) {
      case 'html':
        exportResult = await exporterService.exportHTML(videos);
        break;
      case 'pdf':
        exportResult = await exporterService.exportPDF(videos);
        break;
      case 'markdown':
        exportResult = await exporterService.exportMarkdown(videos);
        break;
      case 'png':
        exportResult = await exporterService.exportPNG(videos);
        break;
      case 'excel':
        exportResult = await exporterService.exportExcel(videos);
        break;
    }

    res.json({
      success: true,
      ...exportResult
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get download statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalResult = await db.query('SELECT COUNT(*) as count FROM videos');
    const completedResult = await db.query("SELECT COUNT(*) as count FROM videos WHERE status = 'completed'");
    const failedResult = await db.query("SELECT COUNT(*) as count FROM videos WHERE status = 'failed'");
    const downloadingResult = await db.query("SELECT COUNT(*) as count FROM videos WHERE status = 'downloading'");
    
    const sizeResult = await db.query(`
      SELECT 
        COALESCE(SUM(video_size), 0) as total_video_size,
        COALESCE(SUM(audio_size), 0) as total_audio_size
      FROM videos 
      WHERE status = 'completed'
    `);

    res.json({
      success: true,
      stats: {
        total: parseInt(totalResult.rows[0].count),
        completed: parseInt(completedResult.rows[0].count),
        failed: parseInt(failedResult.rows[0].count),
        downloading: parseInt(downloadingResult.rows[0].count),
        totalVideoSize: parseInt(sizeResult.rows[0].total_video_size),
        totalAudioSize: parseInt(sizeResult.rows[0].total_audio_size)
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎥 YouTube Batch Downloader & Manager                  ║
║                                                           ║
║   Server is running on:                                  ║
║   📍 http://localhost:${PORT}                           ║
║                                                           ║
║   WebSocket endpoint:                                    ║
║   🔌 ws://localhost:${PORT}                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
