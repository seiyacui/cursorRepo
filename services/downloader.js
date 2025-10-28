// YouTube video downloader service using yt-dlp
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');

class DownloaderService {
  constructor(wsHandler) {
    this.wsHandler = wsHandler;
    this.downloadDir = process.env.DOWNLOAD_DIR || './downloads';
    this.ytDlpPath = process.env.YT_DLP_PATH || 'yt-dlp';
    this.downloadCounter = 0;
    this.activeProcesses = new Set(); // Track active download processes
    
    // Ensure download directory exists
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  // Terminate all active download processes
  terminateAll() {
    console.log(`Terminating ${this.activeProcesses.size} active download processes...`);
    this.activeProcesses.forEach(proc => {
      try {
        proc.kill('SIGTERM');
      } catch (error) {
        console.error('Error terminating process:', error);
      }
    });
    this.activeProcesses.clear();
  }

  // Extract YouTube video ID from URL
  extractVideoId(url) {
    try {
      const urlObj = new URL(url);
      
      // Handle youtu.be format
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1).split('?')[0];
      }
      
      // Handle youtube.com format
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      }
      
      return null;
    } catch (error) {
      console.error('Failed to extract video ID:', error);
      return null;
    }
  }

  // Parse yt-dlp progress output
  parseProgress(line) {
    // Example: [download]  45.2% of 10.50MiB at 1.20MiB/s ETA 00:04
    const percentMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
    const sizeMatch = line.match(/of\s+([\d.]+\s*[A-Z]+iB)/);
    const speedMatch = line.match(/at\s+([\d.]+\s*[A-Z]+iB\/s)/);
    const etaMatch = line.match(/ETA\s+(\d+:\d+)/);

    return {
      percent: percentMatch ? parseFloat(percentMatch[1]) : null,
      size: sizeMatch ? sizeMatch[1] : null,
      speed: speedMatch ? speedMatch[1] : null,
      eta: etaMatch ? etaMatch[1] : null
    };
  }

  // Download a single video
  async downloadVideo(videoId, url, videoFormat, audioFormat, downloadAudio) {
    const startTime = Date.now();
    
    try {
      // Update status to downloading
      await db.query(
        'UPDATE videos SET status = $1, progress = 0 WHERE id = $2',
        ['downloading', videoId]
      );

      this.wsHandler.broadcast({
        type: 'download_start',
        videoId: videoId,
        url: url
      });

      // Get video info first
      const videoInfo = await this.getVideoInfo(url);
      
      await db.query(
        'UPDATE videos SET title = $1, duration = $2, thumbnail_url = $3 WHERE id = $4',
        [videoInfo.title, videoInfo.duration, videoInfo.thumbnail, videoId]
      );

      // Extract YouTube video ID for filename
      const youtubeVideoId = this.extractVideoId(url) || `video_${videoId}`;
      this.downloadCounter++;
      const counter = this.downloadCounter;

      // Build yt-dlp command for video with new naming format
      const videoOutputPath = path.join(this.downloadDir, `${counter}_${youtubeVideoId}_video.%(ext)s`);
      const videoArgs = [
        '--no-warnings',
        '--no-playlist',
        '-f', this.getFormatSelector(videoFormat, 'video'),
        '-o', videoOutputPath,
        '--newline',
        url
      ];

      // Download video
      const videoResult = await this.executeYtDlp(videoArgs, videoId, 'video');
      
      let audioResult = null;
      if (downloadAudio && audioFormat) {
        // Download audio separately with new naming format
        const audioOutputPath = path.join(this.downloadDir, `${counter}_${youtubeVideoId}_audio.%(ext)s`);
        const audioArgs = [
          '--no-warnings',
          '--no-playlist',
          '-f', 'bestaudio',
          '-x', '--audio-format', audioFormat,
          '-o', audioOutputPath,
          '--newline',
          url
        ];
        
        audioResult = await this.executeYtDlp(audioArgs, videoId, 'audio');
      }

      // Get file sizes with new pattern
      const videoFilePath = this.findDownloadedFile(counter, youtubeVideoId, 'video');
      const audioFilePath = downloadAudio ? this.findDownloadedFile(counter, youtubeVideoId, 'audio') : null;
      
      const videoSize = videoFilePath ? fs.statSync(videoFilePath).size : 0;
      const audioSize = audioFilePath ? fs.statSync(audioFilePath).size : 0;

      // Update database
      await db.query(
        `UPDATE videos SET 
          status = $1, 
          progress = 100, 
          video_size = $2, 
          audio_size = $3,
          video_path = $4,
          audio_path = $5,
          filename = $6,
          completed_at = NOW()
        WHERE id = $7`,
        [
          'completed',
          videoSize,
          audioSize,
          videoFilePath,
          audioFilePath,
          path.basename(videoFilePath),
          videoId
        ]
      );

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

      this.wsHandler.broadcast({
        type: 'download_complete',
        videoId: videoId,
        title: videoInfo.title,
        videoSize: videoSize,
        audioSize: audioSize,
        videoPath: videoFilePath,
        audioPath: audioFilePath,
        elapsedTime: elapsedTime
      });

      return {
        success: true,
        videoId: videoId,
        title: videoInfo.title,
        videoSize: videoSize,
        audioSize: audioSize,
        elapsedTime: elapsedTime
      };

    } catch (error) {
      console.error(`Download failed for video ${videoId}:`, error);
      
      await db.query(
        'UPDATE videos SET status = $1, error_message = $2, completed_at = NOW() WHERE id = $3',
        ['failed', error.message, videoId]
      );

      this.wsHandler.broadcast({
        type: 'download_error',
        videoId: videoId,
        error: error.message
      });

      return {
        success: false,
        videoId: videoId,
        error: error.message
      };
    }
  }

  // Execute yt-dlp command
  executeYtDlp(args, videoId, type) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.ytDlpPath, args);
      this.activeProcesses.add(proc); // Track this process
      
      let stderr = '';

      proc.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);

        // Parse and broadcast progress
        const lines = output.split('\n');
        lines.forEach(line => {
          if (line.includes('[download]')) {
            const progress = this.parseProgress(line);
            if (progress.percent) {
              // For audio, use 50-100% range
              const adjustedPercent = type === 'audio' 
                ? 50 + (progress.percent / 2)
                : (progress.percent / 2); // For video, use 0-50% range

              this.wsHandler.broadcast({
                type: 'download_progress',
                videoId: videoId,
                progress: Math.round(adjustedPercent),
                speed: progress.speed,
                eta: progress.eta,
                downloadType: type
              });

              // Update database
              db.query(
                'UPDATE videos SET progress = $1 WHERE id = $2',
                [Math.round(adjustedPercent), videoId]
              ).catch(err => console.error('Failed to update progress:', err));
            }
          }
        });
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        this.activeProcesses.delete(proc); // Remove from tracking
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        this.activeProcesses.delete(proc); // Remove from tracking
        reject(new Error(`Failed to start yt-dlp: ${error.message}`));
      });
    });
  }

  // Get video info using yt-dlp
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const args = ['--dump-json', '--no-playlist', url];
      const proc = spawn(this.ytDlpPath, args);
      this.activeProcesses.add(proc); // Track this process
      
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        this.activeProcesses.delete(proc); // Remove from tracking
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            resolve({
              title: info.title || 'Unknown',
              duration: info.duration || 0,
              thumbnail: info.thumbnail || '',
              uploader: info.uploader || '',
              upload_date: info.upload_date || ''
            });
          } catch (error) {
            reject(new Error('Failed to parse video info'));
          }
        } else {
          reject(new Error(stderr || `Failed to get video info, exit code: ${code}`));
        }
      });

      proc.on('error', (error) => {
        this.activeProcesses.delete(proc); // Remove from tracking
        reject(error);
      });
    });
  }

  // Get format selector for yt-dlp
  getFormatSelector(format, type) {
    if (type === 'video') {
      switch (format) {
        case 'mp4':
          return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        case 'mkv':
          return 'bestvideo[ext=mkv]+bestaudio/best[ext=mkv]/best';
        case 'webm':
          return 'bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]/best';
        case 'best':
        default:
          return 'bestvideo+bestaudio/best';
      }
    }
    return 'bestaudio/best';
  }

  // Find downloaded file in directory
  findDownloadedFile(counter, youtubeVideoId, type) {
    const files = fs.readdirSync(this.downloadDir);
    const pattern = `${counter}_${youtubeVideoId}_${type}`;
    const matchedFile = files.find(file => file.startsWith(pattern));
    return matchedFile ? path.join(this.downloadDir, matchedFile) : null;
  }

  // Batch download videos
  async batchDownload(urls, videoFormat, audioFormat, downloadAudio) {
    const results = [];
    const startTime = Date.now();

    for (const url of urls) {
      // Insert into database
      const result = await db.query(
        `INSERT INTO videos (url, video_format, audio_format, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (url, video_format, audio_format) 
         DO UPDATE SET status = 'pending', created_at = NOW()
         RETURNING id`,
        [url, videoFormat, audioFormat || null]
      );

      const videoId = result.rows[0].id;

      // Download video
      const downloadResult = await this.downloadVideo(videoId, url, videoFormat, audioFormat, downloadAudio);
      results.push({
        videoId: videoId,
        url: url,
        ...downloadResult
      });
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      results: results,
      totalTime: totalTime,
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length
    };
  }
}

module.exports = DownloaderService;
