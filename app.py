"""
文本转图片 Gradio 应用主程序
"""
import gradio as gr
import os
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv

from text2image_generator import Text2ImageGenerator
from database.db_manager import DatabaseManager
from export_manager import ExportManager
from notification_service import notification_service

load_dotenv()

# 全局变量
generator = Text2ImageGenerator()
db_manager = DatabaseManager()

# 确保默认输出目录存在
DEFAULT_OUTPUT_DIR = os.getenv('DEFAULT_OUTPUT_DIR', './outputs')
os.makedirs(DEFAULT_OUTPUT_DIR, exist_ok=True)

def format_size(size_bytes):
    """格式化文件大小"""
    if not size_bytes:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"

def generate_image_ui(prompt, output_dir, num_steps, guidance, progress=gr.Progress()):
    """
    生成图片的UI处理函数
    """
    if not prompt or prompt.strip() == "":
        return None, "❌ 请输入文本内容", None
    
    # 使用自定义目录或默认目录
    if not output_dir or output_dir.strip() == "":
        output_dir = DEFAULT_OUTPUT_DIR
    
    try:
        # 进度回调
        def progress_callback(msg, value):
            progress(value, desc=msg)
        
        progress(0, desc="准备生成...")
        
        # 生成图片
        result = generator.generate_image(
            prompt=prompt,
            output_dir=output_dir,
            num_inference_steps=num_steps,
            guidance_scale=guidance,
            progress_callback=progress_callback
        )
        
        if not result['success']:
            return None, f"❌ 生成失败: {result['error']}", None
        
        # 保存到数据库
        try:
            db_manager.add_image(
                prompt=result['prompt'],
                image_path=result['image_path'],
                image_size=result['file_size'],
                num_inference_steps=result['num_inference_steps'],
                guidance_scale=result['guidance_scale'],
                generation_time=result['generation_time']
            )
        except Exception as db_error:
            print(f"⚠️  数据库保存失败: {db_error}")
        
        # 返回结果
        success_msg = f"""
✅ 图片生成成功！

📁 文件路径: {result['image_path']}
📊 文件大小: {format_size(result['file_size'])}
⏱️  生成耗时: {result['generation_time']}
🔢 推理步数: {result['num_inference_steps']}
📈 引导比例: {result['guidance_scale']}
"""
        
        # 发送通知
        enable_notifications = os.getenv('ENABLE_NOTIFICATIONS', 'true').lower() == 'true'
        if enable_notifications:
            try:
                print("📢 准备发送通知...")
                notification_service.send_image_generation_notification(result)
                success_msg += "\n🔔 通知已发送到配置的渠道"
            except Exception as notify_error:
                print(f"⚠️  通知发送失败: {notify_error}")
                success_msg += f"\n⚠️  通知发送失败: {str(notify_error)}"
        
        # 刷新列表
        table_data = refresh_table()
        
        return result['image_path'], success_msg, table_data
        
    except Exception as e:
        error_msg = f"❌ 生成失败: {str(e)}"
        print(error_msg)
        return None, error_msg, None

def refresh_table(keyword="", start_date=None, end_date=None):
    """刷新数据表格"""
    try:
        # 搜索图片记录
        if keyword or start_date or end_date:
            images = db_manager.search_images(
                keyword=keyword if keyword else None,
                start_date=datetime.strptime(start_date, "%Y-%m-%d") if start_date else None,
                end_date=datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
            )
        else:
            images = db_manager.get_all_images(limit=100)
        
        # 准备表格数据
        data = []
        for img in images:
            data.append([
                img.id,
                img.prompt[:100] + "..." if len(img.prompt) > 100 else img.prompt,
                os.path.basename(img.image_path),
                format_size(img.image_size),
                img.generation_time,
                img.created_at.strftime('%Y-%m-%d %H:%M:%S') if img.created_at else ""
            ])
        
        return data
        
    except Exception as e:
        print(f"刷新表格失败: {e}")
        return []

def search_records(keyword, start_date, end_date):
    """搜索记录"""
    return refresh_table(keyword, start_date, end_date)

