// Video Generator Service using FFmpeg and Canvas
const ffmpeg = require('fluent-ffmpeg');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

class VideoGenerator {
  constructor(wsServer = null) {
    this.outputPath = process.env.OUTPUT_PATH || './outputs';
    this.tempPath = process.env.TEMP_PATH || './temp';
    this.wsServer = wsServer;
    
    // 设置ffmpeg路径（如果需要）
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    }
    if (process.env.FFPROBE_PATH) {
      ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    }
  }

  // 生成视频
  async generateVideo(videoId, options) {
    const video = await db.videos.getById(videoId);
    if (!video) {
      throw new Error('视频记录不存在');
    }

    try {
      // 更新状态为生成中
      await db.videos.updateStatus(videoId, 'generating', 0);
      this.broadcastProgress(videoId, { status: 'generating', progress: 0 });

      // 1. 注册自定义字体（如果有）
      if (video.custom_font && fsSync.existsSync(video.custom_font)) {
        try {
          registerFont(video.custom_font, { family: 'CustomFont' });
          video.font_family = 'CustomFont';
        } catch (error) {
          console.error('注册自定义字体失败:', error);
        }
      }

      // 2. 生成文本图像帧
      await this.updateProgress(videoId, 10, '生成文本图像...');
      const textImagePath = await this.generateTextImage(video);

      // 3. 获取音频时长
      await this.updateProgress(videoId, 20, '分析音频...');
      const audioDuration = await this.getAudioDuration(video.background_music);
      
      // 计算实际视频时长（音频时长 vs 幻灯片时长）
      const videoDuration = Math.min(audioDuration, video.slide_duration);

      // 4. 生成视频
      await this.updateProgress(videoId, 30, '合成视频...');
      const videoPath = await this.createVideo(
        video,
        textImagePath,
        videoDuration,
        (progress) => {
          // 30-90% 的进度用于视频生成
          const overallProgress = 30 + Math.floor(progress * 0.6);
          this.updateProgress(videoId, overallProgress, '正在合成视频...');
        }
      );

      // 5. 获取视频文件信息
      await this.updateProgress(videoId, 90, '完成处理...');
      const videoStats = await fs.stat(videoPath);
      const videoFilename = path.basename(videoPath);

      // 6. 更新数据库
      await db.videos.update(videoId, {
        video_path: videoPath,
        video_filename: videoFilename,
        video_duration: videoDuration,
        video_file_size: videoStats.size,
        generation_status: 'completed',
        generation_progress: 100,
        generation_completed_at: new Date()
      });

      // 7. 清理临时文件
      await this.cleanupTempFiles([textImagePath]);

      await this.updateProgress(videoId, 100, '生成完成！');

      return {
        success: true,
        video: await db.videos.getById(videoId),
        videoPath,
        videoFilename
      };

    } catch (error) {
      console.error('视频生成失败:', error);
      
      await db.videos.updateStatus(videoId, 'failed', null, error.message);
      this.broadcastProgress(videoId, {
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  // 生成文本图像
  async generateTextImage(video) {
    const width = video.video_width || 1920;
    const height = video.video_height || 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. 绘制背景
    if (video.background_image && fsSync.existsSync(video.background_image)) {
      // 使用背景图片
      const image = await loadImage(video.background_image);
      ctx.drawImage(image, 0, 0, width, height);
    } else {
      // 使用背景颜色
      ctx.fillStyle = video.background_color || '#000000';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. 设置文本样式
    const fontSize = video.font_size || 48;
    const fontFamily = video.font_family || 'Arial';
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = video.font_color || '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 3. 计算文本区域
    const marginTop = video.text_margin_top || 100;
    const marginBottom = video.text_margin_bottom || 100;
    const marginLeft = video.text_margin_left || 100;
    const marginRight = video.text_margin_right || 100;

    const textAreaWidth = width - marginLeft - marginRight;
    const textAreaHeight = height - marginTop - marginBottom;
    const centerX = marginLeft + textAreaWidth / 2;
    const centerY = marginTop + textAreaHeight / 2;

    // 4. 绘制文本背景（如果设置了）
    if (video.font_background_color && video.font_background_color !== 'transparent') {
      const lines = this.wrapText(ctx, video.text_content, textAreaWidth);
      const lineHeight = fontSize * 1.5;
      const textBlockHeight = lines.length * lineHeight;
      const textBlockY = centerY - textBlockHeight / 2;

      ctx.fillStyle = video.font_background_color;
      ctx.fillRect(
        marginLeft - 20,
        textBlockY - 20,
        textAreaWidth + 40,
        textBlockHeight + 40
      );

      ctx.fillStyle = video.font_color || '#FFFFFF';
    }

    // 5. 绘制文本（支持换行）
    const lines = this.wrapText(ctx, video.text_content, textAreaWidth);
    const lineHeight = fontSize * 1.5;
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      ctx.fillText(line, centerX, startY + index * lineHeight);
    });

    // 6. 保存图像
    const tempImagePath = path.join(this.tempPath, `text_${uuidv4()}.png`);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(tempImagePath, buffer);

    return tempImagePath;
  }

  // 文本换行处理
  wrapText(ctx, text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  // 获取音频时长
  getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  // 创建视频
  createVideo(video, textImagePath, duration, onProgress) {
    return new Promise((resolve, reject) => {
      const outputFilename = `video_${uuidv4()}.${video.video_format}`;
      const outputPath = path.join(this.outputPath, outputFilename);

      // 构建ffmpeg命令
      let command = ffmpeg();

      // 添加文本图像输入（循环）
      command.input(textImagePath)
        .inputOptions([
          '-loop 1',
          `-t ${duration}`
        ]);

      // 添加音频输入
      command.input(video.background_music)
        .inputOptions([
          `-t ${duration}`
        ]);

      // 设置输出选项
      const fps = video.video_fps || 30;
      const width = video.video_width || 1920;
      const height = video.video_height || 1080;

      command
        .outputOptions([
          '-c:v libx264',
          '-preset medium',
          '-crf 23',
          '-pix_fmt yuv420p',
          `-r ${fps}`,
          `-s ${width}x${height}`,
          '-c:a aac',
          '-b:a 192k',
          '-shortest'
        ])
        .output(outputPath);

      // 应用文本动画效果
      const animation = video.text_animation || 'fade';
      this.applyAnimation(command, animation, duration);

      // 进度回调
      command.on('progress', (progress) => {
        if (progress.percent) {
          onProgress(progress.percent / 100);
        }
      });

      // 完成回调
      command.on('end', () => {
        resolve(outputPath);
      });

      // 错误回调
      command.on('error', (err) => {
        reject(new Error(`FFmpeg错误: ${err.message}`));
      });

      // 开始处理
      command.run();
    });
  }

  // 应用动画效果
  applyAnimation(command, animation, duration) {
    switch (animation) {
      case 'fade':
        // 淡入淡出效果
        const fadeInDuration = Math.min(1, duration * 0.2);
        const fadeOutStart = Math.max(0, duration - 1);
        command.videoFilters(
          `fade=t=in:st=0:d=${fadeInDuration},fade=t=out:st=${fadeOutStart}:d=1`
        );
        break;

      case 'slide_left':
      case 'slide_right':
      case 'slide_up':
      case 'slide_down':
        // 滑动效果 - 简化为淡入效果
        // 复杂的滑动需要更多的滤镜链，容易出错
        command.videoFilters('fade=t=in:st=0:d=1');
        break;

      case 'zoom_in':
        // 放大效果 - 使用 scale 简化版本
        command.videoFilters('fade=t=in:st=0:d=1.5');
        break;

      case 'none':
      default:
        // 无动画，不添加滤镜
        break;
    }
  }

  // 更新进度
  async updateProgress(videoId, progress, message = '') {
    await db.videos.updateStatus(videoId, 'generating', progress);
    this.broadcastProgress(videoId, {
      status: 'generating',
      progress,
      message
    });
  }

  // WebSocket 广播进度
  broadcastProgress(videoId, progressData) {
    if (this.wsServer) {
      this.wsServer.broadcast({
        type: 'generation_progress',
        videoId,
        data: progressData
      });
    }
  }

  // 清理临时文件
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);
          console.log(`🗑️  删除临时文件: ${filePath}`);
        }
      } catch (error) {
        console.error(`清理临时文件失败 (${filePath}):`, error);
      }
    }
  }

  // 删除视频及相关文件
  async deleteVideo(videoId) {
    try {
      const video = await db.videos.getById(videoId);
      if (!video) return false;

      const filesToDelete = [
        video.video_path,
        video.background_image,
        video.background_music,
        video.custom_font
      ].filter(Boolean);

      await this.cleanupTempFiles(filesToDelete);
      
      await db.videos.delete(videoId);
      
      return true;
    } catch (error) {
      console.error('删除视频失败:', error);
      return false;
    }
  }

  // 检查 FFmpeg 是否安装
  async checkFFmpeg() {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('❌ FFmpeg 未安装或配置错误');
          resolve(false);
        } else {
          console.log('✅ FFmpeg 已就绪');
          resolve(true);
        }
      });
    });
  }
}

module.exports = VideoGenerator;
