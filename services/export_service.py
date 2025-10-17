"""
数据导出服务
"""
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import json
from loguru import logger
import sys

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import EXPORT_DIR, EXPORT_FORMATS
from models.text_image_record import TextImageRecord

class ExportService:
    """数据导出服务"""
    
    def __init__(self):
        self.export_dir = Path(EXPORT_DIR)
        self.export_dir.mkdir(parents=True, exist_ok=True)
    
    def export_records(self, records: List[Dict[str, Any]], format_type: str, 
                      filename: str = None) -> Dict[str, Any]:
        """
        导出记录数据
        
        Args:
            records: 记录列表
            format_type: 导出格式 (excel, html, txt, markdown)
            filename: 自定义文件名（可选）
            
        Returns:
            Dict: 导出结果
        """
        try:
            if format_type not in EXPORT_FORMATS:
                raise ValueError(f"不支持的导出格式: {format_type}")
            
            if not records:
                raise ValueError("没有数据可导出")
            
            # 生成文件名
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"text2image_export_{timestamp}"
            
            # 根据格式调用对应的导出方法
            export_methods = {
                'excel': self._export_to_excel,
                'html': self._export_to_html,
                'txt': self._export_to_txt,
                'markdown': self._export_to_markdown
            }
            
            return export_methods[format_type](records, filename)
            
        except Exception as e:
            logger.error(f"❌ 导出数据失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'导出失败: {str(e)}'
            }
    
    def _export_to_excel(self, records: List[Dict[str, Any]], filename: str) -> Dict[str, Any]:
        """导出为Excel格式"""
        try:
            # 准备数据
            data = []
            for record in records:
                data.append({
                    'ID': record['id'],
                    '文本内容': record['text_content'],
                    '图片文件名': record['image_filename'],
                    '图片大小(KB)': round(record['image_size'] / 1024, 2) if record['image_size'] else 0,
                    '图片尺寸': f"{record['image_width']}x{record['image_height']}" if record['image_width'] else 'N/A',
                    '生成时间(秒)': record['generation_time'] or 0,
                    '模型名称': record['model_name'],
                    '状态': record['status'],
                    '创建时间': record['created_at'].strftime('%Y-%m-%d %H:%M:%S') if record['created_at'] else '',
                    '输出目录': record['output_directory']
                })
            
            # 创建DataFrame
            df = pd.DataFrame(data)
            
            # 生成文件路径
            file_path = self.export_dir / f"{filename}.xlsx"
            
            # 导出Excel
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='文本转图片记录', index=False)
                
                # 获取工作表并设置样式
                worksheet = writer.sheets['文本转图片记录']
                
                # 设置列宽
                column_widths = {
                    'A': 8,   # ID
                    'B': 50,  # 文本内容
                    'C': 25,  # 图片文件名
                    'D': 15,  # 图片大小
                    'E': 15,  # 图片尺寸
                    'F': 15,  # 生成时间
                    'G': 20,  # 模型名称
                    'H': 10,  # 状态
                    'I': 20,  # 创建时间
                    'J': 30   # 输出目录
                }
                
                for col, width in column_widths.items():
                    worksheet.column_dimensions[col].width = width
            
            logger.info(f"✅ Excel导出成功: {file_path}")
            
            return {
                'success': True,
                'file_path': str(file_path),
                'filename': f"{filename}.xlsx",
                'format': 'excel',
                'record_count': len(records),
                'message': f'成功导出 {len(records)} 条记录到Excel文件'
            }
            
        except Exception as e:
            logger.error(f"❌ Excel导出失败: {e}")
            raise
    
    def _export_to_html(self, records: List[Dict[str, Any]], filename: str) -> Dict[str, Any]:
        """导出为HTML格式"""
        try:
            # 生成统计信息
            total_count = len(records)
            completed_count = sum(1 for r in records if r['status'] == 'completed')
            total_size = sum(r['image_size'] or 0 for r in records)
            
            # HTML模板
            html_content = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文本转图片记录导出</title>
    <style>
        body {{
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 20px;
        }}
        .header h1 {{
            color: #333;
            margin-bottom: 10px;
        }}
        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}
        .stat-value {{
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .stat-label {{
            font-size: 0.9em;
            opacity: 0.9;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }}
        tr:nth-child(even) {{
            background-color: #f2f2f2;
        }}
        tr:hover {{
            background-color: #e8f5e8;
        }}
        .status {{
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }}
        .status-completed {{
            background-color: #d4edda;
            color: #155724;
        }}
        .status-failed {{
            background-color: #f8d7da;
            color: #721c24;
        }}
        .status-generating {{
            background-color: #d1ecf1;
            color: #0c5460;
        }}
        .text-content {{
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 文本转图片记录导出</h1>
            <p>导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">{total_count}</div>
                <div class="stat-label">总记录数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{completed_count}</div>
                <div class="stat-label">成功生成</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{round(total_size / 1024 / 1024, 1)}MB</div>
                <div class="stat-label">总文件大小</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{round(completed_count / total_count * 100, 1) if total_count > 0 else 0}%</div>
                <div class="stat-label">成功率</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>文本内容</th>
                    <th>图片文件名</th>
                    <th>图片大小</th>
                    <th>生成时间</th>
                    <th>状态</th>
                    <th>创建时间</th>
                </tr>
            </thead>
            <tbody>
"""
            
            # 添加数据行
            for record in records:
                status_class = f"status-{record['status']}"
                image_size_kb = round(record['image_size'] / 1024, 1) if record['image_size'] else 0
                generation_time = f"{record['generation_time']:.2f}s" if record['generation_time'] else 'N/A'
                created_at = record['created_at'].strftime('%Y-%m-%d %H:%M:%S') if record['created_at'] else ''
                
                html_content += f"""
                <tr>
                    <td>{record['id']}</td>
                    <td class="text-content" title="{record['text_content']}">{record['text_content']}</td>
                    <td>{record['image_filename']}</td>
                    <td>{image_size_kb} KB</td>
                    <td>{generation_time}</td>
                    <td><span class="status {status_class}">{record['status']}</span></td>
                    <td>{created_at}</td>
                </tr>
"""
            
            html_content += """
            </tbody>
        </table>
        
        <div class="footer">
            <p>📱 由AI文本转图片工具生成</p>
        </div>
    </div>
</body>
</html>
"""
            
            # 保存文件
            file_path = self.export_dir / f"{filename}.html"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            logger.info(f"✅ HTML导出成功: {file_path}")
            
            return {
                'success': True,
                'file_path': str(file_path),
                'filename': f"{filename}.html",
                'format': 'html',
                'record_count': len(records),
                'message': f'成功导出 {len(records)} 条记录到HTML文件'
            }
            
        except Exception as e:
            logger.error(f"❌ HTML导出失败: {e}")
            raise
    
    def _export_to_txt(self, records: List[Dict[str, Any]], filename: str) -> Dict[str, Any]:
        """导出为TXT格式"""
        try:
            content = []
            content.append("=" * 60)
            content.append("文本转图片记录导出")
            content.append("=" * 60)
            content.append(f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            content.append(f"记录总数: {len(records)}")
            content.append("")
            
            for i, record in enumerate(records, 1):
                content.append(f"记录 {i}:")
                content.append(f"  ID: {record['id']}")
                content.append(f"  文本内容: {record['text_content']}")
                content.append(f"  图片文件名: {record['image_filename']}")
                content.append(f"  图片大小: {round(record['image_size'] / 1024, 1) if record['image_size'] else 0} KB")
                content.append(f"  生成时间: {record['generation_time']:.2f}s" if record['generation_time'] else "  生成时间: N/A")
                content.append(f"  状态: {record['status']}")
                content.append(f"  创建时间: {record['created_at'].strftime('%Y-%m-%d %H:%M:%S') if record['created_at'] else 'N/A'}")
                content.append(f"  输出目录: {record['output_directory']}")
                content.append("-" * 40)
            
            # 保存文件
            file_path = self.export_dir / f"{filename}.txt"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(content))
            
            logger.info(f"✅ TXT导出成功: {file_path}")
            
            return {
                'success': True,
                'file_path': str(file_path),
                'filename': f"{filename}.txt",
                'format': 'txt',
                'record_count': len(records),
                'message': f'成功导出 {len(records)} 条记录到TXT文件'
            }
            
        except Exception as e:
            logger.error(f"❌ TXT导出失败: {e}")
            raise
    
    def _export_to_markdown(self, records: List[Dict[str, Any]], filename: str) -> Dict[str, Any]:
        """导出为Markdown格式"""
        try:
            content = []
            content.append("# 🎨 文本转图片记录导出")
            content.append("")
            content.append(f"**导出时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            content.append(f"**记录总数**: {len(records)}")
            content.append("")
            
            # 统计信息
            completed_count = sum(1 for r in records if r['status'] == 'completed')
            total_size = sum(r['image_size'] or 0 for r in records)
            
            content.append("## 📊 统计信息")
            content.append("")
            content.append("| 指标 | 数值 |")
            content.append("|------|------|")
            content.append(f"| 总记录数 | {len(records)} |")
            content.append(f"| 成功生成 | {completed_count} |")
            content.append(f"| 成功率 | {round(completed_count / len(records) * 100, 1) if len(records) > 0 else 0}% |")
            content.append(f"| 总文件大小 | {round(total_size / 1024 / 1024, 1)} MB |")
            content.append("")
            
            # 记录列表
            content.append("## 📋 详细记录")
            content.append("")
            content.append("| ID | 文本内容 | 图片文件名 | 大小(KB) | 生成时间(s) | 状态 | 创建时间 |")
            content.append("|----|---------|-----------|---------|-----------|----- |----------|")
            
            for record in records:
                text_preview = record['text_content'][:50] + "..." if len(record['text_content']) > 50 else record['text_content']
                text_preview = text_preview.replace('|', '\\|')  # 转义表格分隔符
                
                image_size_kb = round(record['image_size'] / 1024, 1) if record['image_size'] else 0
                generation_time = f"{record['generation_time']:.2f}" if record['generation_time'] else 'N/A'
                created_at = record['created_at'].strftime('%Y-%m-%d %H:%M') if record['created_at'] else 'N/A'
                
                content.append(f"| {record['id']} | {text_preview} | {record['image_filename']} | {image_size_kb} | {generation_time} | {record['status']} | {created_at} |")
            
            content.append("")
            content.append("---")
            content.append("*由AI文本转图片工具生成*")
            
            # 保存文件
            file_path = self.export_dir / f"{filename}.md"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(content))
            
            logger.info(f"✅ Markdown导出成功: {file_path}")
            
            return {
                'success': True,
                'file_path': str(file_path),
                'filename': f"{filename}.md",
                'format': 'markdown',
                'record_count': len(records),
                'message': f'成功导出 {len(records)} 条记录到Markdown文件'
            }
            
        except Exception as e:
            logger.error(f"❌ Markdown导出失败: {e}")
            raise
    
    def get_export_formats(self):
        """获取支持的导出格式"""
        return list(EXPORT_FORMATS.keys())
    
    def cleanup_old_exports(self, days: int = 7):
        """清理旧的导出文件"""
        try:
            from datetime import timedelta
            cutoff_time = datetime.now() - timedelta(days=days)
            
            deleted_count = 0
            for file_path in self.export_dir.glob("*"):
                if file_path.is_file():
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if file_time < cutoff_time:
                        file_path.unlink()
                        deleted_count += 1
            
            logger.info(f"✅ 清理了 {deleted_count} 个旧导出文件")
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ 清理导出文件失败: {e}")
            return 0

# 创建全局导出服务实例
export_service = ExportService()

def get_export_service():
    """获取导出服务实例"""
    return export_service

if __name__ == "__main__":
    # 测试导出服务
    service = get_export_service()
    print("支持的导出格式:", service.get_export_formats())
    
    # 获取一些测试数据
    records = TextImageRecord.get_all(limit=5)
    if records:
        print(f"测试导出 {len(records)} 条记录...")
        
        # 测试导出为Excel
        result = service.export_records(records, 'excel', 'test_export')
        print("Excel导出结果:", result)
    else:
        print("没有数据可供测试导出")