"""
导出管理器 - 支持多种格式导出
"""
import os
import pandas as pd
from datetime import datetime
from typing import List

class ExportManager:
    """导出管理类"""
    
    @staticmethod
    def format_size(size_bytes):
        """格式化文件大小"""
        if not size_bytes:
            return "0 B"
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"
    
    @staticmethod
    def prepare_data(images):
        """准备导出数据"""
        data = []
        for img in images:
            data.append({
                'ID': img.id,
                '文本内容': img.prompt,
                '图片路径': img.image_path,
                '图片大小': ExportManager.format_size(img.image_size),
                '推理步数': img.num_inference_steps,
                '引导比例': img.guidance_scale,
                '生成耗时': img.generation_time,
                '创建时间': img.created_at.strftime('%Y-%m-%d %H:%M:%S') if img.created_at else ''
            })
        return data
    
    @staticmethod
    def export_to_excel(images, output_path=None):
        """导出为 Excel 格式"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"export_excel_{timestamp}.xlsx"
        
        data = ExportManager.prepare_data(images)
        df = pd.DataFrame(data)
        
        # 创建 Excel writer
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='生成记录')
            
            # 调整列宽
            worksheet = writer.sheets['生成记录']
            for idx, col in enumerate(df.columns):
                max_length = max(
                    df[col].astype(str).apply(len).max(),
                    len(col)
                )
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)
        
        return output_path
    
    @staticmethod
    def export_to_html(images, output_path=None):
        """导出为 HTML 格式"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"export_html_{timestamp}.html"
        
        data = ExportManager.prepare_data(images)
        
        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文本转图片生成记录</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }}
        h1 {{
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }}
        .export-info {{
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        th {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }}
        td {{
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
        }}
        tr:hover {{
            background: #f5f5f5;
        }}
        .footer {{
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 文本转图片生成记录</h1>
        <div class="export-info">
            导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 总计: {len(data)} 条记录
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>文本内容</th>
                    <th>图片路径</th>
                    <th>图片大小</th>
                    <th>生成耗时</th>
                    <th>创建时间</th>
                </tr>
            </thead>
            <tbody>
"""
        
        for item in data:
            html += f"""
                <tr>
                    <td>{item['ID']}</td>
                    <td>{item['文本内容'][:100]}...</td>
                    <td>{os.path.basename(item['图片路径'])}</td>
                    <td>{item['图片大小']}</td>
                    <td>{item['生成耗时']}</td>
                    <td>{item['创建时间']}</td>
                </tr>
"""
        
        html += """
            </tbody>
        </table>
        
        <div class="footer">
            由文本转图片生成器自动生成
        </div>
    </div>
</body>
</html>
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        return output_path
    
    @staticmethod
    def export_to_txt(images, output_path=None):
        """导出为 TXT 格式"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"export_txt_{timestamp}.txt"
        
        data = ExportManager.prepare_data(images)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("文本转图片生成记录\n")
            f.write(f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"总计: {len(data)} 条记录\n")
            f.write("=" * 80 + "\n\n")
            
            for idx, item in enumerate(data, 1):
                f.write(f"记录 #{idx}\n")
                f.write("-" * 80 + "\n")
                for key, value in item.items():
                    f.write(f"{key}: {value}\n")
                f.write("\n")
        
        return output_path
    
    @staticmethod
    def export_to_markdown(images, output_path=None):
        """导出为 Markdown 格式"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"export_markdown_{timestamp}.md"
        
        data = ExportManager.prepare_data(images)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("# 🎨 文本转图片生成记录\n\n")
            f.write(f"**导出时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n")
            f.write(f"**总计记录**: {len(data)} 条\n\n")
            f.write("---\n\n")
            
            f.write("| ID | 文本内容 | 图片大小 | 生成耗时 | 创建时间 |\n")
            f.write("|---|---|---|---|---|\n")
            
            for item in data:
                prompt = item['文本内容'][:50] + "..." if len(item['文本内容']) > 50 else item['文本内容']
                f.write(f"| {item['ID']} | {prompt} | {item['图片大小']} | {item['生成耗时']} | {item['创建时间']} |\n")
            
            f.write("\n---\n\n")
            f.write("*由文本转图片生成器自动生成*\n")
        
        return output_path
