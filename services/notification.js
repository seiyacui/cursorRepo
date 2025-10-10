// Multi-channel notification service for YouTube video downloader
const axios = require('axios');
require('dotenv').config();

class NotificationService {
  constructor() {
    // Notification credentials from environment variables
    this.config = {
      wxpusher: {
        token: process.env.WXPUSHER_TOKEN || "",
        uid: process.env.WXPUSHER_UID || ""
      },
      pushplus: {
        token: process.env.PUSHPLUS_TOKEN || ""
      },
      resend: {
        apiKey: process.env.RESEND_API_KEY || "",
        toEmail: process.env.RESEND_TO_EMAIL || ""
      },
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || "",
        chatId: process.env.TELEGRAM_CHAT_ID || ""
      }
    };
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Format time duration
  formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}小时${m}分钟${s}秒`;
    } else if (m > 0) {
      return `${m}分钟${s}秒`;
    } else {
      return `${s}秒`;
    }
  }

  // Format timestamp
  formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Send batch download completion notification
  async sendBatchDownloadNotification(results, totalTime) {
    const successCount = results.filter(r => r.status === 'completed').length;
    const errorCount = results.length - successCount;
    
    const title = `YouTube批量下载完成 - 成功: ${successCount}, 失败: ${errorCount}`;
    
    const summaryList = results.map((video, idx) => {
      const statusIcon = video.status === 'completed' ? "✅" : "❌";
      const videoSize = this.formatFileSize(video.video_size);
      const audioSize = video.audio_size ? ` + 音频${this.formatFileSize(video.audio_size)}` : '';
      return `${idx + 1}. ${statusIcon} ${video.title || video.filename}\n   格式: ${video.video_format}${video.audio_format ? ` + ${video.audio_format}` : ''}\n   大小: ${videoSize}${audioSize}`;
    });

    const totalVideoSize = results.reduce((sum, r) => sum + (r.video_size || 0), 0);
    const totalAudioSize = results.reduce((sum, r) => sum + (r.audio_size || 0), 0);

    const content = `### YouTube批量下载报告

📊 **下载统计**:
- 总计视频: ${results.length}
- 成功: ✅ ${successCount}
- 失败: ❌ ${errorCount}
- 视频总大小: ${this.formatFileSize(totalVideoSize)}
- 音频总大小: ${this.formatFileSize(totalAudioSize)}
- 总耗时: ${totalTime.toFixed(2)} 秒

📝 **下载详情**:
${summaryList.join('\n\n')}

---
*由YouTube批量下载器自动发送*`;

    const htmlContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    await this.sendNotifications(title, content, htmlContent);
  }

  // Send single video download notification
  async sendVideoDownloadNotification(video) {
    const isSuccess = video.status === 'completed';
    const statusIcon = isSuccess ? "✅" : "❌";
    const statusText = isSuccess ? "成功" : "失败";
    
    const title = `视频下载${statusText} - ${video.title || video.filename}`;
    
    let content = `### 视频下载报告

**视频标题**: ${video.title || '未知'}
**下载状态**: ${statusIcon} ${statusText}
**视频格式**: ${video.video_format}
**音频格式**: ${video.audio_format || '未下载'}
**视频大小**: ${this.formatFileSize(video.video_size)}
**音频大小**: ${this.formatFileSize(video.audio_size)}
**视频时长**: ${this.formatDuration(video.duration)}
**完成时间**: ${this.formatTime(video.completed_at)}`;

    if (!isSuccess && video.error_message) {
      content += `\n**错误信息**: ${video.error_message}`;
    }

    content += `\n\n---\n*由YouTube批量下载器自动发送*`;

    const htmlContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    await this.sendNotifications(title, content, htmlContent);
  }

  // Core notification sending function
  async sendNotifications(title, content, htmlContent) {
    console.log('📢 开始发送通知...');

    const notifications = [
      {
        name: 'WxPusher',
        url: 'https://wxpusher.zjiecode.com/api/send/message',
        headers: { 'Content-Type': 'application/json' },
        data: {
          appToken: this.config.wxpusher.token,
          content: content,
          summary: title,
          contentType: 3, // Markdown
          uids: [this.config.wxpusher.uid],
        },
        enabled: this.config.wxpusher.token && this.config.wxpusher.uid
      },
      {
        name: 'PushPlus',
        url: 'http://www.pushplus.plus/send',
        headers: { 'Content-Type': 'application/json' },
        data: {
          token: this.config.pushplus.token,
          title: title,
          content: content,
          template: "markdown",
        },
        enabled: this.config.pushplus.token
      },
      {
        name: 'Resend Email',
        url: 'https://api.resend.com/emails',
        headers: {
          'Authorization': `Bearer ${this.config.resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          from: 'onboarding@resend.dev',
          to: this.config.resend.toEmail,
          subject: title,
          html: htmlContent,
        },
        enabled: this.config.resend.apiKey && this.config.resend.toEmail
      },
      {
        name: 'Telegram',
        url: `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`,
        headers: { 'Content-Type': 'application/json' },
        data: {
          chat_id: this.config.telegram.chatId,
          text: content.replace(/### /g, '').replace(/\*\*(.*?)\*\*/g, '*$1*'),
          parse_mode: 'Markdown'
        },
        enabled: this.config.telegram.botToken && this.config.telegram.chatId
      },
    ];

    const promises = notifications.map(async (notification) => {
      if (!notification.enabled) {
        console.log(`🟡 跳过 ${notification.name}，配置信息不完整。`);
        return { name: notification.name, status: 'skipped' };
      }

      try {
        const response = await axios.post(
          notification.url,
          notification.data,
          {
            headers: notification.headers,
            timeout: 10000 // 10 seconds timeout
          }
        );

        console.log(`✅ ${notification.name} 通知发送成功, 状态码: ${response.status}`);
        return { name: notification.name, status: 'success', statusCode: response.status };
      } catch (error) {
        console.error(`❌ 发送 ${notification.name} 通知失败:`, error.message);
        return { name: notification.name, status: 'failed', error: error.message };
      }
    });

    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    
    console.log(`📊 通知发送完成: 成功 ${successCount}, 失败 ${failedCount}, 跳过 ${skippedCount}`);
    return results;
  }
}

module.exports = NotificationService;
