const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const DownloadTask = require('../models/DownloadTask');
const DownloadService = require('../services/downloadService');
const ExportService = require('../services/exportService');
const path = require('path');
const fs = require('fs-extra');

// 创建下载服务实例
const downloadService = new DownloadService();
const exportService = new ExportService();

// 批量下载视频
router.post('/download/batch', async (req, res) => {
  try {
    const { urls, video_format, audio_format, download_audio, quality } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的视频URL列表'
      });
    }

    // 验证URL格式
    const invalidUrls = urls.filter(url => !isValidYouTubeUrl(url));
    if (invalidUrls.length > 0) {
      return res.status(400).json({
        success: false,
        message: `发现无效的YouTube URL: ${invalidUrls.join(', ')}`
      });
    }

    // 检查yt-dlp是否可用
    const ytDlpAvailable = await downloadService.checkYtDlp();
    if (!ytDlpAvailable) {
      return res.status(500).json({
        success: false,
        message: 'yt-dlp未安装或不可用，请先安装yt-dlp'
      });
    }

    console.log(`🚀 开始批量下载任务，共 ${urls.length} 个视频`);

    // 异步执行下载任务
    downloadService.batchDownload(urls, {
      video_format: video_format || 'mp4',
      audio_format: audio_format || 'mp3',
      download_audio: download_audio || false,
      quality: quality || 'best'
    }).then((results) => {
      // 通过WebSocket发送完成通知
      if (global.io) {
        global.io.emit('download-complete', results);
      }
    }).catch((error) => {
      console.error('批量下载失败:', error);
      // 通过WebSocket发送错误通知
      if (global.io) {
        global.io.emit('download-error', {
          message: error.message
        });
      }
    });

    res.json({
      success: true,
      message: '下载任务已启动',
      data: {
        total: urls.length,
        status: 'started'
      }
    });

  } catch (error) {
    console.error('启动下载任务失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '启动下载任务失败'
    });
  }
});

// 停止下载任务
router.post('/download/stop/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    // 这里可以实现停止下载的逻辑
    // 由于当前实现是异步的，停止功能需要更复杂的实现
    
    res.json({
      success: true,
      message: '停止请求已发送'
    });

  } catch (error) {
    console.error('停止下载失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '停止下载失败'
    });
  }
});

// 获取视频列表
router.get('/videos', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // 获取视频列表
    const videos = await Video.findAll(limitNum, offset, search, dateFrom, dateTo);
    
    // 获取总数
    const totalCount = await Video.count(search, dateFrom, dateTo);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          pageSize: limitNum
        }
      }
    });

  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取视频列表失败'
    });
  }
});

// 删除视频
router.delete('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取视频信息
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频不存在'
      });
    }

    // 删除文件
    if (video.video_file_path && fs.existsSync(video.video_file_path)) {
      await fs.remove(video.video_file_path);
    }
    if (video.audio_file_path && fs.existsSync(video.audio_file_path)) {
      await fs.remove(video.audio_file_path);
    }
    if (video.thumbnail_path && fs.existsSync(video.thumbnail_path)) {
      await fs.remove(video.thumbnail_path);
    }

    // 删除数据库记录
    await Video.delete(id);

    res.json({
      success: true,
      message: '视频已删除'
    });

  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除视频失败'
    });
  }
});

// 获取统计数据
router.get('/stats', async (req, res) => {
  try {
    const stats = await downloadService.getDownloadStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取统计数据失败'
    });
  }
});

// 文件下载
router.get('/files/download/:videoId/:type', async (req, res) => {
  try {
    const { videoId, type } = req.params;

    // 获取视频信息
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频不存在'
      });
    }

    let filePath;
    let filename;

    if (type === 'video') {
      filePath = video.video_file_path;
      filename = `${video.filename || video.title || 'video'}.${video.video_format || 'mp4'}`;
    } else if (type === 'audio') {
      filePath = video.audio_file_path;
      filename = `${video.filename || video.title || 'audio'}.${video.audio_format || 'mp3'}`;
    } else {
      return res.status(400).json({
        success: false,
        message: '无效的文件类型'
      });
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 发送文件
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '文件下载失败'
    });
  }
});

// 缩略图访问
router.get('/files/thumbnail/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const thumbnailPath = path.join(process.env.DOWNLOAD_PATH || './downloads', 'thumbnails', filename);

    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).send('缩略图不存在');
    }

    res.sendFile(path.resolve(thumbnailPath));

  } catch (error) {
    console.error('获取缩略图失败:', error);
    res.status(500).send('获取缩略图失败');
  }
});

// 数据导出
router.get('/export', async (req, res) => {
  try {
    const {
      format = 'html',
      all = 'true',
      search = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    let videos;
    if (all === 'true') {
      videos = await Video.findAll(10000, 0); // 获取所有数据
    } else {
      videos = await Video.findAll(10000, 0, search, dateFrom, dateTo);
    }

    const exportResult = await exportService.exportData(videos, format);

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.setHeader('Content-Type', exportResult.contentType);

    if (format === 'png') {
      res.send(exportResult.data);
    } else {
      res.send(exportResult.data);
    }

  } catch (error) {
    console.error('数据导出失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '数据导出失败'
    });
  }
});

// 获取下载任务列表
router.get('/tasks', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const tasks = await DownloadTask.findAll(limitNum, offset);

    res.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取任务列表失败'
    });
  }
});

// 获取单个任务详情
router.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await DownloadTask.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取任务详情失败'
    });
  }
});

// 辅助函数：验证YouTube URL
function isValidYouTubeUrl(url) {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

module.exports = router;