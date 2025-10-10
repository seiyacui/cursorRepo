// YouTube Video Downloader Service using yt-dlp
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const db = require('../db/database');

const execAsync = promisify(exec);

class VideoDownloader {
  constructor(wsServer = null) {
    this.downloadPath = process.env.DOWNLOAD_PATH || './downloads';
    this.ytDlpPath = process.env.YT_DLP_PATH || 'yt-dlp';
    this.concurrentDownloads = parseInt(process.env.CONCURRENT_DOWNLOADS) || 3;
    this.activeDownloads = new Map(); // videoId -> downloadProcess
    this.downloadQueue = [];
    this.wsServer = wsServer;
    
    // 确保下载目录存在
    this.ensureDownloadDirectory();
  }

  // 确保下载目录存在
  ensureDownloadDirectory() {
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
      console.log(`📁 创建下载目录: ${this.downloadPath}`);
    }
  }

  // 检查 yt-dlp 是否安装
  async checkYtDlp() {
    try {
      const { stdout } = await execAsync(`${this.ytDlpPath} --version`);
      console.log(`✅ yt-dlp 版本: ${stdout.trim()}`);
      return true;
    } catch (error) {
      console.error('❌ yt-dlp 未安装或不在 PATH 中');
      console.error('请运行: brew install yt-dlp (macOS) 或访问 https://github.com/yt-dlp/yt-dlp');
      return false;
    }
  }

  // 获取视频信息（不下载）
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-playlist',
        url
      ];

      const process = spawn(this.ytDlpPath, args);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve({
              video_id: info.id,
              title: info.title,
              duration: info.duration,
              thumbnail: info.thumbnail,
              formats: info.formats,
              description: info.description
            });
          } catch (error) {
            reject(new Error('解析视频信息失败: ' + error.message));
          }
        } else {
          reject(new Error(`获取视频信息失败: ${errorOutput}`));
        }
      });
    });
  }

  // 下载单个视频
  async downloadVideo(videoId, options = {}) {
    const video = await db.videos.getById(videoId);
    if (!video) {
      throw new Error('视频记录不存在');
    }

    const {
      videoFormat = 'mp4',
      audioFormat = null,
      downloadAudio = false,
      quality = 'best'
    } = options;

    // 设置输出文件名模板
    const outputTemplate = path.join(
      this.downloadPath,
      `${video.video_id}_${Date.now()}.%(ext)s`
    );

    // 构建 yt-dlp 命令参数
    const args = this.buildYtDlpArgs(video.video_url, outputTemplate, {
      videoFormat,
      audioFormat,
      downloadAudio,
      quality
    });

    return new Promise((resolve, reject) => {
      const downloadProcess = spawn(this.ytDlpPath, args);
      this.activeDownloads.set(videoId, downloadProcess);

      let downloadStartTime = Date.now();
      let lastProgress = 0;

      // 更新状态为下载中
      db.videos.updateStatus(videoId, 'downloading', 0);
      this.broadcastProgress(videoId, {
        status: 'downloading',
        progress: 0,
        speed: '0 KB/s',
        eta: 'calculating...'
      });

      downloadProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);

        // 解析进度信息
        const progressMatch = output.match(/(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          if (progress > lastProgress) {
            lastProgress = progress;
            db.videos.updateStatus(videoId, 'downloading', Math.floor(progress));
            
            // 提取下载速度和ETA
            const speedMatch = output.match(/(\d+\.?\d*\s*[KMG]iB\/s)/);
            const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
            
            this.broadcastProgress(videoId, {
              status: 'downloading',
              progress: Math.floor(progress),
              speed: speedMatch ? speedMatch[1] : 'N/A',
              eta: etaMatch ? etaMatch[1] : 'N/A',
              elapsed: Math.floor((Date.now() - downloadStartTime) / 1000)
            });
          }
        }
      });

      downloadProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error('下载错误输出:', errorOutput);
      });

      downloadProcess.on('close', async (code) => {
        this.activeDownloads.delete(videoId);
        const totalTime = Math.floor((Date.now() - downloadStartTime) / 1000);

        if (code === 0) {
          // 下载成功，查找下载的文件
          try {
            const files = await this.findDownloadedFiles(this.downloadPath, video.video_id);
            
            const updateData = {
              download_status: 'completed',
              download_progress: 100,
              video_path: files.videoPath,
              audio_path: files.audioPath,
              video_file_size: files.videoSize,
              audio_file_size: files.audioSize,
              download_completed_at: new Date()
            };

            await db.videos.update(videoId, updateData);
            
            this.broadcastProgress(videoId, {
              status: 'completed',
              progress: 100,
              elapsed: totalTime,
              videoPath: files.videoPath,
              audioPath: files.audioPath
            });

            resolve({
              success: true,
              video: await db.videos.getById(videoId),
              totalTime
            });
          } catch (error) {
            console.error('处理下载文件失败:', error);
            await db.videos.update(videoId, {
              download_status: 'failed',
              error_message: error.message
            });
            reject(error);
          }
        } else {
          // 下载失败
          const errorMessage = `下载失败，退出代码: ${code}`;
          await db.videos.update(videoId, {
            download_status: 'failed',
            error_message: errorMessage
          });
          
          this.broadcastProgress(videoId, {
            status: 'failed',
            error: errorMessage,
            elapsed: totalTime
          });

          reject(new Error(errorMessage));
        }
      });
    });
  }

  // 构建 yt-dlp 命令参数
  buildYtDlpArgs(url, outputTemplate, options) {
    const { videoFormat, audioFormat, downloadAudio, quality } = options;
    const args = [
      '--no-playlist',
      '--progress',
      '--newline', // 每次进度更新输出新行
      '-o', outputTemplate
    ];

    // 格式选择
    if (quality === 'best') {
      if (downloadAudio && audioFormat) {
        // 下载视频和音频
        args.push('-f', `bestvideo[ext=${videoFormat}]+bestaudio/best[ext=${videoFormat}]`);
        // 单独下载音频
        args.push('--extract-audio');
        args.push('--audio-format', audioFormat);
        args.push('--keep-video'); // 保留视频文件
      } else if (downloadAudio) {
        // 只下载音频
        args.push('--extract-audio');
        if (audioFormat) {
          args.push('--audio-format', audioFormat);
        }
      } else {
        // 只下载视频
        args.push('-f', `bestvideo[ext=${videoFormat}]+bestaudio/best[ext=${videoFormat}]`);
      }
    } else {
      // 自定义格式
      args.push('-f', quality);
    }

    // 合并格式
    args.push('--merge-output-format', videoFormat);

    // 添加 URL
    args.push(url);

    return args;
  }

  // 查找下载的文件
  async findDownloadedFiles(directory, videoId) {
    return new Promise((resolve, reject) => {
      fs.readdir(directory, (err, files) => {
        if (err) {
          return reject(err);
        }

        const videoFiles = files.filter(f => f.startsWith(videoId));
        
        let videoPath = null;
        let audioPath = null;
        let videoSize = 0;
        let audioSize = 0;

        videoFiles.forEach(file => {
          const fullPath = path.join(directory, file);
          const stats = fs.statSync(fullPath);
          
          if (file.match(/\.(mp4|mkv|webm)$/i)) {
            videoPath = fullPath;
            videoSize = stats.size;
          } else if (file.match(/\.(mp3|aac|wav|m4a)$/i)) {
            audioPath = fullPath;
            audioSize = stats.size;
          }
        });

        resolve({ videoPath, audioPath, videoSize, audioSize });
      });
    });
  }

  // 批量下载视频（支持并发）
  async downloadBatch(videoIds, options = {}) {
    const batchName = options.batchName || `批次_${Date.now()}`;
    const batch = await db.batches.create(batchName, videoIds.length);

    // 关联视频到批次
    for (const videoId of videoIds) {
      await db.batches.addVideo(batch.id, videoId);
    }

    const results = [];
    const downloading = [];
    let completed = 0;
    let failed = 0;

    // 并发下载控制
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];

      // 等待有下载槽位可用
      while (downloading.length >= this.concurrentDownloads) {
        await Promise.race(downloading);
      }

      // 开始下载
      const downloadPromise = this.downloadVideo(videoId, options)
        .then(result => {
          completed++;
          results.push({ videoId, success: true, result });
          // 从下载队列中移除
          const index = downloading.indexOf(downloadPromise);
          if (index > -1) downloading.splice(index, 1);
          
          // 更新批次进度
          this.broadcastBatchProgress(batch.id, {
            total: videoIds.length,
            completed,
            failed,
            progress: Math.floor((completed + failed) / videoIds.length * 100)
          });
        })
        .catch(error => {
          failed++;
          results.push({ videoId, success: false, error: error.message });
          // 从下载队列中移除
          const index = downloading.indexOf(downloadPromise);
          if (index > -1) downloading.splice(index, 1);
          
          // 更新批次进度
          this.broadcastBatchProgress(batch.id, {
            total: videoIds.length,
            completed,
            failed,
            progress: Math.floor((completed + failed) / videoIds.length * 100)
          });
        });

      downloading.push(downloadPromise);
    }

    // 等待所有下载完成
    await Promise.allSettled(downloading);

    // 更新批次状态
    await db.batches.updateStatus(batch.id, 'completed', completed, failed);

    return {
      batchId: batch.id,
      total: videoIds.length,
      completed,
      failed,
      results
    };
  }

  // WebSocket 广播进度
  broadcastProgress(videoId, progressData) {
    if (this.wsServer) {
      this.wsServer.broadcast({
        type: 'download_progress',
        videoId,
        data: progressData
      });
    }
  }

  // WebSocket 广播批次进度
  broadcastBatchProgress(batchId, progressData) {
    if (this.wsServer) {
      this.wsServer.broadcast({
        type: 'batch_progress',
        batchId,
        data: progressData
      });
    }
  }

  // 取消下载
  async cancelDownload(videoId) {
    const process = this.activeDownloads.get(videoId);
    if (process) {
      process.kill('SIGTERM');
      this.activeDownloads.delete(videoId);
      
      await db.videos.update(videoId, {
        download_status: 'failed',
        error_message: '用户取消下载'
      });
      
      return true;
    }
    return false;
  }

  // 清理下载的文件
  async cleanupDownloadedFiles(videoId) {
    try {
      const video = await db.videos.getById(videoId);
      if (!video) return false;

      if (video.video_path && fs.existsSync(video.video_path)) {
        fs.unlinkSync(video.video_path);
        console.log(`🗑️  删除视频文件: ${video.video_path}`);
      }

      if (video.audio_path && fs.existsSync(video.audio_path)) {
        fs.unlinkSync(video.audio_path);
        console.log(`🗑️  删除音频文件: ${video.audio_path}`);
      }

      return true;
    } catch (error) {
      console.error('清理文件失败:', error);
      return false;
    }
  }
}

module.exports = VideoDownloader;
