const NotificationService = require('../notification');

class NotificationAdapter {
  constructor() {
    this.notificationService = new NotificationService();
  }
  
  formatFileSize(bytes) {
    return this.notificationService.formatFileSize(bytes);
  }
  
  formatTime(timestamp) {
    return this.notificationService.formatTime(timestamp);
  }
  
  formatVideoDuration(seconds) {
    return this.notificationService.formatVideoDuration(seconds);
  }
  
  // Send batch download completion notification
  async sendBatchDownloadNotification(results, totalTime) {
    const successCount = results.filter(r => r.status === 'completed').length;
    const errorCount = results.length - successCount;
    
    const title = `📹 YouTube视频批量下载完成 - 成功: ${successCount}, 失败: ${errorCount}`;
    
    const summaryList = results.map((record, idx) => {
      const statusIcon = record.status === 'completed' ? "✅" : "❌";
      const videoSize = this.formatFileSize(record.video_size || 0);
      const audioSize = this.formatFileSize(record.audio_size || 0);
      const duration = this.formatVideoDuration(record.duration || 0);
      return `${idx + 1}. ${statusIcon} ${record.title || record.filename} - ${duration} - 视频:${videoSize} 音频:${audioSize}`;
    });
    
    const totalVideoSize = results.reduce((sum, r) => sum + (r.video_size || 0), 0);
    const totalAudioSize = results.reduce((sum, r) => sum + (r.audio_size || 0), 0);
    
    const content = `### YouTube视频批量下载报告

📊 **下载统计**:
- **总计视频**: ${results.length}
- **成功**: ✅ ${successCount}
- **失败**: ❌ ${errorCount}
- **总视频大小**: ${this.formatFileSize(totalVideoSize)}
- **总音频大小**: ${this.formatFileSize(totalAudioSize)}
- **总耗时**: ${totalTime.toFixed(2)} 秒

---
📝 **下载详情**:
${summaryList.join('\n')}

${successCount > 0 ? '\n🎉 下载的视频已保存到服务器，可通过Web界面查看和下载。' : ''}

---
*由YouTube视频批量下载器自动发送*`;
    
    const htmlContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    try {
      await this.notificationService.sendNotifications(title, content, htmlContent);
      console.log('✅ 批量下载通知发送成功');
    } catch (error) {
      console.error('❌ 批量下载通知发送失败:', error);
    }
  }
  
  // Send single video download notification
  async sendVideoDownloadNotification(videoRecord) {
    const isSuccess = videoRecord.status === 'completed';
    const statusIcon = isSuccess ? "✅" : "❌";
    const statusText = isSuccess ? "成功" : "失败";
    
    const title = `视频下载${statusText} - ${videoRecord.title || videoRecord.filename}`;
    
    let content = `### YouTube视频下载报告

**视频信息**: ${videoRecord.title || videoRecord.filename}
**下载状态**: ${statusIcon} ${statusText}
**视频格式**: ${videoRecord.video_format || 'N/A'}
**音频格式**: ${videoRecord.audio_format || 'N/A'}
**视频时长**: ${this.formatVideoDuration(videoRecord.duration)}
**视频大小**: ${this.formatFileSize(videoRecord.video_size)}
**音频大小**: ${this.formatFileSize(videoRecord.audio_size)}
**创建时间**: ${this.formatTime(videoRecord.created_at)}`;
    
    if (!isSuccess && videoRecord.error_message) {
      content += `\n**错误信息**: ${videoRecord.error_message}`;
    }
    
    if (isSuccess) {
      content += `\n\n🎉 视频已保存到服务器，可通过Web界面查看和下载。`;
    }
    
    content += `\n\n---\n*由YouTube视频批量下载器自动发送*`;
    
    const htmlContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    try {
      await this.notificationService.sendNotifications(title, content, htmlContent);
      console.log('✅ 视频下载通知发送成功');
    } catch (error) {
      console.error('❌ 视频下载通知发送失败:', error);
    }
  }
}

module.exports = new NotificationAdapter();
