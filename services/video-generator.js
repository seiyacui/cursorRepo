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
    console.log(`🎬 [${videoId}] 开始生成视频...`);
    
    const video = await db.videos.getById(videoId);
    if (!video) {
      throw new Error('视频记录不存在');
    }
    
    console.log(`📋 [${videoId}] 视频信息:`, {
      text_content: video.text_content.substring(0, 50),
      background_music: video.background_music,
      background_image: video.background_image,
      slide_duration: video.slide_duration
    });

    try {
      // 更新状态为生成中
      console.log(`📊 [${videoId}] 更新状态为生成中...`);
      await db.videos.updateStatus(videoId, 'generating', 0);
      this.broadcastProgress(videoId, { status: 'generating', progress: 0 });

      // 1. 注册自定义字体（如果有且用户选择了custom）
      console.log(`🔤 [${videoId}] 检查自定义字体...`);
      console.log(`🔤 [${videoId}] font_family设置: ${video.font_family}`);
      console.log(`🔤 [${videoId}] custom_font路径: ${video.custom_font}`);
      
      if (video.font_family === 'custom' && video.custom_font && fsSync.existsSync(video.custom_font)) {
        try {
          console.log(`🔤 [${videoId}] 注册自定义字体: ${video.custom_font}`);
          const customFontName = 'CustomFont_' + Date.now();
          registerFont(video.custom_font, { family: customFontName });
          video.customFontFamily = customFontName;
          console.log(`✅ [${videoId}] 自定义字体注册成功: ${customFontName}`);
        } catch (error) {
          console.error(`❌ [${videoId}] 注册自定义字体失败:`, error);
          console.error(`❌ [${videoId}] 错误详情:`, error.stack);
          video.font_family = 'Arial';  // 回退到默认字体
        }
      } else {
        if (video.font_family === 'custom') {
          console.warn(`⚠️ [${videoId}] 选择了自定义字体但文件不存在，使用默认字体`);
          video.font_family = 'Arial';
        }
      }

      // 2. 生成文本图像帧
      console.log(`🖼️  [${videoId}] 开始生成文本图像...`);
      console.log(`🖼️  [${videoId}] 使用字体: ${video.customFontFamily || video.font_family || 'Arial'}`);
      await this.updateProgress(videoId, 10, '生成文本图像...');
      
      // 如果是打字机效果，生成图像序列
      let textImagePath;
      let isTypewriterEffect = video.text_animation === 'typewriter';
      
      if (isTypewriterEffect) {
        console.log(`⌨️  [${videoId}] 打字机效果：生成逐字图像序列...`);
        textImagePath = await this.generateTypewriterSequence(video);
        console.log(`✅ [${videoId}] 打字机图像序列生成成功`);
      } else {
        textImagePath = await this.generateTextImage(video);
        console.log(`✅ [${videoId}] 文本图像生成成功: ${textImagePath}`);
      }

      // 3. 获取音频时长
      console.log(`🎵 [${videoId}] 开始分析音频: ${video.background_music}`);
      await this.updateProgress(videoId, 20, '分析音频...');
      const audioDuration = await this.getAudioDuration(video.background_music);
      console.log(`✅ [${videoId}] 音频时长: ${audioDuration}秒`);
      
      // 使用用户设定的幻灯片时长（音频会循环或截断）
      const videoDuration = video.slide_duration || 5;
      console.log(`⏱️  [${videoId}] 视频时长: ${videoDuration}秒 (音频:${audioDuration}秒, 设定:${video.slide_duration}秒)`);
      
      if (audioDuration < videoDuration) {
        console.log(`🔁 音频较短，将循环播放音频`);
      } else if (audioDuration > videoDuration) {
        console.log(`✂️  音频较长，将截断至${videoDuration}秒`);
      }

      // 4. 生成视频
      console.log(`🎬 [${videoId}] 开始合成视频...`);
      await this.updateProgress(videoId, 30, '合成视频...');
      const videoPath = await this.createVideo(
        video,
        textImagePath,
        videoDuration,
        (progress) => {
          // 30-90% 的进度用于视频生成
          const overallProgress = 30 + Math.floor(progress * 0.6);
          console.log(`📊 [${videoId}] FFmpeg进度: ${Math.floor(progress * 100)}%`);
          this.updateProgress(videoId, overallProgress, '正在合成视频...');
        },
        isTypewriterEffect
      );
      console.log(`✅ [${videoId}] 视频合成成功: ${videoPath}`);

      // 5. 获取视频文件信息
      await this.updateProgress(videoId, 90, '完成处理...');
      const videoStats = await fs.stat(videoPath);
      const videoFilename = path.basename(videoPath);

      // 6. 更新数据库为完成状态
      await db.videos.update(videoId, {
        video_path: videoPath,
        video_filename: videoFilename,
        video_duration: videoDuration,
        video_file_size: videoStats.size,
        generation_status: 'completed',
        generation_progress: 100,
        generation_completed_at: new Date()
      });

      console.log(`✅ [${videoId}] 数据库状态已更新为 completed`);

      // 7. 清理临时文件
      await this.cleanupTempFiles([textImagePath]);

      // 8. 广播完成消息（不调用updateProgress，避免覆盖状态）
      this.broadcastProgress(videoId, {
        status: 'completed',
        progress: 100,
        message: '生成完成！'
      });
      
      console.log(`📡 [${videoId}] 已广播完成状态: completed, 100%`);

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

  // 生成文本图像（支持打字机效果的部分字符显示）
  async generateTextImage(video, charCount = null) {
    console.log(`🖼️  开始生成文本图像...`);
    const width = video.video_width || 1920;
    const height = video.video_height || 1080;
    console.log(`📐 画布大小: ${width}x${height}`);
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. 绘制背景
    if (video.background_image && fsSync.existsSync(video.background_image)) {
      // 使用背景图片
      console.log(`🖼️  加载背景图片: ${video.background_image}`);
      const image = await loadImage(video.background_image);
      ctx.drawImage(image, 0, 0, width, height);
      console.log(`✅ 背景图片绘制完成`);
    } else {
      // 使用背景颜色
      console.log(`🎨 使用背景颜色: ${video.background_color || '#000000'}`);
      ctx.fillStyle = video.background_color || '#000000';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. 设置文本样式
    const fontSize = video.font_size || 48;
    let fontFamily = 'Arial';  // 默认字体
    
    // 如果有自定义字体，优先使用
    if (video.customFontFamily) {
      fontFamily = video.customFontFamily;
      console.log(`🎨 使用自定义字体: ${fontFamily}`);
    } else if (video.font_family && video.font_family !== 'custom') {
      fontFamily = video.font_family;
      console.log(`🎨 使用系统字体: ${fontFamily}`);
    } else {
      console.log(`🎨 使用默认字体: ${fontFamily}`);
    }
    
    ctx.font = `${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = video.font_color || '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    console.log(`📝 Canvas字体设置: ${ctx.font}`);

    // 3. 计算文本区域
    const marginTop = video.text_margin_top || 100;
    const marginBottom = video.text_margin_bottom || 100;
    const marginLeft = video.text_margin_left || 100;
    const marginRight = video.text_margin_right || 100;

    const textAreaWidth = width - marginLeft - marginRight;
    const textAreaHeight = height - marginTop - marginBottom;
    const centerX = marginLeft + textAreaWidth / 2;
    const centerY = marginTop + textAreaHeight / 2;

    // 4. 准备显示的文本（支持打字机效果）
    const displayText = charCount !== null 
      ? video.text_content.substring(0, charCount) 
      : video.text_content;
    
    const lines = this.wrapText(ctx, displayText, textAreaWidth);
    const lineHeight = fontSize * 1.5;
    const totalHeight = lines.length * lineHeight;
    const startY = centerY - totalHeight / 2 + lineHeight / 2;

    // 5. 绘制文本背景（如果设置了）
    if (!video.font_background_transparent && video.font_background_color) {
      lines.forEach((line, i) => {
        const metrics = ctx.measureText(line);
        const textWidth = metrics.width;
        const padding = 10;
        
        ctx.fillStyle = video.font_background_color;
        ctx.fillRect(
          centerX - textWidth / 2 - padding,
          startY + i * lineHeight - fontSize / 2 - padding / 2,
          textWidth + padding * 2,
          fontSize + padding
        );
      });
    }

    // 6. 绘制文本
    ctx.fillStyle = video.font_color || '#FFFFFF';
    lines.forEach((line, index) => {
      ctx.fillText(line, centerX, startY + index * lineHeight);
    });

    // 7. 保存图像
    const tempImagePath = path.join(this.tempPath, `text_image_${uuidv4()}.png`);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(tempImagePath, buffer);
    
    if (charCount !== null) {
      console.log(`💾 打字机帧已保存: ${charCount}/${video.text_content.length}字符`);
    } else {
      console.log(`💾 图像已保存: ${tempImagePath}`);
    }

    return tempImagePath;
  }

  // 生成打字机效果的图像序列
  async generateTypewriterSequence(video) {
    const textContent = video.text_content || '';
    const textLength = textContent.length;
    const fps = video.video_fps || 30;
    const animDuration = parseFloat(video.animation_duration) || 2.0;
    const slideDuration = video.slide_duration || 5; // 幻灯片总时长
    
    // 计算打字动画的帧数
    const typingFrames = Math.ceil(animDuration * fps);
    const charsPerFrame = textLength / typingFrames;
    
    // 计算总帧数（整个幻灯片时长）
    const totalFrames = Math.ceil(slideDuration * fps);
    
    console.log(`⌨️  打字机序列配置:`);
    console.log(`   - 文本长度: ${textLength}字符`);
    console.log(`   - 打字动画: ${animDuration}秒 (${typingFrames}帧)`);
    console.log(`   - 幻灯片总时长: ${slideDuration}秒 (${totalFrames}帧)`);
    console.log(`   - 打字速度: ${charsPerFrame.toFixed(2)}字符/帧`);
    
    // 创建序列目录
    const sequenceDir = path.join(this.tempPath, `typewriter_${video.id}_${Date.now()}`);
    await fs.mkdir(sequenceDir, { recursive: true });
    
    let frameIndex = 0;
    
    // 阶段1: 生成打字动画帧（0到textLength字符）
    console.log(`⌨️  阶段1: 生成打字动画帧 (0-${typingFrames})`);
    for (let i = 0; i <= typingFrames; i++) {
      const charsToShow = Math.min(Math.ceil(i * charsPerFrame), textLength);
      
      // 生成该帧的图像（只显示前N个字符）
      const frameImage = await this.generateTextImage(video, charsToShow);
      
      // 复制到序列目录
      const frameName = `frame_${String(frameIndex).padStart(4, '0')}.png`;
      const framePath = path.join(sequenceDir, frameName);
      await fs.copyFile(frameImage, framePath);
      await fs.unlink(frameImage);
      
      frameIndex++;
      
      if (i % 10 === 0 || i === typingFrames) {
        console.log(`   ⌨️  打字帧: ${i}/${typingFrames} (显示${charsToShow}/${textLength}字符)`);
      }
    }
    
    // 阶段2: 生成静态完整文本帧（填充剩余时长）
    const remainingFrames = totalFrames - frameIndex;
    if (remainingFrames > 0) {
      console.log(`⌨️  阶段2: 生成静态完整文本帧 (${frameIndex}-${totalFrames-1})`);
      
      // 生成完整文本的图像
      const fullTextImage = await this.generateTextImage(video, null);
      
      // 复制多次以填充剩余时长
      for (let i = 0; i < remainingFrames; i++) {
        const frameName = `frame_${String(frameIndex).padStart(4, '0')}.png`;
        const framePath = path.join(sequenceDir, frameName);
        await fs.copyFile(fullTextImage, framePath);
        frameIndex++;
        
        if (i % 30 === 0 || i === remainingFrames - 1) {
          console.log(`   📄 静态帧: ${i+1}/${remainingFrames}`);
        }
      }
      
      // 删除临时完整文本图像
      await fs.unlink(fullTextImage);
    }
    
    console.log(`✅ 打字机图像序列生成完成: ${sequenceDir}`);
    console.log(`   总帧数: ${frameIndex}, 视频时长: ${(frameIndex/fps).toFixed(2)}秒`);
    return sequenceDir;  // 返回目录路径
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
    console.log(`🎵 获取音频时长: ${audioPath}`);
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          console.error(`❌ FFprobe错误:`, err);
          reject(err);
        } else {
          const duration = metadata.format.duration;
          console.log(`✅ 音频时长: ${duration}秒`);
          resolve(duration);
        }
      });
    });
  }

  // 创建视频
  createVideo(video, textImagePath, duration, onProgress, isTypewriterSequence = false) {
    console.log(`🎬 开始创建视频...`);
    console.log(`📝 参数: 图像=${textImagePath}, 时长=${duration}秒, 图像序列=${isTypewriterSequence}`);
    
    return new Promise((resolve, reject) => {
      const outputFilename = `video_${uuidv4()}.${video.video_format}`;
      const outputPath = path.join(this.outputPath, outputFilename);
      console.log(`📁 输出路径: ${outputPath}`);

      // 构建ffmpeg命令
      console.log(`🔧 构建FFmpeg命令...`);
      let command = ffmpeg();

      // 添加文本图像输入
      if (isTypewriterSequence) {
        // 打字机效果：使用图像序列
        const sequencePattern = path.join(textImagePath, 'frame_%04d.png');
        console.log(`➕ 添加图像序列: ${sequencePattern}`);
        const fps = video.video_fps || 30;
        command.input(sequencePattern)
          .inputOptions([
            `-framerate ${fps}`,
            `-t ${duration}`  // 限制图像序列时长
          ]);
      } else {
        // 普通效果：循环单张图片
        console.log(`➕ 添加图像输入: ${textImagePath}`);
        command.input(textImagePath)
          .inputOptions([
            '-loop 1',
            `-t ${duration}`
          ]);
      }

      // 添加音频输入（支持循环）
      console.log(`➕ 添加音频输入: ${video.background_music}`);
      command.input(video.background_music)
        .inputOptions([
          '-stream_loop -1',  // 无限循环音频
          `-t ${duration}`    // 但只取指定时长
        ]);

      // 根据分辨率设置输出尺寸
      let width, height;
      switch(video.video_resolution || '1080p') {
        case '4k':
          width = 3840;
          height = 2160;
          break;
        case '3k':
          width = 3200;
          height = 1800;
          break;
        case '2k':
          width = 2560;
          height = 1440;
          break;
        case '1080p':
        default:
          width = 1920;
          height = 1080;
          break;
      }
      
      const fps = video.video_fps || 30;
      console.log(`📺 分辨率设置: ${video.video_resolution || '1080p'} (${width}x${height})`);
      
      console.log(`⚙️  输出设置: ${width}x${height} @ ${fps}fps, 格式=${video.video_format}`);

      command
        .outputOptions([
          '-c:v libx264',
          '-preset medium',
          '-crf 23',
          '-pix_fmt yuv420p',
          `-r ${fps}`,
          `-s ${width}x${height}`,
          '-c:a aac',
          '-b:a 192k'
          // 移除 -shortest 标志，因为我们已经在输入端设置了精确的时长
          // 音频: -stream_loop -1 -t ${duration}
          // 视频: -t ${duration}
        ])
        .output(outputPath);

      // 应用文本动画效果
      const animation = video.text_animation || 'fade';
      console.log(`🎨 应用动画效果: ${animation}`);
      this.applyAnimation(command, animation, duration, video);

      // 标准错误输出（FFmpeg详细日志）
      command.on('stderr', (stderrLine) => {
        console.log(`[FFmpeg] ${stderrLine}`);
      });

      // 进度回调
      command.on('progress', (progress) => {
        if (progress.percent) {
          console.log(`📊 FFmpeg进度: ${progress.percent.toFixed(1)}%`);
          onProgress(progress.percent / 100);
        }
      });

      // 完成回调
      command.on('end', () => {
        console.log(`✅ FFmpeg执行完成!`);
        resolve(outputPath);
      });

      // 错误回调
      command.on('error', (err) => {
        console.error(`❌ FFmpeg错误:`, err);
        reject(new Error(`FFmpeg错误: ${err.message}`));
      });

      // 开始处理
      console.log(`▶️  启动FFmpeg进程...`);
      try {
        command.run();
        console.log(`✅ FFmpeg命令已提交执行`);
      } catch (error) {
        console.error(`❌ 启动FFmpeg失败:`, error);
        reject(error);
      }
    });
  }

  // 应用动画效果
  applyAnimation(command, animation, duration, video) {
    console.log(`🎬 应用动画效果: ${animation}`);
    
    // 动画时长（秒） - 使用用户设定的时长，如果没有则使用默认值
    const userAnimDuration = parseFloat(video?.animation_duration);
    const animDuration = (!isNaN(userAnimDuration) && userAnimDuration > 0) 
      ? Math.min(userAnimDuration, duration)  // 不超过视频总时长
      : Math.min(1.5, duration * 0.3);  // 默认值：最多1.5秒或视频时长的30%
    
    console.log(`⏱️  动画时长: ${animDuration}秒 (用户设定: ${video?.animation_duration || '默认'})`);;
    
    switch (animation) {
      case 'fade':
        // 淡入淡出效果
        const fadeInDuration = animDuration;
        const fadeOutStart = Math.max(0, duration - animDuration);
        console.log(`  ✅ 淡入淡出: 淡入${fadeInDuration}s, 淡出从${fadeOutStart}s开始`);
        command.videoFilters(
          `fade=t=in:st=0:d=${fadeInDuration},fade=t=out:st=${fadeOutStart}:d=${animDuration}`
        );
        break;

      case 'slide_left':
        // 从右向左滑入（图像从右边进入）
        console.log(`  ✅ 从右向左滑入 (${animDuration}秒)`);
        command.videoFilters([
          `pad=iw*2:ih:0:0`,  // 画布扩大2倍，图像在左边
          `crop=iw/2:ih:'iw-iw*min(t/${animDuration}\\,1)':0`  // 裁剪窗口从右向左移动
        ].join(','));
        break;

      case 'slide_right':
        // 从左向右滑入（图像从左边进入）
        console.log(`  ✅ 从左向右滑入 (${animDuration}秒)`);
        command.videoFilters([
          `pad=iw*2:ih:iw:0`,  // 画布扩大2倍，图像在右边
          `crop=iw/2:ih:'iw*min(t/${animDuration}\\,1)':0`  // 裁剪窗口从左向右移动
        ].join(','));
        break;

      case 'slide_up':
        // 从下向上滑入（图像从下边进入）
        console.log(`  ✅ 从下向上滑入 (${animDuration}秒)`);
        command.videoFilters([
          `pad=iw:ih*2:0:0`,  // 画布扩大2倍，图像在上边
          `crop=iw:ih/2:0:'ih-ih*min(t/${animDuration}\\,1)'`  // 裁剪窗口从下向上移动
        ].join(','));
        break;

      case 'slide_down':
        // 从上向下滑入（图像从上边进入）
        console.log(`  ✅ 从上向下滑入 (${animDuration}秒)`);
        command.videoFilters([
          `pad=iw:ih*2:0:ih`,  // 画布扩大2倍，图像在下边
          `crop=iw:ih/2:0:'ih*min(t/${animDuration}\\,1)'`  // 裁剪窗口从上向下移动
        ].join(','));
        break;

      case 'zoom_in':
        // 缩放效果：从小放大（改用简单的fade+scale组合）
        console.log(`  ✅ 放大效果 (淡入, ${animDuration}秒)`);
        command.videoFilters([
          `fade=t=in:st=0:d=${animDuration}`,
          `scale=1920:1080:force_original_aspect_ratio=decrease`,
          `pad=1920:1080:(ow-iw)/2:(oh-ih)/2`
        ].join(','));
        break;

      case 'zoom_out':
        // 缩放效果：从大缩小（改用简单的fade效果）
        console.log(`  ✅ 缩小效果 (淡入, ${animDuration}秒)`);
        command.videoFilters([
          `fade=t=in:st=0:d=${animDuration}`,
          `scale=1920:1080:force_original_aspect_ratio=decrease`,
          `pad=1920:1080:(ow-iw)/2:(oh-ih)/2`
        ].join(','));
        break;

      case 'rotate':
        // 旋转效果 - 顺时针360度
        console.log(`  ✅ 旋转效果 (顺时针360度, ${animDuration}秒)`);
        command.videoFilters([
          `scale=iw*1.5:ih*1.5`,
          `rotate='2*PI*min(t/${animDuration}\\,1)':c=black`,
          `crop=iw/1.5:ih/1.5`
        ].join(','));
        break;

      case 'rotate_reverse':
        // 旋转效果 - 逆时针360度
        console.log(`  ✅ 旋转效果 (逆时针360度, ${animDuration}秒)`);
        command.videoFilters([
          `scale=iw*1.5:ih*1.5`,
          `rotate='-2*PI*min(t/${animDuration}\\,1)':c=black`,
          `crop=iw/1.5:ih/1.5`
        ].join(','));
        break;

      case 'spin':
        // 快速旋转 - 3圈
        console.log(`  ✅ 快速旋转 (3圈, ${animDuration}秒)`);
        command.videoFilters([
          `scale=iw*1.5:ih*1.5`,
          `rotate='6*PI*min(t/${animDuration}\\,1)':c=black`,
          `crop=iw/1.5:ih/1.5`
        ].join(','));
        break;

      case 'bounce':
        // 弹跳效果 - 上下弹跳
        console.log(`  ✅ 弹跳效果 (上下弹跳, ${animDuration}秒)`);
        const bounceHeight = 150;
        const bounceFreq = 3;
        command.videoFilters([
          `pad=iw:ih+${bounceHeight}:0:${bounceHeight/2}`,
          `crop=iw:ih:0:${bounceHeight/2}+${bounceHeight/2}*abs(sin(${bounceFreq}*2*PI*t/${animDuration}))`
        ].join(','));
        break;

      case 'bounce_horizontal':
        // 水平弹跳
        console.log(`  ✅ 水平弹跳 (左右跳动, ${animDuration}秒)`);
        const bounceWidth = 150;
        const hBounceFreq = 3;
        command.videoFilters([
          `pad=iw+${bounceWidth}:ih:${bounceWidth/2}:0`,
          `crop=iw:ih:${bounceWidth/2}+${bounceWidth/2}*abs(sin(${hBounceFreq}*2*PI*t/${animDuration})):0`
        ].join(','));
        break;

      case 'shake':
        // 抖动效果
        console.log(`  ✅ 抖动效果 (震动, ${animDuration}秒)`);
        const shakeAmount = 10;
        const shakeIntensity = Math.min(animDuration * 10, 20); // 时长越短，震动越快
        command.videoFilters([
          `pad=iw+${shakeAmount*2}:ih+${shakeAmount*2}:${shakeAmount}:${shakeAmount}`,
          `crop=iw:ih:${shakeAmount}+${shakeAmount}*sin(${shakeIntensity}*2*PI*t/${animDuration}):${shakeAmount}+${shakeAmount}*cos(${shakeIntensity}*2*PI*t/${animDuration})`
        ].join(','));
        break;

      case 'swing':
        // 摆动效果（钟摆）
        console.log(`  ✅ 摆动效果 (钟摆, ${animDuration}秒)`);
        const swingAngle = 0.3;  // 弧度
        const swingFreq = 2;
        command.videoFilters([
          `scale=iw*1.5:ih*1.5`,
          `rotate='${swingAngle}*sin(${swingFreq}*2*PI*t/${animDuration})':c=black`,
          `crop=iw/1.5:ih/1.5`
        ].join(','));
        break;

      case 'wave':
        // 波浪效果
        console.log(`  ✅ 波浪效果 (上下波动, ${animDuration}秒)`);
        const waveHeight = 50;
        const waveFreq = 4;
        command.videoFilters([
          `pad=iw:ih+${waveHeight*2}:0:${waveHeight}`,
          `crop=iw:ih:0:${waveHeight}+${waveHeight}*sin(${waveFreq}*2*PI*t/${animDuration})`
        ].join(','));
        break;

      case 'slide_diagonal_tl':
        // 从右下到左上
        console.log(`  ✅ 对角线滑入 (右下→左上)`);
        command.videoFilters([
          `pad=iw*2:ih*2:0:0`,
          `crop=iw/2:ih/2:'iw-iw*min(t/${animDuration}\\,1)':'ih-ih*min(t/${animDuration}\\,1)'`
        ].join(','));
        break;

      case 'slide_diagonal_tr':
        // 从左下到右上
        console.log(`  ✅ 对角线滑入 (左下→右上)`);
        command.videoFilters([
          `pad=iw*2:ih*2:iw:0`,
          `crop=iw/2:ih/2:'iw*min(t/${animDuration}\\,1)':'ih-ih*min(t/${animDuration}\\,1)'`
        ].join(','));
        break;

      case 'blink':
        // 闪烁效果
        console.log(`  ✅ 闪烁效果 (快速闪动, ${animDuration}秒)`);
        const blinkFreq = 6;
        command.videoFilters(`fade=t=in:st=0:d=${animDuration},colorchannelmixer=aa='0.5+0.5*sin(${blinkFreq}*2*PI*t/${animDuration})'`);
        break;

      case 'pulse':
        // 脉冲效果
        console.log(`  ✅ 脉冲效果 (心跳, ${animDuration}秒)`);
        const pulseFreq = 2;
        command.videoFilters(`scale='iw*(1+0.1*abs(sin(${pulseFreq}*2*PI*t/${animDuration})))':'ih*(1+0.1*abs(sin(${pulseFreq}*2*PI*t/${animDuration})))'`);
        break;

      case 'blur_in':
        // 模糊到清晰
        console.log(`  ✅ 模糊到清晰 (${animDuration}秒)`);
        command.videoFilters(`boxblur='10*max(0\\,1-t/${animDuration})':'10*max(0\\,1-t/${animDuration})'`);
        break;

      case 'glow':
        // 光晕效果
        console.log(`  ✅ 光晕效果 (发光)`);
        command.videoFilters(`eq=brightness=0.2:saturation=1.5,fade=t=in:st=0:d=${animDuration}`);
        break;

      case 'typewriter':
        // 打字机效果已通过图像序列实现，不需要额外滤镜
        console.log(`  ✅ 打字机效果 (已通过逐帧图像实现)`);
        // 图像序列本身就是打字效果，不需要额外的FFmpeg滤镜
        break;

      case 'flip_horizontal':
        // 水平翻转
        console.log(`  ✅ 水平翻转`);
        command.videoFilters(`hflip,fade=t=in:st=0:d=${animDuration}`);
        break;

      case 'flip_vertical':
        // 垂直翻转
        console.log(`  ✅ 垂直翻转`);
        command.videoFilters(`vflip,fade=t=in:st=0:d=${animDuration}`);
        break;

      case 'spiral':
        // 螺旋进入
        console.log(`  ✅ 螺旋进入 (${animDuration}秒)`);
        command.videoFilters([
          `scale=iw*1.5:ih*1.5`,
          `rotate='4*PI*min(t/${animDuration}\\,1)':c=black`,
          `crop=iw/1.5:ih/1.5`
        ].join(','));
        break;

      case 'elastic':
        // 弹性效果
        console.log(`  ✅ 弹性效果 (弹簧)`);
        command.videoFilters(`scale='iw*(1+0.5*exp(-5*t/${animDuration})*sin(10*t/${animDuration}))':'ih*(1+0.5*exp(-5*t/${animDuration})*sin(10*t/${animDuration}))'`);
        break;

      case 'rubber':
        // 橡皮筋效果
        console.log(`  ✅ 橡皮筋效果 (拉伸, ${animDuration}秒)`);
        command.videoFilters([
          `scale='iw*(1+0.3*sin(3*2*PI*t/${animDuration}))':'ih*(1-0.3*sin(3*2*PI*t/${animDuration}))'`
        ].join(','));
        break;

      case 'none':
      default:
        // 无动画
        console.log(`  ✅ 无动画`);
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
    console.log(`📡 [${videoId}] 尝试广播进度: ${progressData.progress}%, wsServer存在: ${!!this.wsServer}`);
    if (this.wsServer) {
      console.log(`📤 [${videoId}] 发送WebSocket消息...`);
      this.wsServer.broadcast({
        type: 'generation_progress',
        videoId,
        data: progressData
      });
    } else {
      console.warn(`⚠️  [${videoId}] WebSocket服务器未初始化，无法广播进度`);
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
