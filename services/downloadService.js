const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const Video = require('../models/Video');
const DownloadTask = require('../models/DownloadTask');
const NotificationService = require('../notification');

class DownloadService {
  constructor() {
    this.downloadPath = process.env.DOWNLOAD_PATH || './downloads';
    this.maxConcurrentDownloads = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS) || 3;
    this.activeDownloads = new Map(); // 跟踪活跃的下载任务
    this.downloadQueue = []; // 下载队列
    this.notificationService = new NotificationService();
    
    // 确保下载目录存在
    fs.ensureDirSync(this.downloadPath);
    fs.ensureDirSync(path.join(this.downloadPath, 'videos'));
    fs.ensureDirSync(path.join(this.downloadPath, 'audio'));
    fs.ensureDirSync(path.join(this.downloadPath, 'thumbnails'));
  }

  // 检查yt-dlp是否可用
  async checkYtDlp() {
    return new Promise((resolve) => {
      const ytdlp = spawn('yt-dlp', ['--version']);
      
      ytdlp.on('close', (code) => {
        resolve(code === 0);
      });
      
      ytdlp.on('error', () => {
        resolve(false);
      });
    });
  }

  // 获取视频信息
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-download',
        url
      ];

      const ytdlp = spawn('yt-dlp', args);
      let output = '';
      let error = '';

      ytdlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        error += data.toString();
      });

      ytdlp.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve({
              title: info.title || 'Unknown Title',
              duration: info.duration || 0,
              uploader: info.uploader || 'Unknown',
              upload_date: info.upload_date ? new Date(info.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : null,
              view_count: info.view_count || 0,
              like_count: info.like_count || 0,
              description: info.description || '',
              thumbnail: info.thumbnail || null
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse video info: ${parseError.message}`));
          }
        } else {
          reject(new Error(`yt-dlp failed: ${error}`));
        }
      });

      ytdlp.on('error', (err) => {
        reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
      });
    });
  }

  // 下载单个视频
  async downloadVideo(videoRecord, options = {}) {
    const {
      video_format = 'mp4',
      audio_format = null,
      download_audio = false,
      quality = 'best'
    } = options;

    return new Promise(async (resolve, reject) => {
      try {
        // 更新状态为下载中
        await Video.updateStatus(videoRecord.id, 'downloading');

        const videoDir = path.join(this.downloadPath, 'videos');
        const audioDir = path.join(this.downloadPath, 'audio');
        const thumbnailDir = path.join(this.downloadPath, 'thumbnails');

        // 生成安全的文件名
        const safeTitle = this.sanitizeFilename(videoRecord.title || 'video');
        const timestamp = Date.now();
        
        const videoFilename = `${safeTitle}_${timestamp}.${video_format}`;
        const audioFilename = download_audio ? `${safeTitle}_${timestamp}.${audio_format || 'mp3'}` : null;
        const thumbnailFilename = `${safeTitle}_${timestamp}.jpg`;

        const videoPath = path.join(videoDir, videoFilename);
        const audioPath = audioFilename ? path.join(audioDir, audioFilename) : null;
        const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

        // 构建yt-dlp命令参数
        const args = [
          '--format', this.getFormatString(quality, video_format),
          '--output', videoPath,
          '--write-thumbnail',
          '--write-info-json',
          '--no-playlist',
          videoRecord.url
        ];

        // 如果需要下载音频
        if (download_audio && audioPath) {
          args.push('--extract-audio');
          args.push('--audio-format', audio_format || 'mp3');
          args.push('--audio-quality', '0'); // 最佳音质
        }

        console.log(`🎬 开始下载视频: ${videoRecord.title}`);
        console.log(`📁 视频路径: ${videoPath}`);
        if (audioPath) console.log(`🎵 音频路径: ${audioPath}`);

        const ytdlp = spawn('yt-dlp', args);
        let progressData = '';

        ytdlp.stdout.on('data', (data) => {
          const output = data.toString();
          progressData += output;
          
          // 解析进度信息
          const progressMatch = output.match(/(\d+\.?\d*)%/);
          if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            // 可以在这里发送进度更新到WebSocket
            this.emitProgress(videoRecord.id, progress);
          }
        });

        ytdlp.stderr.on('data', (data) => {
          console.log(`yt-dlp stderr: ${data}`);
        });

        ytdlp.on('close', async (code) => {
          if (code === 0) {
            try {
              // 获取文件大小
              const videoStats = fs.existsSync(videoPath) ? fs.statSync(videoPath) : null;
              const audioStats = audioPath && fs.existsSync(audioPath) ? fs.statSync(audioPath) : null;

              // 移动缩略图到正确位置
              const tempThumbnailPath = videoPath.replace(`.${video_format}`, '.jpg');
              if (fs.existsSync(tempThumbnailPath)) {
                fs.moveSync(tempThumbnailPath, thumbnailPath);
              }

              // 更新数据库记录
              await Video.updateFileInfo(videoRecord.id, {
                video_file_size: videoStats ? videoStats.size : null,
                audio_file_size: audioStats ? audioStats.size : null,
                video_file_path: videoPath,
                audio_file_path: audioPath,
                thumbnail_path: fs.existsSync(thumbnailPath) ? thumbnailPath : null
              });

              await Video.updateStatus(videoRecord.id, 'completed');

              console.log(`✅ 视频下载完成: ${videoRecord.title}`);
              resolve({
                success: true,
                videoPath,
                audioPath,
                thumbnailPath: fs.existsSync(thumbnailPath) ? thumbnailPath : null,
                videoSize: videoStats ? videoStats.size : 0,
                audioSize: audioStats ? audioStats.size : 0
              });

            } catch (error) {
              console.error(`❌ 处理下载结果时出错: ${error.message}`);
              await Video.updateStatus(videoRecord.id, 'failed', error.message);
              reject(error);
            }
          } else {
            const errorMsg = `yt-dlp exited with code ${code}`;
            console.error(`❌ 下载失败: ${errorMsg}`);
            await Video.updateStatus(videoRecord.id, 'failed', errorMsg);
            reject(new Error(errorMsg));
          }
        });

        ytdlp.on('error', async (error) => {
          console.error(`❌ yt-dlp进程错误: ${error.message}`);
          await Video.updateStatus(videoRecord.id, 'failed', error.message);
          reject(error);
        });

      } catch (error) {
        console.error(`❌ 下载视频时出错: ${error.message}`);
        await Video.updateStatus(videoRecord.id, 'failed', error.message);
        reject(error);
      }
    });
  }

  // 批量下载视频
  async batchDownload(urls, options = {}) {
    const {
      video_format = 'mp4',
      audio_format = null,
      download_audio = false,
      quality = 'best'
    } = options;

    console.log(`🚀 开始批量下载 ${urls.length} 个视频`);
    
    // 创建下载任务记录
    const task = await DownloadTask.create({
      video_urls: urls,
      video_format,
      audio_format,
      download_audio,
      quality
    });

    await DownloadTask.updateStatus(task.id, 'running');

    const results = {
      taskId: task.id,
      batchId: task.batch_id,
      total: urls.length,
      completed: 0,
      failed: 0,
      videos: [],
      startTime: Date.now()
    };

    try {
      // 为每个URL创建视频记录
      const videoRecords = [];
      for (const url of urls) {
        try {
          // 检查是否已存在
          let existingVideo = await Video.findByUrl(url);
          if (existingVideo) {
            console.log(`⚠️ 视频已存在，跳过: ${url}`);
            results.completed++;
            results.videos.push(existingVideo);
            continue;
          }

          // 获取视频信息
          const videoInfo = await this.getVideoInfo(url);
          
          // 创建视频记录
          const videoRecord = await Video.create({
            url,
            title: videoInfo.title,
            filename: this.sanitizeFilename(videoInfo.title),
            video_format,
            audio_format: download_audio ? audio_format : null,
            duration: videoInfo.duration,
            description: videoInfo.description,
            uploader: videoInfo.uploader,
            upload_date: videoInfo.upload_date,
            view_count: videoInfo.view_count,
            like_count: videoInfo.like_count
          });

          videoRecords.push(videoRecord);
        } catch (error) {
          console.error(`❌ 获取视频信息失败 ${url}: ${error.message}`);
          results.failed++;
        }
      }

      // 并发下载视频
      const downloadPromises = [];
      const semaphore = new Array(this.maxConcurrentDownloads).fill(null);
      
      for (const videoRecord of videoRecords) {
        const downloadPromise = this.downloadWithSemaphore(
          semaphore,
          videoRecord,
          { video_format, audio_format, download_audio, quality }
        ).then((result) => {
          results.completed++;
          results.videos.push({ ...videoRecord, downloadResult: result });
          
          // 更新任务进度
          DownloadTask.updateProgress(task.id, results.completed, results.failed);
          
          return result;
        }).catch((error) => {
          results.failed++;
          results.videos.push({ ...videoRecord, error: error.message });
          
          // 更新任务进度
          DownloadTask.updateProgress(task.id, results.completed, results.failed);
          
          return { success: false, error: error.message };
        });

        downloadPromises.push(downloadPromise);
      }

      // 等待所有下载完成
      await Promise.all(downloadPromises);

      // 更新任务状态
      await DownloadTask.updateStatus(task.id, 'completed');

      results.endTime = Date.now();
      results.duration = (results.endTime - results.startTime) / 1000; // 秒

      console.log(`🎉 批量下载完成! 成功: ${results.completed}, 失败: ${results.failed}, 耗时: ${results.duration.toFixed(2)}秒`);

      // 发送通知
      await this.sendDownloadNotification(results);

      return results;

    } catch (error) {
      console.error(`❌ 批量下载失败: ${error.message}`);
      await DownloadTask.updateStatus(task.id, 'failed');
      throw error;
    }
  }

  // 使用信号量控制并发下载
  async downloadWithSemaphore(semaphore, videoRecord, options) {
    // 等待获取信号量
    await this.acquireSemaphore(semaphore);
    
    try {
      return await this.downloadVideo(videoRecord, options);
    } finally {
      // 释放信号量
      this.releaseSemaphore(semaphore);
    }
  }

  // 获取信号量
  async acquireSemaphore(semaphore) {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        const index = semaphore.findIndex(slot => slot === null);
        if (index !== -1) {
          semaphore[index] = true;
          resolve();
        } else {
          setTimeout(tryAcquire, 100); // 100ms后重试
        }
      };
      tryAcquire();
    });
  }

  // 释放信号量
  releaseSemaphore(semaphore) {
    const index = semaphore.findIndex(slot => slot === true);
    if (index !== -1) {
      semaphore[index] = null;
    }
  }

  // 生成格式字符串
  getFormatString(quality, format) {
    switch (quality) {
      case 'best':
        return `best[ext=${format}]/best`;
      case 'worst':
        return `worst[ext=${format}]/worst`;
      case '720p':
        return `best[height<=720][ext=${format}]/best[height<=720]`;
      case '1080p':
        return `best[height<=1080][ext=${format}]/best[height<=1080]`;
      case '4k':
        return `best[height<=2160][ext=${format}]/best[height<=2160]`;
      default:
        return `best[ext=${format}]/best`;
    }
  }

  // 清理文件名
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100); // 限制长度
  }

  // 发送进度更新（WebSocket）
  emitProgress(videoId, progress) {
    // 这里会在WebSocket实现时连接
    if (global.io) {
      global.io.emit('download-progress', {
        videoId,
        progress
      });
    }
  }

  // 发送下载完成通知
  async sendDownloadNotification(results) {
    try {
      const title = `🎬 YouTube视频批量下载完成`;
      
      const successVideos = results.videos.filter(v => !v.error);
      const failedVideos = results.videos.filter(v => v.error);
      
      let content = `### 批量下载报告

**总计视频**: ${results.total}
**成功下载**: ${results.completed}
**下载失败**: ${results.failed}
**总耗时**: ${results.duration.toFixed(2)} 秒

---
**成功下载的视频**:`;

      successVideos.slice(0, 10).forEach((video, idx) => {
        const size = video.downloadResult ? 
          this.formatFileSize(video.downloadResult.videoSize + (video.downloadResult.audioSize || 0)) : 
          'N/A';
        content += `\n${idx + 1}. ${video.title} (${size})`;
      });

      if (successVideos.length > 10) {
        content += `\n... 还有 ${successVideos.length - 10} 个视频`;
      }

      if (failedVideos.length > 0) {
        content += `\n\n**失败的视频**:`;
        failedVideos.slice(0, 5).forEach((video, idx) => {
          content += `\n${idx + 1}. ${video.title} - ${video.error}`;
        });
        if (failedVideos.length > 5) {
          content += `\n... 还有 ${failedVideos.length - 5} 个失败`;
        }
      }

      content += `\n\n---\n*由YouTube批量下载器自动发送*`;

      await this.notificationService.sendAll(title, content);
      
    } catch (error) {
      console.error('发送下载通知失败:', error);
    }
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // 获取下载统计
  async getDownloadStats() {
    try {
      const stats = await Video.getStats();
      return {
        totalVideos: parseInt(stats.total_videos) || 0,
        completedVideos: parseInt(stats.completed_videos) || 0,
        failedVideos: parseInt(stats.failed_videos) || 0,
        downloadingVideos: parseInt(stats.downloading_videos) || 0,
        totalVideoSize: parseInt(stats.total_video_size) || 0,
        totalAudioSize: parseInt(stats.total_audio_size) || 0,
        avgDuration: parseFloat(stats.avg_duration) || 0
      };
    } catch (error) {
      console.error('获取下载统计失败:', error);
      return {
        totalVideos: 0,
        completedVideos: 0,
        failedVideos: 0,
        downloadingVideos: 0,
        totalVideoSize: 0,
        totalAudioSize: 0,
        avgDuration: 0
      };
    }
  }
}

module.exports = DownloadService;