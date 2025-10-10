// Notification adapter for YouTube Video Downloader
// 适配现有的 NotificationService 到我们的下载器

const NotificationService = require('./notification');

class DownloaderNotificationService extends NotificationService {
  constructor() {
    super();
  }

  /**
   * 发送视频下载完成通知
   * @param {Object} video - 视频记录
   * @param {Object} downloadResult - 下载结果
   */
  async sendVideoDownloadComplete(video, downloadResult) {
    const title = `✅ 视频下载完成 - ${video.title || video.filename}`;
    
    const content = `### 视频下载成功

**视频信息**:
- 标题: ${video.title || '未知'}
- 文件名: ${video.filename}
- 视频格式: ${video.video_format || 'N/A'}
- 音频格式: ${video.audio_format || 'N/A'}
- 时长: ${this.formatVideoDuration(video.duration)}
- 视频大小: ${this.formatFileSize(video.video_file_size)}
- 音频大小: ${this.formatFileSize(video.audio_file_size)}
- 下载耗时: ${downloadResult.totalTime}秒

**文件路径**:
- 视频: ${video.video_path || '未下载'}
- 音频: ${video.audio_path || '未下载'}

**下载时间**: ${this.formatTime(video.download_completed_at)}

---
*由YouTube视频下载器自动发送*`;

    const htmlContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    await this.sendNotifications(title, content, htmlContent);
  }

  /**
   * 发送视频下载失败通知
   * @param {Object} video - 视频记录
   */
  async sendVideoDownloadFailed(video) {
    const title = `❌ 视频下载失败 - ${video.title || video.filename}`;
    
    const content = `### 视频下载失败

**视频信息**:
- 标题: ${video.title || '未知'}
- URL: ${video.video_url}
- 文件名: ${video.filename}

**错误信息**: ${video.error_message || '未知错误'}

**下载开始时间**: ${this.formatTime(video.download_started_at)}
**失败时间**: ${this.formatTime(video.download_completed_at)}

---
*由YouTube视频下载器自动发送*`;

    const htmlContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    await this.sendNotifications(title, content, htmlContent);
  }

  /**
   * 发送批量下载完成通知
   * @param {Object} batchResult - 批次下载结果
   * @param {Array} videos - 视频列表
   */
  async sendBatchDownloadComplete(batchResult, videos) {
    const { total, completed, failed, results } = batchResult;
    
    const title = `📦 批量下载完成 - 成功: ${completed}, 失败: ${failed}`;
    
    // 计算总大小和总时长
    let totalVideoSize = 0;
    let totalAudioSize = 0;
    let totalDuration = 0;
    
    const successVideos = videos.filter(v => v.download_status === 'completed');
    successVideos.forEach(v => {
      totalVideoSize += v.video_file_size || 0;
      totalAudioSize += v.audio_file_size || 0;
      totalDuration += v.duration || 0;
    });

    // 生成视频列表摘要
    const videoSummaries = videos.slice(0, 10).map((video, idx) => {
      const statusIcon = video.download_status === 'completed' ? '✅' : '❌';
      const size = this.formatFileSize((video.video_file_size || 0) + (video.audio_file_size || 0));
      return `${idx + 1}. ${statusIcon} ${video.title || video.filename} - ${size} - ${this.formatVideoDuration(video.duration)}`;
    });

    const content = `### 批量下载完成报告

**下载统计**:
- 总计视频: ${total}
- 成功下载: ${completed}
- 下载失败: ${failed}
- 成功率: ${Math.round(completed / total * 100)}%

**数据统计**:
- 总视频大小: ${this.formatFileSize(totalVideoSize)}
- 总音频大小: ${this.formatFileSize(totalAudioSize)}
- 总时长: ${this.formatVideoDuration(totalDuration)}

---
**下载详情**:
${videoSummaries.join('\n')}
${videos.length > 10 ? `\n... 还有 ${videos.length - 10} 个视频` : ''}

---
*由YouTube视频下载器自动发送*`;

    const htmlContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    await this.sendNotifications(title, content, htmlContent);
  }

  /**
   * 发送下载开始通知
   * @param {Number} videoCount - 视频数量
   */
  async sendDownloadStarted(videoCount) {
    const title = `🎬 开始下载YouTube视频`;
    
    const content = `### 下载任务开始

**任务信息**:
- 视频数量: ${videoCount}
- 开始时间: ${this.formatTime(new Date())}
- 状态: 正在处理中...

---
*由YouTube视频下载器自动发送*`;

    const htmlContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    await this.sendNotifications(title, content, htmlContent);
  }

  /**
   * 生成下载报告（用于前端显示）
   * @param {Object} batchResult - 批次下载结果
   * @param {Array} videos - 视频列表
   */
  generateDownloadReport(batchResult, videos) {
    const { total, completed, failed } = batchResult;
    
    const successVideos = videos.filter(v => v.download_status === 'completed');
    const failedVideos = videos.filter(v => v.download_status === 'failed');
    
    let totalVideoSize = 0;
    let totalAudioSize = 0;
    let totalDuration = 0;
    
    successVideos.forEach(v => {
      totalVideoSize += v.video_file_size || 0;
      totalAudioSize += v.audio_file_size || 0;
      totalDuration += v.duration || 0;
    });

    return {
      summary: {
        total,
        completed,
        failed,
        successRate: Math.round(completed / total * 100),
        totalVideoSize: this.formatFileSize(totalVideoSize),
        totalAudioSize: this.formatFileSize(totalAudioSize),
        totalSize: this.formatFileSize(totalVideoSize + totalAudioSize),
        totalDuration: this.formatVideoDuration(totalDuration)
      },
      successVideos: successVideos.map(v => ({
        id: v.id,
        title: v.title || v.filename,
        filename: v.filename,
        videoFormat: v.video_format,
        audioFormat: v.audio_format,
        duration: this.formatVideoDuration(v.duration),
        videoSize: this.formatFileSize(v.video_file_size),
        audioSize: this.formatFileSize(v.audio_file_size),
        totalSize: this.formatFileSize((v.video_file_size || 0) + (v.audio_file_size || 0)),
        videoPath: v.video_path,
        audioPath: v.audio_path,
        downloadedAt: this.formatTime(v.download_completed_at)
      })),
      failedVideos: failedVideos.map(v => ({
        id: v.id,
        title: v.title || v.filename,
        url: v.video_url,
        error: v.error_message
      }))
    };
  }
}

module.exports = DownloaderNotificationService;
