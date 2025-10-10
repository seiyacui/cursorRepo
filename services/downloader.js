const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class Downloader extends EventEmitter {
  constructor() {
    super();
    this.downloadDir = process.env.DOWNLOAD_DIR || './downloads';
    this.activeDownloads = new Map();
  }
  
  async ensureDownloadDir() {
    try {
      await fs.mkdir(this.downloadDir, { recursive: true });
      await fs.mkdir(path.join(this.downloadDir, 'videos'), { recursive: true });
      await fs.mkdir(path.join(this.downloadDir, 'audio'), { recursive: true });
    } catch (error) {
      console.error('创建下载目录失败:', error);
    }
  }
  
  // Get video info without downloading
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-playlist',
        url
      ];
      
      const ytDlp = spawn('yt-dlp', args);
      let jsonData = '';
      let errorData = '';
      
      ytDlp.stdout.on('data', (data) => {
        jsonData += data.toString();
      });
      
      ytDlp.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      ytDlp.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(jsonData);
            resolve({
              title: info.title,
              duration: info.duration,
              thumbnail: info.thumbnail,
              description: info.description,
              formats: info.formats
            });
          } catch (error) {
            reject(new Error('解析视频信息失败: ' + error.message));
          }
        } else {
          reject(new Error('获取视频信息失败: ' + errorData));
        }
      });
    });
  }
  
  // Download video
  async downloadVideo(videoId, url, options = {}) {
    await this.ensureDownloadDir();
    
    const {
      videoFormat = 'mp4',
      audioFormat = 'mp3',
      downloadAudio = true,
      quality = 'best'
    } = options;
    
    return new Promise((resolve, reject) => {
      const videoOutputTemplate = path.join(
        this.downloadDir,
        'videos',
        `video_${videoId}_%(title)s.%(ext)s`
      );
      
      const args = [
        '--newline',
        '--progress',
        '--no-playlist',
        '-o', videoOutputTemplate
      ];
      
      // Video format selection
      if (quality === 'best') {
        args.push('-f', `bestvideo[ext=${videoFormat}]+bestaudio/best[ext=${videoFormat}]/best`);
      } else {
        args.push('-f', `bestvideo[ext=${videoFormat}]+bestaudio/bestaudio`);
      }
      
      // Merge format
      args.push('--merge-output-format', videoFormat);
      
      // Add URL
      args.push(url);
      
      const ytDlp = spawn('yt-dlp', args);
      
      let downloadedFile = null;
      let errorOutput = '';
      
      const downloadInfo = {
        videoId,
        url,
        startTime: Date.now(),
        progress: 0,
        speed: 0,
        eta: 0
      };
      
      this.activeDownloads.set(videoId, downloadInfo);
      
      ytDlp.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Parse progress
        const progressMatch = output.match(/(\d+\.?\d*)%/);
        const speedMatch = output.match(/(\d+\.?\d*\w+\/s)/);
        const etaMatch = output.match(/ETA (\d+:\d+)/);
        
        if (progressMatch) {
          downloadInfo.progress = parseFloat(progressMatch[1]);
        }
        if (speedMatch) {
          downloadInfo.speed = speedMatch[1];
        }
        if (etaMatch) {
          downloadInfo.eta = etaMatch[1];
        }
        
        // Emit progress event
        this.emit('progress', {
          videoId,
          progress: downloadInfo.progress,
          speed: downloadInfo.speed,
          eta: downloadInfo.eta
        });
        
        // Check for downloaded file path
        const mergeMatch = output.match(/\[Merger\] Merging formats into "(.+)"/);
        const destinationMatch = output.match(/\[download\] Destination: (.+)/);
        
        if (mergeMatch) {
          downloadedFile = mergeMatch[1];
        } else if (destinationMatch && !downloadedFile) {
          downloadedFile = destinationMatch[1];
        }
      });
      
      ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ytDlp.on('close', async (code) => {
        this.activeDownloads.delete(videoId);
        
        if (code === 0) {
          const result = {
            videoPath: downloadedFile,
            videoSize: 0,
            audioPath: null,
            audioSize: 0
          };
          
          // Get video file size
          if (downloadedFile) {
            try {
              const stats = await fs.stat(downloadedFile);
              result.videoSize = stats.size;
            } catch (error) {
              console.error('获取视频文件大小失败:', error);
            }
          }
          
          // Download audio if requested
          if (downloadAudio) {
            try {
              const audioResult = await this.downloadAudioOnly(videoId, url, audioFormat);
              result.audioPath = audioResult.audioPath;
              result.audioSize = audioResult.audioSize;
            } catch (error) {
              console.error('下载音频失败:', error);
              // Continue without audio
            }
          }
          
          resolve(result);
        } else {
          reject(new Error(`下载失败 (退出码 ${code}): ${errorOutput}`));
        }
      });
    });
  }
  
  // Download audio only
  async downloadAudioOnly(videoId, url, audioFormat = 'mp3') {
    return new Promise((resolve, reject) => {
      const audioOutputTemplate = path.join(
        this.downloadDir,
        'audio',
        `audio_${videoId}_%(title)s.%(ext)s`
      );
      
      const args = [
        '--newline',
        '--extract-audio',
        '--audio-format', audioFormat,
        '--audio-quality', '0', // Best quality
        '-o', audioOutputTemplate,
        url
      ];
      
      const ytDlp = spawn('yt-dlp', args);
      
      let downloadedFile = null;
      let errorOutput = '';
      
      ytDlp.stdout.on('data', (data) => {
        const output = data.toString();
        
        const destinationMatch = output.match(/\[download\] Destination: (.+)/);
        const extractMatch = output.match(/\[ExtractAudio\] Destination: (.+)/);
        
        if (extractMatch) {
          downloadedFile = extractMatch[1];
        } else if (destinationMatch) {
          downloadedFile = destinationMatch[1].replace(/\.\w+$/, `.${audioFormat}`);
        }
      });
      
      ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ytDlp.on('close', async (code) => {
        if (code === 0) {
          let audioSize = 0;
          
          if (downloadedFile) {
            try {
              const stats = await fs.stat(downloadedFile);
              audioSize = stats.size;
            } catch (error) {
              console.error('获取音频文件大小失败:', error);
            }
          }
          
          resolve({
            audioPath: downloadedFile,
            audioSize
          });
        } else {
          reject(new Error(`音频下载失败 (退出码 ${code}): ${errorOutput}`));
        }
      });
    });
  }
  
  // Get current download progress
  getProgress(videoId) {
    return this.activeDownloads.get(videoId);
  }
  
  // Get all active downloads
  getAllProgress() {
    return Array.from(this.activeDownloads.values());
  }
}

module.exports = new Downloader();
