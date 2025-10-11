// Export Service - Export video list to different formats
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const { marked } = require('marked');
const pdf = require('html-pdf-node');

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
    // 确保输入是有效数字
    const numBytes = parseFloat(bytes);
    if (!numBytes || isNaN(numBytes) || numBytes <= 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(numBytes) / Math.log(1024)), sizes.length - 1);
    const value = numBytes / Math.pow(1024, i);
    
    return `${Math.round(value * 100) / 100} ${sizes[i]}`;
  }

  // 格式化时长
  formatDuration(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
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

  // HTML 转义
  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 导出为 Excel
  async exportToExcel(videos, filters = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('视频列表', {
      properties: { defaultColWidth: 20 }
    });

    // 设置列
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '文本内容', key: 'text_content', width: 50 },
      { header: '视频文件名', key: 'video_filename', width: 30 },
      { header: '视频格式', key: 'video_format', width: 15 },
      { header: '时长', key: 'duration', width: 15 },
      { header: '文件大小', key: 'file_size', width: 15 },
      { header: '创建日期', key: 'created_at', width: 25 }
    ];

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 添加数据
    videos.forEach(video => {
      worksheet.addRow({
        id: video.id,
        text_content: video.text_content || '',
        video_filename: video.video_filename || 'N/A',
        video_format: video.video_format || 'N/A',
        duration: this.formatDuration(video.video_duration),
        file_size: this.formatFileSize(video.video_file_size),
        created_at: this.formatDate(video.created_at)
      });
    });

    // 设置数据行样式
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle', wrapText: true };
        row.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    });

    // 保存文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `video_list_${timestamp}.xlsx`;
    const filepath = path.join(this.exportPath, filename);

    await workbook.xlsx.writeFile(filepath);
    console.log(`✅ Excel导出成功: ${filepath}`);

    return { filename, filepath };
  }

  // 导出为 HTML
  async exportToHTML(videos, filters = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `video_list_${timestamp}.html`;
    const filepath = path.join(this.exportPath, filename);

    // 确保累加时正确处理数字类型
    const totalSize = videos.reduce((sum, v) => {
      const size = parseFloat(v.video_file_size);
      return sum + (isNaN(size) ? 0 : size);
    }, 0);
    
    const totalDuration = videos.reduce((sum, v) => {
      const duration = parseFloat(v.video_duration);
      return sum + (isNaN(duration) ? 0 : duration);
    }, 0);

    const tableRows = videos.map((video, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(video.text_content).substring(0, 100)}${video.text_content.length > 100 ? '...' : ''}</td>
        <td>${this.escapeHtml(video.video_filename || 'N/A')}</td>
        <td>${this.escapeHtml(video.video_format || 'N/A')}</td>
        <td>${this.formatDuration(video.video_duration)}</td>
        <td>${this.formatFileSize(video.video_file_size)}</td>
        <td>${this.formatDate(video.created_at)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>幻灯片视频列表</title>
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
      <h1>🎬 幻灯片视频列表</h1>
      <p>导出时间: ${this.formatDate(new Date())}</p>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="label">总视频数</div>
        <div class="value">${videos.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">总文件大小</div>
        <div class="value">${this.formatFileSize(totalSize)}</div>
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
            <th>文本内容</th>
            <th>视频文件名</th>
            <th>视频格式</th>
            <th>时长</th>
            <th>文件大小</th>
            <th>创建日期</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>幻灯片视频生成器 - 导出报告</p>
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

    const totalSize = videos.reduce((sum, v) => sum + (v.video_file_size || 0), 0);
    const totalDuration = videos.reduce((sum, v) => sum + (v.video_duration || 0), 0);

    let markdown = `# 幻灯片视频列表\n\n`;
    markdown += `**导出时间**: ${this.formatDate(new Date())}\n\n`;

    markdown += `## 统计信息\n\n`;
    markdown += `- 总视频数: ${videos.length}\n`;
    markdown += `- 总文件大小: ${this.formatFileSize(totalSize)}\n`;
    markdown += `- 总时长: ${this.formatDuration(totalDuration)}\n\n`;

    markdown += `## 视频列表\n\n`;
    markdown += `| # | 文本内容 | 视频文件名 | 格式 | 时长 | 大小 | 创建日期 |\n`;
    markdown += `|---|----------|------------|------|------|------|----------|\n`;

    videos.forEach((video, index) => {
      const textContent = (video.text_content || '').substring(0, 50);
      const textDisplay = textContent + (video.text_content.length > 50 ? '...' : '');
      
      markdown += `| ${index + 1} | ${textDisplay} | `;
      markdown += `${video.video_filename || 'N/A'} | `;
      markdown += `${video.video_format || 'N/A'} | `;
      markdown += `${this.formatDuration(video.video_duration)} | `;
      markdown += `${this.formatFileSize(video.video_file_size)} | `;
      markdown += `${this.formatDate(video.created_at)} |\n`;
    });

    markdown += `\n---\n\n`;
    markdown += `*由幻灯片视频生成器生成*\n`;

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
        landscape: true,
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

  // 统一导出接口
  async export(videos, format, filters = {}) {
    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        return await this.exportToExcel(videos, filters);
      case 'html':
        return await this.exportToHTML(videos, filters);
      case 'markdown':
      case 'md':
        return await this.exportToMarkdown(videos, filters);
      case 'pdf':
        return await this.exportToPDF(videos, filters);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  // 清理旧的导出文件
  async cleanupOldExports(keepCount = 20) {
    try {
      const files = await fs.readdir(this.exportPath);
      const fileStats = await Promise.all(
        files.map(async file => ({
          name: file,
          path: path.join(this.exportPath, file),
          mtime: (await fs.stat(path.join(this.exportPath, file))).mtime
        }))
      );

      fileStats.sort((a, b) => b.mtime - a.mtime);
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