def export_data(format_type, keyword, start_date, end_date):
    """导出数据"""
    try:
        # 获取筛选后的数据
        if keyword or start_date or end_date:
            images = db_manager.search_images(
                keyword=keyword if keyword else None,
                start_date=datetime.strptime(start_date, "%Y-%m-%d") if start_date else None,
                end_date=datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
            )
        else:
            images = db_manager.get_all_images()
        
        if not images:
            return None, "⚠️  没有数据可导出"
        
        # 根据格式导出
        export_dir = "./exports"
        os.makedirs(export_dir, exist_ok=True)
        
        if format_type == "Excel":
            output_path = ExportManager.export_to_excel(images)
        elif format_type == "HTML":
            output_path = ExportManager.export_to_html(images)
        elif format_type == "TXT":
            output_path = ExportManager.export_to_txt(images)
        elif format_type == "Markdown":
            output_path = ExportManager.export_to_markdown(images)
        else:
            return None, "❌ 不支持的导出格式"
        
        return output_path, f"✅ 导出成功！文件: {output_path}"
        
    except Exception as e:
        error_msg = f"❌ 导出失败: {str(e)}"
        print(error_msg)
        return None, error_msg

def load_model_ui(progress=gr.Progress()):
    """预加载模型"""
    try:
        def progress_callback(msg, value):
            progress(value, desc=msg)
        
        generator.load_model(progress_callback)
        return "✅ 模型加载成功！现在可以开始生成图片了。"
    except Exception as e:
        return f"❌ 模型加载失败: {str(e)}"

