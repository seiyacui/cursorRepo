const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer');

class ExportService {
  constructor() {
    this.exportPath = './exports';
    fs.ensureDirSync(this.exportPath);
  }

  // 主导出方法
  async exportData(videos, format) {
    switch (format.toLowerCase()) {
      case 'html':
        return await this.exportToHTML(videos);
      case 'pdf':
        return await this.exportToPDF(videos);
      case 'markdown':
        return await this.exportToMarkdown(videos);
      case 'png':
        return await this.exportToPNG(videos);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  // 导出为HTML
  async exportToHTML(videos) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `youtube_videos_${timestamp}.html`;
    const filePath = path.join(this.exportPath, filename);

    const html = this.generateHTML(videos);
    await fs.writeFile(filePath, html, 'utf8');

    return {
      filename,
      contentType: 'text/html; charset=utf-8',
      data: html
    };
  }

  // 导出为PDF
  async exportToPDF(videos) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `youtube_videos_${timestamp}.pdf`;
    const filePath = path.join(this.exportPath, filename);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const html = this.generateHTML(videos, true); // PDF样式
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true
      });

      await fs.writeFile(filePath, pdfBuffer);

      return {
        filename,
        contentType: 'application/pdf',
        data: pdfBuffer
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // 导出为Markdown
  async exportToMarkdown(videos) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `youtube_videos_${timestamp}.md`;
    const filePath = path.join(this.exportPath, filename);

    const markdown = this.generateMarkdown(videos);
    await fs.writeFile(filePath, markdown, 'utf8');

    return {
      filename,
      contentType: 'text/markdown; charset=utf-8',
      data: markdown
    };
  }

  // 导出为PNG图片
  async exportToPNG(videos) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `youtube_videos_${timestamp}.png`;
    const filePath = path.join(this.exportPath, filename);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const html = this.generateHTML(videos, false, true); // PNG样式
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.setViewport({ width: 1200, height: 800 });
      
      const pngBuffer = await page.screenshot({
        fullPage: true,
        type: 'png'
      });

      await fs.writeFile(filePath, pngBuffer);

      return {
        filename,
        contentType: 'image/png',
        data: pngBuffer
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // 生成HTML内容
  generateHTML(videos, isPDF = false, isPNG = false) {
    const stats = this.calculateStats(videos);
    const currentDate = new Date().toLocaleString('zh-CN');

    const styles = isPDF ? this.getPDFStyles() : (isPNG ? this.getPNGStyles() : this.getHTMLStyles());

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube视频下载报告</title>
    <style>${styles}</style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🎬 YouTube视频下载报告</h1>
            <p class="subtitle">生成时间: ${currentDate}</p>
        </header>

        <section class="stats">
            <h2>📊 统计概览</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalVideos}</div>
                    <div class="stat-label">总视频数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.completedVideos}</div>
                    <div class="stat-label">已完成</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.failedVideos}</div>
                    <div class="stat-label">失败</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatFileSize(stats.totalSize)}</div>
                    <div class="stat-label">总大小</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatDuration(stats.totalDuration)}</div>
                    <div class="stat-label">总时长</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatDuration(stats.avgDuration)}</div>
                    <div class="stat-label">平均时长</div>
                </div>
            </div>
        </section>

        <section class="video-list">
            <h2>📋 视频列表</h2>
            <div class="table-container">
                <table class="video-table">
                    <thead>
                        <tr>
                            <th>序号</th>
                            <th>标题</th>
                            <th>上传者</th>
                            <th>格式</th>
                            <th>时长</th>
                            <th>大小</th>
                            <th>状态</th>
                            <th>创建时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${videos.map((video, index) => `
                            <tr class="video-row ${video.status}">
                                <td>${index + 1}</td>
                                <td class="title-cell">
                                    <div class="video-title">${this.escapeHtml(video.title || video.filename || 'Unknown')}</div>
                                </td>
                                <td>${this.escapeHtml(video.uploader || 'Unknown')}</td>
                                <td>
                                    <div class="format-info">
                                        <span class="video-format">${(video.video_format || '').toUpperCase()}</span>
                                        ${video.audio_format ? `<br><small class="audio-format">${video.audio_format.toUpperCase()}</small>` : ''}
                                    </div>
                                </td>
                                <td>${this.formatDuration(video.duration)}</td>
                                <td>
                                    <div class="size-info">
                                        <div>视频: ${this.formatFileSize(video.video_file_size)}</div>
                                        ${video.audio_file_size ? `<div><small>音频: ${this.formatFileSize(video.audio_file_size)}</small></div>` : ''}
                                    </div>
                                </td>
                                <td>
                                    <span class="status-badge status-${video.status}">${this.getStatusText(video.status)}</span>
                                </td>
                                <td class="date-cell">${new Date(video.created_at).toLocaleString('zh-CN')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <footer class="footer">
            <p>📱 由YouTube批量下载器生成 | 🕒 ${currentDate}</p>
        </footer>
    </div>
</body>
</html>`;
  }

  // 生成Markdown内容
  generateMarkdown(videos) {
    const stats = this.calculateStats(videos);
    const currentDate = new Date().toLocaleString('zh-CN');

    let markdown = `# 🎬 YouTube视频下载报告

> 生成时间: ${currentDate}

## 📊 统计概览

| 指标 | 数值 |
|------|------|
| 总视频数 | ${stats.totalVideos} |
| 已完成 | ${stats.completedVideos} |
| 失败 | ${stats.failedVideos} |
| 总大小 | ${this.formatFileSize(stats.totalSize)} |
| 总时长 | ${this.formatDuration(stats.totalDuration)} |
| 平均时长 | ${this.formatDuration(stats.avgDuration)} |

## 📋 视频列表

| 序号 | 标题 | 上传者 | 格式 | 时长 | 大小 | 状态 | 创建时间 |
|------|------|--------|------|------|------|------|----------|
`;

    videos.forEach((video, index) => {
      const title = (video.title || video.filename || 'Unknown').replace(/\|/g, '\\|');
      const uploader = (video.uploader || 'Unknown').replace(/\|/g, '\\|');
      const format = video.video_format ? video.video_format.toUpperCase() : '-';
      const audioFormat = video.audio_format ? ` + ${video.audio_format.toUpperCase()}` : '';
      const duration = this.formatDuration(video.duration);
      const videoSize = this.formatFileSize(video.video_file_size);
      const audioSize = video.audio_file_size ? ` + ${this.formatFileSize(video.audio_file_size)}` : '';
      const status = this.getStatusText(video.status);
      const createdAt = new Date(video.created_at).toLocaleString('zh-CN');

      markdown += `| ${index + 1} | ${title} | ${uploader} | ${format}${audioFormat} | ${duration} | ${videoSize}${audioSize} | ${status} | ${createdAt} |\n`;
    });

    markdown += `\n---\n\n📱 由YouTube批量下载器生成 | 🕒 ${currentDate}\n`;

    return markdown;
  }

  // 计算统计数据
  calculateStats(videos) {
    const totalVideos = videos.length;
    const completedVideos = videos.filter(v => v.status === 'completed').length;
    const failedVideos = videos.filter(v => v.status === 'failed').length;
    
    const totalVideoSize = videos.reduce((sum, v) => sum + (v.video_file_size || 0), 0);
    const totalAudioSize = videos.reduce((sum, v) => sum + (v.audio_file_size || 0), 0);
    const totalSize = totalVideoSize + totalAudioSize;
    
    const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
    const avgDuration = totalVideos > 0 ? totalDuration / totalVideos : 0;

    return {
      totalVideos,
      completedVideos,
      failedVideos,
      totalSize,
      totalDuration,
      avgDuration
    };
  }

  // HTML样式
  getHTMLStyles() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; margin-bottom: 30px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .header h1 { font-size: 2.5rem; margin-bottom: 10px; color: #2c3e50; }
      .subtitle { color: #666; font-size: 1.1rem; }
      .stats { margin-bottom: 30px; background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .stats h2 { margin-bottom: 20px; color: #2c3e50; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; }
      .stat-card { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db; }
      .stat-value { font-size: 2rem; font-weight: bold; color: #3498db; margin-bottom: 5px; }
      .stat-label { font-size: 0.9rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .video-list { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .video-list h2 { margin-bottom: 20px; color: #2c3e50; }
      .table-container { overflow-x: auto; }
      .video-table { width: 100%; border-collapse: collapse; }
      .video-table th, .video-table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #eee; }
      .video-table th { background: #f8f9fa; font-weight: 600; color: #555; }
      .video-table tr:hover { background: #f8f9fa; }
      .title-cell { max-width: 300px; }
      .video-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .format-info, .size-info { font-size: 0.9rem; }
      .video-format { font-weight: 600; color: #3498db; }
      .audio-format { color: #27ae60; }
      .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
      .status-completed { background: #d4edda; color: #155724; }
      .status-failed { background: #f8d7da; color: #721c24; }
      .status-downloading { background: #d1ecf1; color: #0c5460; }
      .status-pending { background: #fff3cd; color: #856404; }
      .date-cell { font-size: 0.9rem; color: #666; }
      .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 0.9rem; }
    `;
  }

  // PDF样式
  getPDFStyles() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.4; color: #333; font-size: 12px; }
      .container { padding: 10px; }
      .header { text-align: center; margin-bottom: 20px; }
      .header h1 { font-size: 24px; margin-bottom: 8px; color: #2c3e50; }
      .subtitle { color: #666; font-size: 14px; }
      .stats { margin-bottom: 20px; }
      .stats h2 { margin-bottom: 15px; color: #2c3e50; font-size: 18px; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
      .stat-card { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #3498db; }
      .stat-value { font-size: 18px; font-weight: bold; color: #3498db; margin-bottom: 3px; }
      .stat-label { font-size: 10px; color: #666; text-transform: uppercase; }
      .video-list h2 { margin-bottom: 15px; color: #2c3e50; font-size: 18px; }
      .video-table { width: 100%; border-collapse: collapse; font-size: 10px; }
      .video-table th, .video-table td { padding: 8px 4px; text-align: left; border-bottom: 1px solid #ddd; }
      .video-table th { background: #f8f9fa; font-weight: 600; color: #555; }
      .title-cell { max-width: 200px; }
      .video-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .status-badge { padding: 2px 6px; border-radius: 8px; font-size: 8px; font-weight: 600; text-transform: uppercase; }
      .status-completed { background: #d4edda; color: #155724; }
      .status-failed { background: #f8d7da; color: #721c24; }
      .status-downloading { background: #d1ecf1; color: #0c5460; }
      .status-pending { background: #fff3cd; color: #856404; }
      .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
    `;
  }

  // PNG样式
  getPNGStyles() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
      .container { background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
      .header { text-align: center; margin-bottom: 25px; }
      .header h1 { font-size: 28px; margin-bottom: 8px; color: #2c3e50; }
      .subtitle { color: #666; font-size: 16px; }
      .stats { margin-bottom: 25px; }
      .stats h2 { margin-bottom: 18px; color: #2c3e50; font-size: 20px; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
      .stat-card { text-align: center; padding: 18px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 10px; border-left: 4px solid #3498db; }
      .stat-value { font-size: 22px; font-weight: bold; color: #3498db; margin-bottom: 5px; }
      .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .video-list h2 { margin-bottom: 18px; color: #2c3e50; font-size: 20px; }
      .video-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .video-table th, .video-table td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #eee; }
      .video-table th { background: #f8f9fa; font-weight: 600; color: #555; }
      .video-table tr:nth-child(even) { background: #f9f9f9; }
      .title-cell { max-width: 250px; }
      .video-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
      .status-completed { background: #d4edda; color: #155724; }
      .status-failed { background: #f8d7da; color: #721c24; }
      .status-downloading { background: #d1ecf1; color: #0c5460; }
      .status-pending { background: #fff3cd; color: #856404; }
      .footer { text-align: center; margin-top: 25px; font-size: 14px; color: #666; }
    `;
  }

  // 辅助方法
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
  }

  getStatusText(status) {
    const statusMap = {
      'pending': '等待中',
      'downloading': '下载中',
      'completed': '已完成',
      'failed': '失败'
    };
    return statusMap[status] || status;
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

module.exports = ExportService;