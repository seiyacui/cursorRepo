// Export Service - Export video list to different formats
const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');
const pdf = require('html-pdf-node');
const puppeteer = require('puppeteer');

class ExportService {
  constructor() {
    this.exportPath = './exports';
    this.ensureExportDirectory();
  }

  async ensureExportDirectory() {
    try {
      await fs.mkdir(this.exportPath, { recursive: true });
    } catch (error) {
      console.error('创建导出目录失败:', error);
    }
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // 格式化时长
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

  // 格式化日期
  formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 生成 HTML 表格
  generateHTMLTable(videos) {
    const rows = videos.map((video, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(video.title || video.filename || 'N/A')}</td>
        <td>${this.escapeHtml(video.video_format || 'N/A')}</td>
        <td>${this.escapeHtml(video.audio_format || 'N/A')}</td>
        <td>${this.formatDuration(video.duration)}</td>
        <td>${this.formatFileSize(video.video_file_size)}</td>
        <td>${this.formatFileSize(video.audio_file_size)}</td>
        <td>${this.formatDate(video.created_at)}</td>
        <td><span class="status-${video.download_status}">${this.getStatusText(video.download_status)}</span></td>
      </tr>
    `).join('');

    return rows;
  }

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending': '待下载',
      'downloading': '下载中',
      'completed': '已完成',
      'failed': '失败'
    };
    return statusMap[status] || status;
  }

  // HTML 转义
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 导出为 HTML
  async exportToHTML(videos, filters = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `video_list_${timestamp}.html`;
    const filepath = path.join(this.exportPath, filename);

    const totalVideoSize = videos.reduce((sum, v) => sum + (v.video_file_size || 0), 0);
    const totalAudioSize = videos.reduce((sum, v) => sum + (v.audio_file_size || 0), 0);
    const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube视频下载列表</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stat-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #667eea;
      margin: 10px 0;
    }
    .stat-card .label {
      font-size: 14px;
      color: #666;
    }
    .table-container {
      padding: 30px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
      position: sticky;
      top: 0;
    }
    tr:hover { background: #f8f9fa; }
    .status-completed { color: #28a745; font-weight: 600; }
    .status-failed { color: #dc3545; font-weight: 600; }
    .status-downloading { color: #ffc107; font-weight: 600; }
    .status-pending { color: #6c757d; font-weight: 600; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
      background: #f8f9fa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📹 YouTube视频下载列表</h1>
      <p>导出时间: ${this.formatDate(new Date())}</p>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="label">总视频数</div>
        <div class="value">${videos.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">总视频大小</div>
        <div class="value">${this.formatFileSize(totalVideoSize)}</div>
      </div>
      <div class="stat-card">
        <div class="label">总音频大小</div>
        <div class="value">${this.formatFileSize(totalAudioSize)}</div>
      </div>
      <div class="stat-card">
        <div class="label">总时长</div>
        <div class="value">${this.formatDuration(totalDuration)}</div>
      </div>
    </div>

    <div class="table-container">
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
          ${this.generateHTMLTable(videos)}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>YouTube视频批量下载器 - 导出报告</p>
      <p>© 2024 All Rights Reserved</p>
    </div>
  </div>
</body>
</html>`;

    await fs.writeFile(filepath, html, 'utf8');
    console.log(`✅ HTML导出成功: ${filepath}`);
    
    return { filename, filepath };
  }

  // 导出为 Markdown
  async exportToMarkdown(videos, filters = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `video_list_${timestamp}.md`;
    const filepath = path.join(this.exportPath, filename);

    const totalVideoSize = videos.reduce((sum, v) => sum + (v.video_file_size || 0), 0);
    const totalAudioSize = videos.reduce((sum, v) => sum + (v.audio_file_size || 0), 0);
    const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);

    let markdown = `# YouTube视频下载列表\n\n`;
    markdown += `**导出时间**: ${this.formatDate(new Date())}\n\n`;
    
    markdown += `## 统计信息\n\n`;
    markdown += `- 总视频数: ${videos.length}\n`;
    markdown += `- 总视频大小: ${this.formatFileSize(totalVideoSize)}\n`;
    markdown += `- 总音频大小: ${this.formatFileSize(totalAudioSize)}\n`;
    markdown += `- 总时长: ${this.formatDuration(totalDuration)}\n\n`;

    markdown += `## 视频列表\n\n`;
    markdown += `| # | 文件名 | 视频格式 | 音频格式 | 时长 | 视频大小 | 音频大小 | 创建日期 | 状态 |\n`;
    markdown += `|---|--------|----------|----------|------|----------|----------|----------|------|\n`;

    videos.forEach((video, index) => {
      markdown += `| ${index + 1} | ${video.title || video.filename || 'N/A'} | `;
      markdown += `${video.video_format || 'N/A'} | `;
      markdown += `${video.audio_format || 'N/A'} | `;
      markdown += `${this.formatDuration(video.duration)} | `;
      markdown += `${this.formatFileSize(video.video_file_size)} | `;
      markdown += `${this.formatFileSize(video.audio_file_size)} | `;
      markdown += `${this.formatDate(video.created_at)} | `;
      markdown += `${this.getStatusText(video.download_status)} |\n`;
    });

    markdown += `\n---\n\n`;
    markdown += `*由YouTube视频批量下载器生成*\n`;

    await fs.writeFile(filepath, markdown, 'utf8');
    console.log(`✅ Markdown导出成功: ${filepath}`);
    
    return { filename, filepath };
  }

  // 导出为 PDF
  async exportToPDF(videos, filters = {}) {
    try {
      // 先生成HTML
      const htmlResult = await this.exportToHTML(videos, filters);
      const htmlContent = await fs.readFile(htmlResult.filepath, 'utf8');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `video_list_${timestamp}.pdf`;
      const filepath = path.join(this.exportPath, filename);

      // 使用 html-pdf-node 转换为 PDF
      const options = { 
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true
      };
      
      const file = { content: htmlContent };
      const pdfBuffer = await pdf.generatePdf(file, options);
      
      await fs.writeFile(filepath, pdfBuffer);
      console.log(`✅ PDF导出成功: ${filepath}`);
      
      return { filename, filepath };
    } catch (error) {
      console.error('PDF导出失败:', error);
      throw new Error('PDF导出失败: ' + error.message);
    }
  }

  // 导出为 PNG (使用 Puppeteer 截图)
  async exportToPNG(videos, filters = {}) {
    try {
      // 先生成HTML
      const htmlResult = await this.exportToHTML(videos, filters);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `video_list_${timestamp}.png`;
      const filepath = path.join(this.exportPath, filename);

      // 使用 Puppeteer 生成截图
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1400, height: 900 });
      
      // 加载HTML文件
      await page.goto(`file://${path.resolve(htmlResult.filepath)}`, {
        waitUntil: 'networkidle0'
      });
      
      // 截取整个页面
      await page.screenshot({
        path: filepath,
        fullPage: true
      });
      
      await browser.close();
      
      console.log(`✅ PNG导出成功: ${filepath}`);
      
      return { filename, filepath };
    } catch (error) {
      console.error('PNG导出失败:', error);
      throw new Error('PNG导出失败: ' + error.message);
    }
  }

  // 统一导出接口
  async export(videos, format, filters = {}) {
    switch (format.toLowerCase()) {
      case 'html':
        return await this.exportToHTML(videos, filters);
      case 'markdown':
      case 'md':
        return await this.exportToMarkdown(videos, filters);
      case 'pdf':
        return await this.exportToPDF(videos, filters);
      case 'png':
        return await this.exportToPNG(videos, filters);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  // 清理旧的导出文件（保留最近N个）
  async cleanupOldExports(keepCount = 10) {
    try {
      const files = await fs.readdir(this.exportPath);
      const fileStats = await Promise.all(
        files.map(async file => ({
          name: file,
          path: path.join(this.exportPath, file),
          mtime: (await fs.stat(path.join(this.exportPath, file))).mtime
        }))
      );

      // 按修改时间排序
      fileStats.sort((a, b) => b.mtime - a.mtime);

      // 删除旧文件
      const toDelete = fileStats.slice(keepCount);
      for (const file of toDelete) {
        await fs.unlink(file.path);
        console.log(`🗑️  删除旧导出文件: ${file.name}`);
      }

      return toDelete.length;
    } catch (error) {
      console.error('清理导出文件失败:', error);
      return 0;
    }
  }
}

module.exports = ExportService;
