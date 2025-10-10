const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

class ExportService {
  constructor() {
    this.exportPath = path.join(process.cwd(), 'exports');
    this.ensureExportDirectory();
  }

  async ensureExportDirectory() {
    try {
      await fs.mkdir(this.exportPath, { recursive: true });
    } catch (error) {
      console.error('创建导出目录失败:', error);
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }

  /**
   * 格式化时长
   */
  formatDuration(seconds) {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 生成 HTML 表格
   */
  generateHTMLTable(videos) {
    const rows = videos.map((video, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(video.title || video.filename || '-')}</td>
        <td>${video.video_format || '-'}</td>
        <td>${video.audio_format || '-'}</td>
        <td>${this.formatDuration(video.duration)}</td>
        <td>${this.formatFileSize(video.video_size)}</td>
        <td>${this.formatFileSize(video.audio_size)}</td>
        <td>${this.formatDate(video.created_at)}</td>
        <td><span class="status ${video.download_status}">${video.download_status}</span></td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>视频下载列表</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Microsoft YaHei', Arial, sans-serif;
      padding: 20px;
      background: #f5f7fa;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 20px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
    }
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #f8f9fa;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e9ecef;
    }
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #e9ecef;
      color: #666;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .status.completed {
      background: #d4edda;
      color: #155724;
    }
    .status.downloading {
      background: #cce5ff;
      color: #004085;
    }
    .status.pending {
      background: #fff3cd;
      color: #856404;
    }
    .status.failed {
      background: #f8d7da;
      color: #721c24;
    }
    .footer {
      padding: 20px;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📹 YouTube视频下载列表</h1>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">${videos.length}</div>
          <div class="stat-label">总数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${videos.filter(v => v.download_status === 'completed').length}</div>
          <div class="stat-label">完成</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${this.formatFileSize(videos.reduce((sum, v) => sum + (v.video_size || 0) + (v.audio_size || 0), 0))}</div>
          <div class="stat-label">总大小</div>
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>文件名</th>
          <th>视频格式</th>
          <th>音频格式</th>
          <th>时长</th>
          <th>视频大小</th>
          <th>音频大小</th>
          <th>创建日期</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="footer">
      导出时间: ${this.formatDate(new Date())} | YouTube视频下载管理器
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * 导出为 HTML
   */
  async exportHTML(videos, filename) {
    const html = this.generateHTMLTable(videos);
    const filepath = path.join(this.exportPath, filename);
    await fs.writeFile(filepath, html, 'utf-8');
    return filepath;
  }

  /**
   * 导出为 PDF
   */
  async exportPDF(videos, filename) {
    const html = this.generateHTMLTable(videos);
    const pdfPath = path.join(this.exportPath, filename);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: pdfPath,
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

    await browser.close();
    return pdfPath;
  }

  /**
   * 导出为 Markdown
   */
  async exportMarkdown(videos, filename) {
    let markdown = `# 📹 YouTube视频下载列表\n\n`;
    markdown += `**导出时间**: ${this.formatDate(new Date())}\n\n`;
    markdown += `**统计信息**:\n`;
    markdown += `- 总数: ${videos.length}\n`;
    markdown += `- 完成: ${videos.filter(v => v.download_status === 'completed').length}\n`;
    markdown += `- 总大小: ${this.formatFileSize(videos.reduce((sum, v) => sum + (v.video_size || 0) + (v.audio_size || 0), 0))}\n\n`;
    markdown += `---\n\n`;
    markdown += `| # | 文件名 | 视频格式 | 音频格式 | 时长 | 视频大小 | 音频大小 | 创建日期 | 状态 |\n`;
    markdown += `|---|--------|----------|----------|------|----------|----------|----------|------|\n`;

    videos.forEach((video, index) => {
      markdown += `| ${index + 1} `;
      markdown += `| ${this.escapeMarkdown(video.title || video.filename || '-')} `;
      markdown += `| ${video.video_format || '-'} `;
      markdown += `| ${video.audio_format || '-'} `;
      markdown += `| ${this.formatDuration(video.duration)} `;
      markdown += `| ${this.formatFileSize(video.video_size)} `;
      markdown += `| ${this.formatFileSize(video.audio_size)} `;
      markdown += `| ${this.formatDate(video.created_at)} `;
      markdown += `| ${video.download_status} |\n`;
    });

    markdown += `\n---\n\n*由YouTube视频下载管理器生成*\n`;

    const filepath = path.join(this.exportPath, filename);
    await fs.writeFile(filepath, markdown, 'utf-8');
    return filepath;
  }

  /**
   * 导出为 PNG (截图)
   */
  async exportPNG(videos, filename) {
    const html = this.generateHTMLTable(videos);
    const pngPath = path.join(this.exportPath, filename);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // 获取内容高度
    const bodyHandle = await page.$('.container');
    const boundingBox = await bodyHandle.boundingBox();
    
    await page.setViewport({
      width: 1400,
      height: Math.ceil(boundingBox.height) + 100
    });

    await page.screenshot({
      path: pngPath,
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: 1400,
        height: Math.ceil(boundingBox.height)
      }
    });

    await browser.close();
    return pngPath;
  }

  /**
   * 转义 HTML 特殊字符
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * 转义 Markdown 特殊字符
   */
  escapeMarkdown(text) {
    return String(text).replace(/[|]/g, '\\$&');
  }

  /**
   * 统一导出接口
   */
  async export(videos, format, filename) {
    const timestamp = Date.now();
    let filepath;

    switch (format.toLowerCase()) {
      case 'html':
        filepath = await this.exportHTML(videos, filename || `export_${timestamp}.html`);
        break;
      case 'pdf':
        filepath = await this.exportPDF(videos, filename || `export_${timestamp}.pdf`);
        break;
      case 'markdown':
      case 'md':
        filepath = await this.exportMarkdown(videos, filename || `export_${timestamp}.md`);
        break;
      case 'png':
        filepath = await this.exportPNG(videos, filename || `export_${timestamp}.png`);
        break;
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }

    const stats = await fs.stat(filepath);
    
    return {
      format,
      filepath,
      filename: path.basename(filepath),
      size: stats.size
    };
  }
}

module.exports = ExportService;
