const express = require('express');
const router = express.Router();
const Video = require('../models/video');
const DownloadService = require('../services/download');
const ExportService = require('../utils/export');
const fs = require('fs').promises;

// 初始化服务
let downloadService;
let exportService;

function getDownloadService() {
  if (!downloadService) {
    downloadService = new DownloadService();
  }
  return downloadService;
}

function getExportService() {
  if (!exportService) {
    exportService = new ExportService();
  }
  return exportService;
}

/**
 * POST /api/videos/download
 * 批量下载视频
 */
router.post('/download', async (req, res) => {
  try {
    const { urls, videoFormat, audioFormat, downloadAudio, quality } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: '请提供视频URL列表' });
    }

    const ds = getDownloadService();

    // 异步执行批量下载
    ds.batchDownload(urls, {
      videoFormat: videoFormat || 'mp4',
      audioFormat: audioFormat || 'mp3',
      downloadAudio: downloadAudio || false,
      quality: quality || 'best'
    }).then(summary => {
      console.log('批量下载完成:', summary);
    }).catch(error => {
      console.error('批量下载失败:', error);
    });

    res.json({
      success: true,
      message: '下载任务已提交',
      count: urls.length
    });
  } catch (error) {
    console.error('提交下载任务失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/videos
 * 获取视频列表
 */
router.get('/', async (req, res) => {
  try {
    const {
      keyword,
      status,
      startDate,
      endDate,
      videoFormat,
      audioFormat,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      keyword,
      status,
      startDate,
      endDate,
      videoFormat,
      audioFormat,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const videos = await Video.findAll(filters);
    const total = await Video.count(filters);

    res.json({
      success: true,
      data: videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/videos/:id
 * 获取单个视频信息
 */
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('获取视频信息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/videos/:id
 * 删除视频记录
 */
router.delete('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }

    // 删除文件
    if (video.video_path) {
      await fs.unlink(video.video_path).catch(err => console.error('删除视频文件失败:', err));
    }
    if (video.audio_path) {
      await fs.unlink(video.audio_path).catch(err => console.error('删除音频文件失败:', err));
    }

    await Video.delete(req.params.id);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/videos/statistics
 * 获取下载统计
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Video.getStatistics();
    const ds = getDownloadService();
    const downloadStatus = ds.getDownloadStatus();

    res.json({
      success: true,
      data: {
        ...stats,
        downloadStatus
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/videos/export
 * 导出视频列表
 */
router.post('/export', async (req, res) => {
  try {
    const { format, filters } = req.body;

    if (!format) {
      return res.status(400).json({ error: '请指定导出格式' });
    }

    // 获取要导出的视频列表
    const videos = await Video.findAll(filters || {});

    if (videos.length === 0) {
      return res.status(400).json({ error: '没有可导出的数据' });
    }

    const es = getExportService();
    const result = await es.export(videos, format);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/videos/download/:id/:type
 * 下载视频或音频文件
 */
router.get('/download-file/:id/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }

    const filePath = type === 'video' ? video.video_path : video.audio_path;

    if (!filePath) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: '文件已被删除' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('下载文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
