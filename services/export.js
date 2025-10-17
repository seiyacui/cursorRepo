const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

class ExportService {
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  
  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  // Export to HTML
  async exportToHTML(videos) {
    const rows = videos.map(video => `
      <tr>
        <td>${this.escapeHtml(video.title || video.filename || 'N/A')}</td>
        <td>${video.video_format || 'N/A'}</td>
        <td>${video.audio_format || 'N/A'}</td>
        <td>${this.formatDuration(video.duration)}</td>
        <td>${this.formatFileSize(video.video_size)}</td>
        <td>${this.formatFileSize(video.audio_size)}</td>
        <td>${this.formatDate(video.created_at)}</td>
        <td><span class="status status-${video.status}">${video.status}</span></td>
      </tr>
    `).join('');
    
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube视频下载记录</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      padding: 30px;
      background: #f5f7fa;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    }
    h1 {
      color: #303133;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .export-info {
      color: #909399;
      margin-bottom: 30px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
    }
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #ebeef5;
      color: #606266;
      font-size: 13px;
    }
    tr:hover {
      background: #f5f7fa;
    }
    .status {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-completed {
      background: #f0f9ff;
      color: #1890ff;
    }
    .status-downloading {
      background: #fff7e6;
      color: #faad14;
    }
    .status-failed {
      background: #fff1f0;
      color: #ff4d4f;
    }
    .status-pending {
      background: #f6f6f6;
      color: #666;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ebeef5;
      text-align: center;
      color: #909399;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📹 YouTube视频下载记录</h1>
    <div class="export-info">
      导出时间: ${this.formatDate(new Date())} | 总计: ${videos.length} 个视频
    </div>
    
    <table>
      <thead>
        <tr>
          <th>视频标题</th>
          <th>视频格式</th>
          <th>音频格式</th>
          <th>时长</th>
          <th>视频大小</th>
          <th>音频大小</th>
          <th>创建时间</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    
    <div class="footer">
      由 YouTube 视频批量下载器自动生成
    </div>
  </div>
</body>
</html>`;
    
    return html;
  }
  
  // Export to Markdown
  async exportToMarkdown(videos) {
    let markdown = `# 📹 YouTube视频下载记录\n\n`;
    markdown += `**导出时间**: ${this.formatDate(new Date())}  \n`;
    markdown += `**总计视频**: ${videos.length} 个\n\n`;
    markdown += `---\n\n`;
    
    markdown += `| 视频标题 | 视频格式 | 音频格式 | 时长 | 视频大小 | 音频大小 | 创建时间 | 状态 |\n`;
    markdown += `|---------|---------|---------|------|---------|---------|---------|------|\n`;
    
    videos.forEach(video => {
      markdown += `| ${video.title || video.filename || 'N/A'} `;
      markdown += `| ${video.video_format || 'N/A'} `;
      markdown += `| ${video.audio_format || 'N/A'} `;
      markdown += `| ${this.formatDuration(video.duration)} `;
      markdown += `| ${this.formatFileSize(video.video_size)} `;
      markdown += `| ${this.formatFileSize(video.audio_size)} `;
      markdown += `| ${this.formatDate(video.created_at)} `;
      markdown += `| ${video.status} |\n`;
    });
    
    markdown += `\n---\n\n`;
    markdown += `*由 YouTube 视频批量下载器自动生成*\n`;
    
    return markdown;
  }
  
  // Export to PDF
  async exportToPDF(videos) {
    const html = await this.exportToHTML(videos);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        printBackground: true
      });
      
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
  
  // Export to PNG
  async exportToPNG(videos) {
    const html = await this.exportToHTML(videos);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1400, height: 1000 });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const screenshot = await page.screenshot({
        fullPage: true,
        type: 'png'
      });
      
      return screenshot;
    } finally {
      await browser.close();
    }
  }
  
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

module.exports = new ExportService();
