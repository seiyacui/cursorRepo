"""
AI文本转图片工具 - Gradio主应用
"""
import gradio as gr
import os
import time
from datetime import datetime, date
from pathlib import Path
from typing import List, Tuple, Optional
from loguru import logger
import sys

# 配置日志
logger.remove()
logger.add(sys.stderr, level="INFO")
logger.add("logs/app.log", rotation="1 day", retention="7 days", level="INFO")

# 导入项目模块
from config.settings import GRADIO_CONFIG, DEFAULT_OUTPUT_DIR
from database.connection import init_db
from services.text2image_service import get_text2image_service
from services.export_service import get_export_service
from models.text_image_record import TextImageRecord

class Text2ImageApp:
    """文本转图片应用主类"""
    
    def __init__(self):
        self.text2image_service = get_text2image_service()
        self.export_service = get_export_service()
        self.current_output_dir = str(DEFAULT_OUTPUT_DIR)
        
        # 初始化数据库
        if not init_db():
            logger.error("❌ 数据库初始化失败")
            raise RuntimeError("数据库初始化失败")
        
        logger.info("✅ 应用初始化完成")
    
    def generate_image(self, text_content: str, output_dir: str, progress=gr.Progress()) -> Tuple[str, str, str]:
        """
        生成图片
        
        Args:
            text_content: 文本内容
            output_dir: 输出目录
            progress: 进度条
            
        Returns:
            Tuple: (图片路径, 状态消息, 下载链接HTML)
        """
        try:
            if not text_content.strip():
                return None, "❌ 请输入文本内容", ""
            
            # 验证输出目录
            if output_dir and output_dir.strip():
                output_path = Path(output_dir.strip())
                if not output_path.exists():
                    try:
                        output_path.mkdir(parents=True, exist_ok=True)
                        self.current_output_dir = str(output_path)
                    except Exception as e:
                        return None, f"❌ 无法创建输出目录: {e}", ""
                else:
                    self.current_output_dir = str(output_path)
            else:
                output_path = None
            
            # 进度回调函数
            def progress_callback(progress_value, message):
                progress(progress_value, desc=message)
            
            logger.info(f"🎨 开始生成图片: {text_content[:50]}...")
            
            # 生成图片
            result = self.text2image_service.generate_image(
                text_content=text_content,
                output_dir=str(output_path) if output_path else None,
                progress_callback=progress_callback
            )
            
            if result['success']:
                # 生成下载链接HTML
                download_html = f"""
                <div style="margin-top: 10px; padding: 10px; background-color: #f0f8ff; border-radius: 5px;">
                    <h4>✅ 图片生成成功!</h4>
                    <p><strong>文件名:</strong> {result['filename']}</p>
                    <p><strong>大小:</strong> {result['image_size'] // 1024} KB</p>
                    <p><strong>尺寸:</strong> {result['width']} x {result['height']}</p>
                    <p><strong>生成时间:</strong> {result['generation_time']:.2f} 秒</p>
                    <p><strong>保存路径:</strong> {result['image_path']}</p>
                </div>
                """
                
                return result['image_path'], result['message'], download_html
            else:
                return None, result['message'], ""
                
        except Exception as e:
            error_msg = f"❌ 生成图片失败: {str(e)}"
            logger.error(error_msg)
            return None, error_msg, ""
    
    def get_records_list(self, keyword: str = "", date_from: str = "", date_to: str = "", 
                        page: int = 1, page_size: int = 20) -> Tuple[str, str]:
        """
        获取记录列表
        
        Returns:
            Tuple: (HTML表格, 分页信息)
        """
        try:
            # 处理日期参数
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date() if date_from else None
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date() if date_to else None
            
            # 计算偏移量
            offset = (page - 1) * page_size
            
            # 搜索记录
            records = TextImageRecord.search(
                keyword=keyword if keyword else None,
                date_from=date_from_obj,
                date_to=date_to_obj,
                limit=page_size,
                offset=offset
            )
            
            # 获取总数
            total_count = TextImageRecord.count(
                keyword=keyword if keyword else None,
                date_from=date_from_obj,
                date_to=date_to_obj
            )
            
            # 生成HTML表格
            if not records:
                table_html = """
                <div style="text-align: center; padding: 20px; color: #666;">
                    📭 暂无数据
                </div>
                """
            else:
                table_html = """
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">ID</th>
                                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">文本内容</th>
                                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">图片文件名</th>
                                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">大小</th>
                                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">状态</th>
                                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">创建时间</th>
                                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">下载</th>
                            </tr>
                        </thead>
                        <tbody>
                """
                
                for record in records:
                    # 状态样式
                    status_styles = {
                        'completed': 'background-color: #d4edda; color: #155724; padding: 2px 6px; border-radius: 3px;',
                        'failed': 'background-color: #f8d7da; color: #721c24; padding: 2px 6px; border-radius: 3px;',
                        'generating': 'background-color: #d1ecf1; color: #0c5460; padding: 2px 6px; border-radius: 3px;',
                        'pending': 'background-color: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 3px;'
                    }
                    
                    status_style = status_styles.get(record['status'], '')
                    
                    # 文本内容预览
                    text_preview = record['text_content'][:50] + "..." if len(record['text_content']) > 50 else record['text_content']
                    
                    # 文件大小
                    file_size = f"{record['image_size'] // 1024} KB" if record['image_size'] else "N/A"
                    
                    # 创建时间
                    created_at = record['created_at'].strftime('%Y-%m-%d %H:%M') if record['created_at'] else 'N/A'
                    
                    # 下载链接
                    download_link = ""
                    if record['status'] == 'completed' and record['image_path']:
                        if Path(record['image_path']).exists():
                            download_link = f'<a href="file://{record["image_path"]}" target="_blank" style="color: #007bff; text-decoration: none;">📥 下载</a>'
                        else:
                            download_link = '<span style="color: #6c757d;">文件不存在</span>'
                    
                    table_html += f"""
                        <tr style="border-bottom: 1px solid #dee2e6;">
                            <td style="border: 1px solid #dee2e6; padding: 8px;">{record['id']}</td>
                            <td style="border: 1px solid #dee2e6; padding: 8px; max-width: 300px;" title="{record['text_content']}">{text_preview}</td>
                            <td style="border: 1px solid #dee2e6; padding: 8px;">{record['image_filename']}</td>
                            <td style="border: 1px solid #dee2e6; padding: 8px;">{file_size}</td>
                            <td style="border: 1px solid #dee2e6; padding: 8px;"><span style="{status_style}">{record['status']}</span></td>
                            <td style="border: 1px solid #dee2e6; padding: 8px;">{created_at}</td>
                            <td style="border: 1px solid #dee2e6; padding: 8px;">{download_link}</td>
                        </tr>
                    """
                
                table_html += """
                        </tbody>
                    </table>
                </div>
                """
            
            # 分页信息
            total_pages = (total_count + page_size - 1) // page_size
            pagination_info = f"第 {page} 页，共 {total_pages} 页 | 总计 {total_count} 条记录"
            
            return table_html, pagination_info
            
        except Exception as e:
            error_msg = f"❌ 获取记录列表失败: {str(e)}"
            logger.error(error_msg)
            return f'<div style="color: red; padding: 10px;">{error_msg}</div>', "获取失败"
    
    def export_data(self, format_type: str, keyword: str = "", date_from: str = "", date_to: str = "") -> Tuple[str, str]:
        """
        导出数据
        
        Returns:
            Tuple: (下载文件路径, 状态消息)
        """
        try:
            # 处理日期参数
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date() if date_from else None
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date() if date_to else None
            
            # 获取要导出的记录
            records = TextImageRecord.search(
                keyword=keyword if keyword else None,
                date_from=date_from_obj,
                date_to=date_to_obj,
                limit=10000  # 导出时获取更多记录
            )
            
            if not records:
                return None, "❌ 没有数据可导出"
            
            # 导出数据
            result = self.export_service.export_records(records, format_type)
            
            if result['success']:
                return result['file_path'], f"✅ {result['message']}"
            else:
                return None, f"❌ {result['message']}"
                
        except Exception as e:
            error_msg = f"❌ 导出失败: {str(e)}"
            logger.error(error_msg)
            return None, error_msg
    
    def get_statistics(self) -> str:
        """获取统计信息"""
        try:
            stats = TextImageRecord.get_statistics()
            
            stats_html = f"""
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 10px 0;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold;">{stats.get('total_records', 0)}</div>
                    <div style="font-size: 12px; opacity: 0.9;">总记录数</div>
                </div>
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold;">{stats.get('completed_count', 0)}</div>
                    <div style="font-size: 12px; opacity: 0.9;">成功生成</div>
                </div>
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold;">{stats.get('success_rate', 0):.1f}%</div>
                    <div style="font-size: 12px; opacity: 0.9;">成功率</div>
                </div>
                <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold;">{stats.get('avg_generation_time', 0):.1f}s</div>
                    <div style="font-size: 12px; opacity: 0.9;">平均生成时间</div>
                </div>
            </div>
            """
            
            return stats_html
            
        except Exception as e:
            logger.error(f"❌ 获取统计信息失败: {e}")
            return '<div style="color: red;">获取统计信息失败</div>'
    
    def create_interface(self):
        """创建Gradio界面"""
        
        # 自定义CSS
        custom_css = """
        .gradio-container {
            max-width: 1200px !important;
        }
        .tab-nav button {
            font-size: 16px !important;
            padding: 10px 20px !important;
        }
        .progress-bar {
            background: linear-gradient(90deg, #667eea, #764ba2) !important;
        }
        """
        
        with gr.Blocks(
            theme=gr.themes.Soft(),
            css=custom_css,
            title=GRADIO_CONFIG['title']
        ) as interface:
            
            gr.Markdown(f"""
            # {GRADIO_CONFIG['title']}
            
            {GRADIO_CONFIG['description']}
            
            🤖 **模型**: Qwen-Image | 💾 **数据库**: PostgreSQL | 🎨 **界面**: Gradio
            """)
            
            with gr.Tabs():
                # 图片生成标签页
                with gr.Tab("🎨 图片生成", id="generate"):
                    with gr.Row():
                        with gr.Column(scale=2):
                            text_input = gr.Textbox(
                                label="📝 文本内容",
                                placeholder="请输入要转换为图片的文本描述...\n例如：一只可爱的小猫咪在花园里玩耍",
                                lines=4,
                                max_lines=8
                            )
                            
                            output_dir_input = gr.Textbox(
                                label="📁 图片输出目录（可选）",
                                placeholder=f"默认输出目录: {DEFAULT_OUTPUT_DIR}",
                                value=""
                            )
                            
                            generate_btn = gr.Button(
                                "🚀 生成图片", 
                                variant="primary",
                                size="lg"
                            )
                        
                        with gr.Column(scale=1):
                            # 统计信息
                            stats_display = gr.HTML(
                                label="📊 统计信息",
                                value=self.get_statistics()
                            )
                    
                    # 结果显示区域
                    with gr.Row():
                        with gr.Column():
                            result_image = gr.Image(
                                label="🖼️ 生成的图片",
                                type="filepath",
                                height=400
                            )
                        
                        with gr.Column():
                            result_message = gr.Textbox(
                                label="📋 生成状态",
                                lines=2,
                                interactive=False
                            )
                            
                            download_info = gr.HTML(
                                label="📥 下载信息"
                            )
                
                # 记录管理标签页
                with gr.Tab("📚 记录管理", id="records"):
                    with gr.Row():
                        with gr.Column(scale=2):
                            search_keyword = gr.Textbox(
                                label="🔍 搜索关键字",
                                placeholder="输入文本内容关键字..."
                            )
                        
                        with gr.Column():
                            search_date_from = gr.Textbox(
                                label="📅 开始日期",
                                placeholder="YYYY-MM-DD"
                            )
                        
                        with gr.Column():
                            search_date_to = gr.Textbox(
                                label="📅 结束日期", 
                                placeholder="YYYY-MM-DD"
                            )
                        
                        with gr.Column():
                            search_btn = gr.Button("🔍 搜索", variant="secondary")
                            refresh_btn = gr.Button("🔄 刷新", variant="secondary")
                    
                    # 记录列表
                    records_table = gr.HTML(
                        label="📋 记录列表",
                        value=self.get_records_list()[0]
                    )
                    
                    # 分页信息
                    pagination_info = gr.Textbox(
                        label="📄 分页信息",
                        value=self.get_records_list()[1],
                        interactive=False
                    )
                
                # 数据导出标签页
                with gr.Tab("📤 数据导出", id="export"):
                    with gr.Row():
                        with gr.Column(scale=2):
                            export_format = gr.Dropdown(
                                choices=["excel", "html", "txt", "markdown"],
                                value="excel",
                                label="📋 导出格式",
                                info="选择要导出的文件格式"
                            )
                            
                            export_keyword = gr.Textbox(
                                label="🔍 筛选关键字（可选）",
                                placeholder="留空则导出所有记录"
                            )
                        
                        with gr.Column():
                            export_date_from = gr.Textbox(
                                label="📅 开始日期（可选）",
                                placeholder="YYYY-MM-DD"
                            )
                            
                            export_date_to = gr.Textbox(
                                label="📅 结束日期（可选）",
                                placeholder="YYYY-MM-DD"
                            )
                    
                    export_btn = gr.Button(
                        "📤 导出数据", 
                        variant="primary",
                        size="lg"
                    )
                    
                    export_result = gr.File(
                        label="📁 导出文件",
                        interactive=False
                    )
                    
                    export_message = gr.Textbox(
                        label="📋 导出状态",
                        interactive=False
                    )
            
            # 事件绑定
            generate_btn.click(
                fn=self.generate_image,
                inputs=[text_input, output_dir_input],
                outputs=[result_image, result_message, download_info],
                show_progress=True
            )
            
            # 生成完成后刷新统计信息
            generate_btn.click(
                fn=self.get_statistics,
                outputs=[stats_display]
            )
            
            search_btn.click(
                fn=lambda k, df, dt: self.get_records_list(k, df, dt),
                inputs=[search_keyword, search_date_from, search_date_to],
                outputs=[records_table, pagination_info]
            )
            
            refresh_btn.click(
                fn=lambda: self.get_records_list(),
                outputs=[records_table, pagination_info]
            )
            
            export_btn.click(
                fn=self.export_data,
                inputs=[export_format, export_keyword, export_date_from, export_date_to],
                outputs=[export_result, export_message]
            )
            
            # 页面加载时刷新数据
            interface.load(
                fn=self.get_statistics,
                outputs=[stats_display]
            )
            
            interface.load(
                fn=lambda: self.get_records_list(),
                outputs=[records_table, pagination_info]
            )
        
        return interface
    
    def launch(self):
        """启动应用"""
        try:
            interface = self.create_interface()
            
            logger.info(f"🚀 启动Gradio应用...")
            logger.info(f"📡 服务器地址: http://{GRADIO_CONFIG['server_name']}:{GRADIO_CONFIG['server_port']}")
            
            interface.launch(
                server_name=GRADIO_CONFIG['server_name'],
                server_port=GRADIO_CONFIG['server_port'],
                share=GRADIO_CONFIG['share'],
                debug=GRADIO_CONFIG['debug'],
                show_error=True,
                quiet=False
            )
            
        except Exception as e:
            logger.error(f"❌ 启动应用失败: {e}")
            raise

def main():
    """主函数"""
    try:
        logger.info("🎨 AI文本转图片工具启动中...")
        
        # 创建应用实例
        app = Text2ImageApp()
        
        # 启动应用
        app.launch()
        
    except KeyboardInterrupt:
        logger.info("👋 用户中断，应用退出")
    except Exception as e:
        logger.error(f"❌ 应用运行失败: {e}")
        raise

if __name__ == "__main__":
    main()