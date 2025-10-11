// Export service for multiple formats (HTML, PDF, Markdown, PNG, Excel)
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const htmlPdf = require('html-pdf-node');
const XLSX = require('xlsx');

class ExporterService {
  constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
    return `${size} ${sizes[i]}`;
  }

  // Format duration
  formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Format date
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Generate HTML content
  generateHTML(videos) {
    const rows = videos.map((video, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(video.title || video.filename || 'N/A')}</td>
        <td class="url-cell"><a href="${this.escapeHtml(video.url || '#')}" target="_blank">${this.escapeHtml(video.url || 'N/A')}</a></td>
        <td>${this.escapeHtml(video.video_format || 'N/A')}</td>
        <td>${this.escapeHtml(video.audio_format || 'N/A')}</td>
        <td>${this.formatDuration(video.duration)}</td>
        <td>${this.formatFileSize(video.video_size)}</td>
        <td>${this.formatFileSize(video.audio_size)}</td>
        <td>${this.formatDate(video.created_at)}</td>
        <td><span class="status ${video.status}">${this.escapeHtml(video.status)}</span></td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube视频下载列表</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 
                   'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 2em;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 1.1em;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .summary-item {
      text-align: center;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .summary-item .value {
      font-size: 2em;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .summary-item .label {
      color: #666;
      font-size: 0.9em;
    }
    .table-container {
      padding: 30px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }
    th {
      background: #667eea;
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
    }
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #e9ecef;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .url-cell {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .url-cell a {
      color: #667eea;
      text-decoration: none;
    }
    .url-cell a:hover {
      text-decoration: underline;
    }
    .status {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status.completed {
      background: #d4edda;
      color: #155724;
    }
    .status.failed {
      background: #f8d7da;
      color: #721c24;
    }
    .status.downloading {
      background: #fff3cd;
      color: #856404;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 0.9em;
      border-top: 1px solid #e9ecef;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📹 YouTube视频下载列表</h1>
      <p>导出时间: ${this.formatDate(new Date())}</p>
    </div>
    
    <div class="summary">
      <div class="summary-item">
        <div class="value">${videos.length}</div>
        <div class="label">总视频数</div>
      </div>
      <div class="summary-item">
        <div class="value">${videos.filter(v => v.status === 'completed').length}</div>
        <div class="label">下载成功</div>
      </div>
      <div class="summary-item">
        <div class="value">${this.formatFileSize(videos.reduce((sum, v) => sum + (Number(v.video_size) || 0), 0))}</div>
        <div class="label">视频总大小</div>
      </div>
      <div class="summary-item">
        <div class="value">${this.formatFileSize(videos.reduce((sum, v) => sum + (Number(v.audio_size) || 0), 0))}</div>
        <div class="label">音频总大小</div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>文件名</th>
            <th>YouTube地址</th>
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
    </div>

    <div class="footer">
      <p>由 YouTube 批量下载器生成 | 共 ${videos.length} 条记录</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Generate Markdown content
  generateMarkdown(videos) {
    const rows = videos.map((video, index) => {
      const url = video.url || 'N/A';
      return `| ${index + 1} | ${video.title || video.filename || 'N/A'} | ${url} | ${video.video_format || 'N/A'} | ${video.audio_format || 'N/A'} | ${this.formatDuration(video.duration)} | ${this.formatFileSize(video.video_size)} | ${this.formatFileSize(video.audio_size)} | ${this.formatDate(video.created_at)} | ${video.status} |`;
    }).join('\n');

    return `# YouTube视频下载列表

**导出时间**: ${this.formatDate(new Date())}

## 统计摘要

- **总视频数**: ${videos.length}
- **下载成功**: ${videos.filter(v => v.status === 'completed').length}
- **视频总大小**: ${this.formatFileSize(videos.reduce((sum, v) => sum + (Number(v.video_size) || 0), 0))}
- **音频总大小**: ${this.formatFileSize(videos.reduce((sum, v) => sum + (Number(v.audio_size) || 0), 0))}

## 视频列表

| # | 文件名 | YouTube地址 | 视频格式 | 音频格式 | 时长 | 视频大小 | 音频大小 | 创建日期 | 状态 |
|---|--------|-------------|----------|----------|------|----------|----------|----------|------|
${rows}

---
*由 YouTube 批量下载器生成*
`;
  }

  // Export to HTML file
  async exportHTML(videos) {
    const html = this.generateHTML(videos);
    const filename = `youtube_videos_${Date.now()}.html`;
    const filepath = path.join(this.exportDir, filename);
    
    fs.writeFileSync(filepath, html, 'utf8');
    
    return {
      success: true,
      filename: filename,
      filepath: filepath,
      url: `/exports/${filename}`
    };
  }

  // Export to Markdown file
  async exportMarkdown(videos) {
    const markdown = this.generateMarkdown(videos);
    const filename = `youtube_videos_${Date.now()}.md`;
    const filepath = path.join(this.exportDir, filename);
    
    fs.writeFileSync(filepath, markdown, 'utf8');
    
    return {
      success: true,
      filename: filename,
      filepath: filepath,
      url: `/exports/${filename}`
    };
  }

  // Export to PDF file
  async exportPDF(videos) {
    const html = this.generateHTML(videos);
    const filename = `youtube_videos_${Date.now()}.pdf`;
    const filepath = path.join(this.exportDir, filename);
    
    try {
      const options = { 
        format: 'A4',
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        printBackground: true
      };
      
      const file = { content: html };
      
      await htmlPdf.generatePdf(file, options).then(pdfBuffer => {
        fs.writeFileSync(filepath, pdfBuffer);
      });
      
      return {
        success: true,
        filename: filename,
        filepath: filepath,
        url: `/exports/${filename}`
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  // Export to PNG (screenshot of HTML)
  async exportPNG(videos) {
    const puppeteer = require('puppeteer');
    const fs = require('fs');
    const html = this.generateHTML(videos);
    const filename = `youtube_videos_${Date.now()}.png`;
    const filepath = path.join(this.exportDir, filename);
    
    // Create a temporary HTML file
    const tempHtmlFile = path.join(this.exportDir, `temp_${Date.now()}.html`);
    
    let browser = null;
    let page = null;
    
    try {
      console.log('Launching browser for PNG export...');
      
      // Write HTML to temporary file
      fs.writeFileSync(tempHtmlFile, html, 'utf8');
      console.log('Temporary HTML file created');
      
      // Launch browser with optimized settings (removed --single-process)
      browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--no-first-run',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update'
        ],
        dumpio: false,
        timeout: 60000,
        protocolTimeout: 60000
      });
      
      console.log('Browser launched, creating new page...');
      page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({ 
        width: 1400, 
        height: 1000,
        deviceScaleFactor: 1
      });
      
      console.log('Loading HTML file...');
      // Navigate to the file instead of using setContent
      await page.goto(`file://${tempHtmlFile}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      console.log('Waiting for rendering...');
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Taking screenshot...');
      // Take screenshot of full page
      await page.screenshot({ 
        path: filepath, 
        fullPage: true,
        type: 'png',
        timeout: 30000,
        captureBeyondViewport: true
      });
      
      console.log('Screenshot saved, closing browser...');
      
      // Close page first
      if (page) {
        await page.close();
        page = null;
      }
      
      // Then close browser
      if (browser) {
        await browser.close();
        browser = null;
      }
      
      console.log('PNG export completed successfully');
      
      // Clean up temporary HTML file
      try {
        if (fs.existsSync(tempHtmlFile)) {
          fs.unlinkSync(tempHtmlFile);
          console.log('Temporary HTML file removed');
        }
      } catch (cleanupError) {
        console.error('Error removing temp file:', cleanupError);
      }
      
      return {
        success: true,
        filename: filename,
        filepath: filepath,
        url: `/exports/${filename}`
      };
    } catch (error) {
      console.error('PNG generation error:', error);
      console.error('Error stack:', error.stack);
      
      // Ensure resources are closed even on error
      try {
        if (page) {
          await page.close().catch(e => console.error('Error closing page:', e));
        }
      } catch (e) {
        console.error('Error in page cleanup:', e);
      }
      
      try {
        if (browser) {
          await browser.close().catch(e => console.error('Error closing browser:', e));
        }
      } catch (e) {
        console.error('Error in browser cleanup:', e);
      }
      
      // Clean up temporary HTML file
      try {
        if (fs.existsSync(tempHtmlFile)) {
          fs.unlinkSync(tempHtmlFile);
          console.log('Temporary HTML file removed');
        }
      } catch (cleanupError) {
        console.error('Error removing temp file:', cleanupError);
      }
      
      throw new Error('Failed to generate PNG: ' + error.message);
    }
  }

  // Export to Excel file
  async exportExcel(videos) {
    const filename = `youtube_videos_${Date.now()}.xlsx`;
    const filepath = path.join(this.exportDir, filename);
    
    try {
      // Prepare data for Excel
      const data = videos.map((video, index) => ({
        '序号': index + 1,
        '文件名': video.title || video.filename || 'N/A',
        'YouTube地址': video.url || 'N/A',
        '视频格式': video.video_format || 'N/A',
        '音频格式': video.audio_format || 'N/A',
        '时长': this.formatDuration(video.duration),
        '视频大小': this.formatFileSize(video.video_size),
        '音频大小': this.formatFileSize(video.audio_size),
        '创建日期': this.formatDate(video.created_at),
        '状态': video.status
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      ws['!cols'] = [
        { wch: 6 },  // 序号
        { wch: 40 }, // 文件名
        { wch: 50 }, // YouTube地址
        { wch: 12 }, // 视频格式
        { wch: 12 }, // 音频格式
        { wch: 12 }, // 时长
        { wch: 15 }, // 视频大小
        { wch: 15 }, // 音频大小
        { wch: 20 }, // 创建日期
        { wch: 12 }  // 状态
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'YouTube视频列表');

      // Add summary sheet
      const summary = [
        { '统计项目': '总视频数', '值': videos.length },
        { '统计项目': '下载成功', '值': videos.filter(v => v.status === 'completed').length },
        { '统计项目': '下载失败', '值': videos.filter(v => v.status === 'failed').length },
        { '统计项目': '视频总大小', '值': this.formatFileSize(videos.reduce((sum, v) => sum + (Number(v.video_size) || 0), 0)) },
        { '统计项目': '音频总大小', '值': this.formatFileSize(videos.reduce((sum, v) => sum + (Number(v.audio_size) || 0), 0)) },
        { '统计项目': '导出时间', '值': this.formatDate(new Date()) }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summary);
      wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, '统计摘要');

      // Write to file
      XLSX.writeFile(wb, filepath);
      
      return {
        success: true,
        filename: filename,
        filepath: filepath,
        url: `/exports/${filename}`
      };
    } catch (error) {
      console.error('Excel generation error:', error);
      throw new Error('Failed to generate Excel: ' + error.message);
    }
  }

  // Escape HTML special characters
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }
}

module.exports = ExporterService;