# 创建 Gradio 界面
with gr.Blocks(
    title="🎨 文本转图片生成器",
    theme=gr.themes.Soft(),
    css="""
    .gradio-container {
        max-width: 1400px !important;
    }
    .output-image {
        max-height: 600px;
    }
    """
) as demo:
    
    gr.Markdown(
        """
        # 🎨 文本转图片生成器
        
        基于 Qwen-Image 模型，将文本描述转换为精美图片
        
        ---
        """
    )
    
    with gr.Tab("🖼️ 生成图片"):
        with gr.Row():
            with gr.Column(scale=1):
                gr.Markdown("### 📝 输入设置")
                
                prompt_input = gr.Textbox(
                    label="文本内容",
                    placeholder="例如：一个穿着'QWEN' T恤的中国美女，手持黑马克笔微笑...",
                    lines=5,
                    max_lines=10
                )
                
                output_dir_input = gr.Textbox(
                    label="图片输出目录",
                    value=DEFAULT_OUTPUT_DIR,
                    placeholder="留空则使用默认目录"
                )
                
                with gr.Row():
                    num_steps_slider = gr.Slider(
                        minimum=10,
                        maximum=50,
                        value=28,
                        step=1,
                        label="推理步数",
                        info="步数越多，质量越高，但耗时越长"
                    )
                    
                    guidance_slider = gr.Slider(
                        minimum=1.0,
                        maximum=15.0,
                        value=7.5,
                        step=0.5,
                        label="引导比例",
                        info="控制生成与提示词的相关性"
                    )
                
                generate_btn = gr.Button(
                    "🎨 生成图片",
                    variant="primary",
                    size="lg"
                )
                
                preload_btn = gr.Button(
                    "📦 预加载模型",
                    variant="secondary"
                )
                
                status_output = gr.Textbox(
                    label="状态信息",
                    lines=8,
                    max_lines=15
                )
            
            with gr.Column(scale=1):
                gr.Markdown("### 🖼️ 生成结果")
                
                image_output = gr.Image(
                    label="生成的图片",
                    type="filepath",
                    elem_classes="output-image"
                )
                
                download_btn = gr.File(
                    label="📥 下载图片",
                    visible=True
                )
    
    with gr.Tab("📊 数据管理"):
        gr.Markdown("### 🔍 搜索和筛选")
        
        with gr.Row():
            search_keyword = gr.Textbox(
                label="关键字搜索",
                placeholder="搜索文本内容...",
                scale=2
            )
            
            search_start_date = gr.Textbox(
                label="开始日期",
                placeholder="YYYY-MM-DD",
                scale=1
            )
            
            search_end_date = gr.Textbox(
                label="结束日期",
                placeholder="YYYY-MM-DD",
                scale=1
            )
            
            search_btn = gr.Button("🔍 搜索", scale=1)
            refresh_btn = gr.Button("🔄 刷新", scale=1)
        
        gr.Markdown("### 📋 生成记录列表")
        
        table_output = gr.Dataframe(
            headers=["ID", "文本内容", "图片文件名", "文件大小", "生成耗时", "创建时间"],
            datatype=["number", "str", "str", "str", "str", "str"],
            row_count=10,
            col_count=(6, "fixed"),
            wrap=True
        )
        
        gr.Markdown("### 📤 导出数据")
        
        with gr.Row():
            export_format = gr.Radio(
                choices=["Excel", "HTML", "TXT", "Markdown"],
                value="Excel",
                label="导出格式"
            )
            
            export_btn = gr.Button("📤 导出", variant="primary")
        
        export_file = gr.File(label="导出文件")
        export_status = gr.Textbox(label="导出状态")
    
    with gr.Tab("🔔 通知设置"):
        gr.Markdown("### 📢 通知配置")
        
        gr.Markdown(
            """
            系统支持4种通知渠道，在图片生成完成后自动发送通知：
            
            1. **WxPusher** - 微信推送
            2. **PushPlus** - 微信推送
            3. **Resend Email** - 邮件通知
            4. **Telegram** - Telegram 机器人
            
            ### 📝 配置方法
            
            编辑 `.env` 文件，配置通知凭证：
            
            ```env
            # WxPusher
            WXPUSHER_TOKEN=your_token
            WXPUSHER_UID=your_uid
            
            # PushPlus
            PUSHPLUS_TOKEN=your_token
            
            # Resend Email
            RESEND_API_KEY=your_api_key
            RESEND_TO_EMAIL=your_email
            
            # Telegram
            TELEGRAM_BOT_TOKEN=your_bot_token
            TELEGRAM_CHAT_ID=your_chat_id
            
            # 启用/禁用通知
            ENABLE_NOTIFICATIONS=true
            ```
            
            ### 🔗 获取凭证
            
            - **WxPusher**: https://wxpusher.zjiecode.com/
            - **PushPlus**: http://www.pushplus.plus/
            - **Resend**: https://resend.com/
            - **Telegram**: 创建 Bot 获取 Token
            
            ### 💡 提示
            
            - 至少配置一个渠道即可
            - 未配置的渠道会自动跳过
            - 通知失败不影响图片生成
            - 可以设置 `ENABLE_NOTIFICATIONS=false` 禁用所有通知
            """
        )
    
    with gr.Tab("ℹ️ 使用说明"):
        gr.Markdown(
            """
            ## 📖 使用指南
            
            ### 1️⃣ 生成图片
            
            1. **输入文本描述**: 在"文本内容"框中输入您想要生成的图片描述
            2. **设置参数** (可选):
               - **推理步数**: 默认 28，步数越多质量越高但耗时越长
               - **引导比例**: 默认 7.5，控制生成与描述的相关性
               - **输出目录**: 可自定义，留空使用默认目录
            3. **点击"生成图片"**: 等待生成完成
            4. **下载图片**: 生成成功后可直接下载
            
            ### 2️⃣ 搜索和管理
            
            - **关键字搜索**: 在文本内容中搜索关键字
            - **日期筛选**: 按创建日期范围筛选
            - **查看历史**: 所有生成记录都会保存在数据库中
            
            ### 3️⃣ 导出数据
            
            支持导出为多种格式:
            - **Excel**: 适合数据分析
            - **HTML**: 精美的网页报告
            - **TXT**: 纯文本格式
            - **Markdown**: 文档格式
            
            ### 💡 提示
            
            - 首次使用建议先点击"预加载模型"
            - 文本描述越详细，生成效果越好
            - 推理步数建议 20-35 之间
            - 所有生成的图片都会自动保存到数据库
            - 配置通知后，生成完成会自动发送消息
            
            ### ⚙️ 技术信息
            
            - **模型**: Qwen-Image
            - **框架**: Gradio + PostgreSQL
            - **设备**: {os.getenv('DEVICE', 'cpu').upper()}
            - **缓存目录**: {os.getenv('HF_HOME', 'default')}
            
            ---
            
            **Enjoy creating amazing images! 🎨**
            """
        )
    
    # 事件绑定
    generate_btn.click(
        fn=generate_image_ui,
        inputs=[prompt_input, output_dir_input, num_steps_slider, guidance_slider],
        outputs=[image_output, status_output, table_output]
    )
    
    # 下载图片
    image_output.change(
        fn=lambda x: x,
        inputs=[image_output],
        outputs=[download_btn]
    )
    
    preload_btn.click(
        fn=load_model_ui,
        outputs=[status_output]
    )
    
    search_btn.click(
        fn=search_records,
        inputs=[search_keyword, search_start_date, search_end_date],
        outputs=[table_output]
    )
    
    refresh_btn.click(
        fn=lambda: refresh_table(),
        outputs=[table_output]
    )
    
    export_btn.click(
        fn=export_data,
        inputs=[export_format, search_keyword, search_start_date, search_end_date],
        outputs=[export_file, export_status]
    )
    
    # 页面加载时刷新表格
    demo.load(
        fn=lambda: refresh_table(),
        outputs=[table_output]
    )

if __name__ == "__main__":
    print("🚀 启动文本转图片生成器...")
    print(f"📂 输出目录: {DEFAULT_OUTPUT_DIR}")
    print(f"🖥️  设备: {os.getenv('DEVICE', 'cpu')}")
    
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )
