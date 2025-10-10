const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');
const Video = require('../models/video');
const NotificationService = require('./notification');

class DownloadService extends EventEmitter {
  constructor() {
    super();
    this.ytDlp = new YTDlpWrap();
    this.downloadPath = process.env.DOWNLOAD_PATH || './downloads';
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS) || 3;
    this.activeDownloads = new Map();
    this.downloadQueue = [];
    this.notificationService = new NotificationService();
    
    // 确保下载目录存在
    this.ensureDownloadDirectory();
  }

  async ensureDownloadDirectory() {
    try {
      await fs.mkdir(this.downloadPath, { recursive: true });
      await fs.mkdir(path.join(this.downloadPath, 'videos'), { recursive: true });
      await fs.mkdir(path.join(this.downloadPath, 'audios'), { recursive: true });
      console.log('✅ 下载目录创建成功');
    } catch (error) {
      console.error('❌ 创建下载目录失败:', error);
    }
  }

  /**
   * 获取视频信息（不下载）
   */
  async getVideoInfo(videoUrl) {
    try {
      const info = await this.ytDlp.execPromise([
        videoUrl,
        '--dump-json',
        '--no-playlist'
      ]);

      const videoInfo = JSON.parse(info);
      
      return {
        video_id: videoInfo.id,
        title: videoInfo.title,
        duration: videoInfo.duration,
        thumbnail_url: videoInfo.thumbnail,
        description: videoInfo.description,
        author: videoInfo.uploader || videoInfo.channel,
        upload_date: videoInfo.upload_date,
        view_count: videoInfo.view_count,
        like_count: videoInfo.like_count
      };
    } catch (error) {
      console.error('获取视频信息失败:', error);
      throw new Error(`无法获取视频信息: ${error.message}`);
    }
  }

  /**
   * 格式化文件名（避免中文乱码和非法字符）
   */
  sanitizeFilename(filename) {
    // 移除或替换非法字符
    let sanitized = filename.replace(/[<>:"/\\|?*]/g, '_');
    // 限制文件名长度
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200);
    }
    return sanitized;
  }

  /**
   * 下载单个视频
   */
  async downloadVideo(videoRecord, options = {}) {
    const {
      videoFormat = 'mp4',
      audioFormat = 'mp3',
      downloadAudio = false,
      quality = 'best'
    } = options;

    const downloadId = videoRecord.id;
    
    try {
      // 更新状态为下载中
      await Video.update(downloadId, {
        download_status: 'downloading',
        download_started_at: new Date(),
        download_progress: 0
      });

      // 获取视频信息
      const videoInfo = await this.getVideoInfo(videoRecord.video_url);
      
      // 更新视频信息到数据库
      await Video.update(downloadId, {
        video_id: videoInfo.video_id,
        title: videoInfo.title,
        duration: videoInfo.duration,
        thumbnail_url: videoInfo.thumbnail_url,
        description: videoInfo.description,
        author: videoInfo.author
      });

      const sanitizedTitle = this.sanitizeFilename(videoInfo.title);
      const timestamp = Date.now();
      
      let videoPaths = {};
      
      // 下载视频
      const videoFilename = `${sanitizedTitle}_${timestamp}.${videoFormat}`;
      const videoPath = path.join(this.downloadPath, 'videos', videoFilename);
      
      console.log(`⬇️ 开始下载视频: ${videoInfo.title}`);
      
      const videoArgs = [
        videoRecord.video_url,
        '-f', this.getVideoFormatString(videoFormat, quality),
        '-o', videoPath,
        '--no-playlist',
        '--encoding', 'utf-8',
        '--newline'
      ];

      await this.executeDownload(videoArgs, downloadId, 'video');
      
      const videoStats = await fs.stat(videoPath);
      videoPaths.video_path = videoPath;
      videoPaths.video_size = videoStats.size;
      videoPaths.video_format = videoFormat;
      videoPaths.filename = videoFilename;

      // 下载音频（如果需要）
      if (downloadAudio) {
        const audioFilename = `${sanitizedTitle}_${timestamp}.${audioFormat}`;
        const audioPath = path.join(this.downloadPath, 'audios', audioFilename);
        
        console.log(`⬇️ 开始下载音频: ${videoInfo.title}`);
        
        const audioArgs = [
          videoRecord.video_url,
          '-f', 'bestaudio',
          '-x',
          '--audio-format', audioFormat,
          '-o', audioPath,
          '--no-playlist',
          '--encoding', 'utf-8',
          '--newline'
        ];

        await this.executeDownload(audioArgs, downloadId, 'audio');
        
        const audioStats = await fs.stat(audioPath);
        videoPaths.audio_path = audioPath;
        videoPaths.audio_size = audioStats.size;
        videoPaths.audio_format = audioFormat;
      }

      // 更新为下载完成
      const updatedVideo = await Video.update(downloadId, {
        ...videoPaths,
        download_status: 'completed',
        download_progress: 100,
        download_completed_at: new Date()
      });

      this.emit('download:complete', updatedVideo);
      
      return updatedVideo;
    } catch (error) {
      console.error(`❌ 下载失败 (ID: ${downloadId}):`, error);
      
      await Video.update(downloadId, {
        download_status: 'failed',
        error_message: error.message
      });

      this.emit('download:error', { id: downloadId, error: error.message });
      
      throw error;
    } finally {
      this.activeDownloads.delete(downloadId);
      this.processQueue();
    }
  }

  /**
   * 执行下载命令
   */
  async executeDownload(args, videoId, type) {
    return new Promise((resolve, reject) => {
      const download = this.ytDlp.exec(args);
      
      download.stdout.on('data', (chunk) => {
        const output = chunk.toString();
        
        // 解析下载进度
        const progressMatch = output.match(/(\d+\.\d+)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          this.emit('download:progress', { id: videoId, progress, type });
          
          // 更新数据库进度（限制更新频率）
          if (progress % 10 < 1) {
            Video.update(videoId, { download_progress: Math.floor(progress) }).catch(console.error);
          }
        }
      });

      download.stderr.on('data', (chunk) => {
        console.error(`stderr: ${chunk}`);
      });

      download.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`下载失败，退出码: ${code}`));
        }
      });

      download.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 获取视频格式字符串
   */
  getVideoFormatString(format, quality) {
    const qualityMap = {
      'best': 'bestvideo[ext=' + format + ']+bestaudio/best',
      '1080p': 'bestvideo[height<=1080][ext=' + format + ']+bestaudio/best',
      '720p': 'bestvideo[height<=720][ext=' + format + ']+bestaudio/best',
      '480p': 'bestvideo[height<=480][ext=' + format + ']+bestaudio/best'
    };
    
    return qualityMap[quality] || qualityMap['best'];
  }

  /**
   * 批量下载视频（支持并发）
   */
  async batchDownload(videoUrls, options = {}) {
    const startTime = Date.now();
    const results = [];
    
    console.log(`📦 开始批量下载 ${videoUrls.length} 个视频`);
    console.log(`⚙️ 并发数: ${this.maxConcurrent}`);

    // 创建所有视频记录
    for (const url of videoUrls) {
      try {
        const videoRecord = await Video.create({
          video_url: url,
          video_format: options.videoFormat || 'mp4',
          audio_format: options.audioFormat || 'mp3'
        });
        
        this.downloadQueue.push({ record: videoRecord, options });
      } catch (error) {
        console.error(`创建视频记录失败 (${url}):`, error);
        results.push({ url, status: 'failed', error: error.message });
      }
    }

    // 开始处理队列
    this.processQueue();

    // 等待所有下载完成
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        if (this.activeDownloads.size === 0 && this.downloadQueue.length === 0) {
          clearInterval(checkInterval);
          
          const endTime = Date.now();
          const totalTime = (endTime - startTime) / 1000;
          
          // 获取所有下载结果
          const allVideos = await Video.findAll({ limit: videoUrls.length });
          
          const summary = {
            total: videoUrls.length,
            completed: allVideos.filter(v => v.download_status === 'completed').length,
            failed: allVideos.filter(v => v.download_status === 'failed').length,
            totalTime: totalTime,
            videos: allVideos
          };

          // 发送批量下载完成通知
          await this.sendBatchNotification(summary);
          
          resolve(summary);
        }
      }, 1000);
    });
  }

  /**
   * 处理下载队列
   */
  processQueue() {
    while (this.activeDownloads.size < this.maxConcurrent && this.downloadQueue.length > 0) {
      const { record, options } = this.downloadQueue.shift();
      
      this.activeDownloads.set(record.id, record);
      
      this.downloadVideo(record, options).catch(error => {
        console.error(`队列下载失败:`, error);
      });
    }
  }

  /**
   * 发送批量下载完成通知
   */
  async sendBatchNotification(summary) {
    const title = `📹 YouTube视频批量下载完成`;
    
    const content = `### 批量下载报告

**总计**: ${summary.total} 个视频
**成功**: ${summary.completed} 个
**失败**: ${summary.failed} 个
**总耗时**: ${summary.totalTime.toFixed(2)} 秒

---
**下载详情**:
${summary.videos.slice(0, 10).map((v, idx) => {
  const status = v.download_status === 'completed' ? '✅' : '❌';
  const size = this.notificationService.formatFileSize(v.video_size || 0);
  return `${idx + 1}. ${status} ${v.title || v.filename || '未知'} - ${size}`;
}).join('\n')}
${summary.videos.length > 10 ? `\n... 还有 ${summary.videos.length - 10} 个视频` : ''}

---
*由YouTube下载管理器自动发送*`;

    try {
      await this.notificationService.sendNotifications(title, content, content.replace(/\n/g, '<br>'));
      console.log('✅ 批量下载通知发送成功');
    } catch (error) {
      console.error('❌ 发送通知失败:', error);
    }
  }

  /**
   * 获取当前下载状态
   */
  getDownloadStatus() {
    return {
      active: this.activeDownloads.size,
      queued: this.downloadQueue.length,
      maxConcurrent: this.maxConcurrent,
      activeDownloads: Array.from(this.activeDownloads.values())
    };
  }
}

module.exports = DownloadService;
