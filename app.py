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
from notification_config import notification_config
from app_logger import (
    setup_logger, log_section, log_separator, 
    log_database_operation, log_notification_status
)

load_dotenv()

# 设置日志记录器
logger = setup_logger('Text2ImageApp', 'logs/app.log')

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
            record_id = db_manager.add_image(
                prompt=result['prompt'],
                image_path=result['image_path'],
                image_size=result['file_size'],
                image_dimensions=result['image_dimensions'],
                num_inference_steps=result['num_inference_steps'],
                guidance_scale=result['guidance_scale'],
                generation_time=result['generation_time']
            )
            log_database_operation(logger, '保存图片记录', True, f'记录ID: {record_id}')
        except Exception as db_error:
            print(f"⚠️  数据库保存失败: {db_error}")
            log_database_operation(logger, '保存图片记录', False, str(db_error))
        
        # 返回结果
        success_msg = f"""
✅ 图片生成成功！

📁 文件路径: {result['image_path']}
📐 图片尺寸: {result['image_dimensions']}
📊 文件大小: {format_size(result['file_size'])}
⏱️  生成耗时: {result['generation_time']}
🔢 推理步数: {result['num_inference_steps']}
📈 引导比例: {result['guidance_scale']}
"""
        
        # 发送通知（使用配置文件中的设置，包括QQ邮箱）
        if notification_config.is_enabled():
            enabled_channels = notification_config.get_enabled_channels()
            log_notification_status(logger, True, enabled_channels)
            try:
                print("📢 准备发送通知...")
                # 使用新的方法发送通知（包括QQ邮箱）
                notification_service.send_image_generation_notification_with_qq(result)
                success_msg += "\n🔔 通知已发送到配置的渠道"
                logger.info(f"✅ 通知发送成功 - 渠道: {', '.join(enabled_channels)}")
            except Exception as notify_error:
                print(f"⚠️  通知发送失败: {notify_error}")
                success_msg += f"\n⚠️  通知发送失败: {str(notify_error)}"
                logger.error(f"❌ 通知发送失败: {notify_error}")
        else:
            log_notification_status(logger, False, [])
        
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
                img.image_dimensions or "未知",
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

def get_notification_status_display():
    """获取通知状态显示文本"""
    config = notification_config.load_config()
    
    master_status = "🟢 已启用" if config.get('enabled', True) else "🔴 已禁用"
    
    channels_status = []
    channel_names = {
        'wxpusher': 'WxPusher',
        'pushplus': 'PushPlus',
        'resend': 'Resend Email',
        'telegram': 'Telegram',
        'qq_email': 'QQ Email'
    }
    
    for channel, name in channel_names.items():
        enabled = config.get('channels', {}).get(channel, True)
        if config.get('enabled', True) and enabled:
            status = "🟢"
        elif config.get('enabled', True) and not enabled:
            status = "🟡"
        else:
            status = "🔴"
        channels_status.append(f"{status} {name}")
    
    enabled_count = sum(1 for ch in config.get('channels', {}).values() if ch)
    
    status_text = f"""
### 总开关状态
{master_status}

### 渠道状态
{chr(10).join(channels_status)}

### 统计
- 已启用渠道: {enabled_count}/4
- 总开关: {'开启' if config.get('enabled', True) else '关闭'}

### 图例
- 🟢 已启用并生效
- 🟡 已禁用（总开关开启）
- 🔴 不可用（总开关关闭）
"""
    return status_text

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
            headers=["ID", "文本内容", "图片文件名", "图片尺寸", "文件大小", "生成耗时", "创建时间"],
            datatype=["number", "str", "str", "str", "str", "str", "str"],
            row_count=10,
            col_count=(7, "fixed"),
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
        gr.Markdown("### 📢 通知配置中心")
        gr.Markdown("所有凭证信息都保存在本地配置文件中（`notification_config.json`），无需修改 .env 文件")
        
        # 加载当前配置
        current_config = notification_config.load_config()
        current_creds = current_config.get('credentials', {})
        
        with gr.Row():
            with gr.Column(scale=1):
                gr.Markdown("#### 🎛️ 总开关")
                
                notification_master_switch = gr.Checkbox(
                    label="启用通知",
                    value=current_config.get('enabled', True),
                    info="关闭后将禁用所有通知渠道",
                    interactive=True
                )
                
                gr.Markdown("---")
                gr.Markdown("#### 📡 渠道开关与凭证配置")
                gr.Markdown("*配置凭证后，启用对应开关即可使用*")
                
                # WxPusher
                with gr.Accordion("📱 WxPusher（微信推送）", open=False):
                    wxpusher_switch = gr.Checkbox(
                        label="启用 WxPusher",
                        value=current_config.get('channels', {}).get('wxpusher', True)
                    )
                    wxpusher_token = gr.Textbox(
                        label="AppToken",
                        value=current_creds.get('wxpusher', {}).get('token', ''),
                        placeholder="输入您的 WxPusher AppToken"
                    )
                    wxpusher_uid = gr.Textbox(
                        label="UID",
                        value=current_creds.get('wxpusher', {}).get('uid', ''),
                        placeholder="输入您的 WxPusher UID"
                    )
                    gr.Markdown("获取凭证: [WxPusher官网](https://wxpusher.zjiecode.com/)")
                
                # PushPlus
                with gr.Accordion("📲 PushPlus（微信推送）", open=False):
                    pushplus_switch = gr.Checkbox(
                        label="启用 PushPlus",
                        value=current_config.get('channels', {}).get('pushplus', True)
                    )
                    pushplus_token = gr.Textbox(
                        label="Token",
                        value=current_creds.get('pushplus', {}).get('token', ''),
                        placeholder="输入您的 PushPlus Token"
                    )
                    gr.Markdown("获取凭证: [PushPlus官网](http://www.pushplus.plus/)")
                
                # Resend Email
                with gr.Accordion("📧 Resend Email（国际邮件）", open=False):
                    resend_switch = gr.Checkbox(
                        label="启用 Resend Email",
                        value=current_config.get('channels', {}).get('resend', True)
                    )
                    resend_api_key = gr.Textbox(
                        label="API Key",
                        value=current_creds.get('resend', {}).get('api_key', ''),
                        placeholder="输入您的 Resend API Key",
                        type="password"
                    )
                    resend_to_email = gr.Textbox(
                        label="收件人邮箱",
                        value=current_creds.get('resend', {}).get('to_email', ''),
                        placeholder="your_email@example.com"
                    )
                    gr.Markdown("获取凭证: [Resend官网](https://resend.com/)")
                
                # Telegram
                with gr.Accordion("✈️ Telegram（TG机器人）", open=False):
                    telegram_switch = gr.Checkbox(
                        label="启用 Telegram",
                        value=current_config.get('channels', {}).get('telegram', True)
                    )
                    telegram_bot_token = gr.Textbox(
                        label="Bot Token",
                        value=current_creds.get('telegram', {}).get('bot_token', ''),
                        placeholder="输入您的 Telegram Bot Token",
                        type="password"
                    )
                    telegram_chat_id = gr.Textbox(
                        label="Chat ID",
                        value=current_creds.get('telegram', {}).get('chat_id', ''),
                        placeholder="输入您的 Telegram Chat ID"
                    )
                    gr.Markdown("获取凭证: [创建Bot](https://t.me/BotFather)")
                
                # QQ Email
                with gr.Accordion("📮 QQ Email（QQ邮箱，支持多收件人）", open=False):
                    qq_email_switch = gr.Checkbox(
                        label="启用 QQ Email",
                        value=current_config.get('channels', {}).get('qq_email', True)
                    )
                    qq_email_user = gr.Textbox(
                        label="QQ邮箱地址",
                        value=current_creds.get('qq_email', {}).get('user', ''),
                        placeholder="your_email@qq.com"
                    )
                    qq_email_password = gr.Textbox(
                        label="授权码（不是密码！）",
                        value=current_creds.get('qq_email', {}).get('password', ''),
                        placeholder="16位授权码",
                        type="password"
                    )
                    qq_email_from_name = gr.Textbox(
                        label="发件人名称",
                        value=current_creds.get('qq_email', {}).get('from_name', '文本转图片生成器'),
                        placeholder="文本转图片生成器"
                    )
                    qq_email_recipients = gr.Textbox(
                        label="收件人列表（逗号分隔）",
                        value=current_creds.get('qq_email', {}).get('recipients', ''),
                        placeholder="user1@gmail.com,user2@qq.com,user3@163.com",
                        lines=2
                    )
                    gr.Markdown("⚠️ 授权码获取: QQ邮箱 → 设置 → 账户 → POP3/SMTP → 生成授权码")
                
                gr.Markdown("---")
                
                with gr.Row():
                    save_notification_btn = gr.Button(
                        "💾 保存所有设置",
                        variant="primary",
                        size="lg"
                    )
                    
                notification_status = gr.Textbox(
                    label="保存状态",
                    interactive=False,
                    lines=2
                )
            
            with gr.Column(scale=1):
                gr.Markdown("#### 📋 当前状态")
                
                notification_status_display = gr.Markdown(
                    value=get_notification_status_display()
                )
                
                gr.Markdown("---")
                gr.Markdown("#### 📝 配置说明")
                
                gr.Markdown(
                    """
                    **使用步骤：**
                    
                    1. **配置凭证** - 编辑 `.env` 文件，添加各渠道的凭证：
                       ```
                       WXPUSHER_TOKEN=your_token
                       WXPUSHER_UID=your_uid
                       PUSHPLUS_TOKEN=your_token
                       RESEND_API_KEY=your_api_key
                       RESEND_TO_EMAIL=your_email
                       TELEGRAM_BOT_TOKEN=your_bot_token
                       TELEGRAM_CHAT_ID=your_chat_id
                       QQ_EMAIL_USER=your_qq_email@qq.com
                       QQ_EMAIL_PASSWORD=your_authorization_code
                       QQ_EMAIL_RECIPIENTS=email1@example.com,email2@gmail.com
                       ```
                    
                    2. **控制开关** - 使用上方开关控制通知：
                       - **总开关**：关闭后禁用所有通知
                       - **渠道开关**：精细控制每个渠道
                    
                    3. **保存设置** - 点击"保存设置"按钮应用更改
                    
                    **获取凭证：**
                    - [WxPusher](https://wxpusher.zjiecode.com/)
                    - [PushPlus](http://www.pushplus.plus/)
                    - [Resend](https://resend.com/)
                    - [Telegram](https://t.me/BotFather) - 创建Bot
                    
                    **提示：**
                    - 至少配置一个渠道即可
                    - 未配置的渠道会自动跳过
                    - 通知失败不影响图片生成
                    - 设置实时生效，无需重启
                    """
                )
        
        # 保存通知设置
        def save_notification_settings(
            master, 
            wx_enabled, wx_token, wx_uid,
            pp_enabled, pp_token,
            rs_enabled, rs_api_key, rs_to_email,
            tg_enabled, tg_bot_token, tg_chat_id,
            qq_enabled, qq_user, qq_password, qq_from_name, qq_recipients
        ):
            """保存通知配置和凭证"""
            # 构建凭证字典
            credentials = {
                'wxpusher': {'token': wx_token, 'uid': wx_uid},
                'pushplus': {'token': pp_token},
                'resend': {'api_key': rs_api_key, 'to_email': rs_to_email},
                'telegram': {'bot_token': tg_bot_token, 'chat_id': tg_chat_id},
                'qq_email': {
                    'user': qq_user, 
                    'password': qq_password, 
                    'from_name': qq_from_name, 
                    'recipients': qq_recipients
                }
            }
            
            # 保存配置
            success, message = notification_config.save_config(
                master, wx_enabled, pp_enabled, rs_enabled, tg_enabled, qq_enabled, 
                credentials
            )
            
            # 重新加载凭证到通知服务
            notification_service.reload_credentials()
            
            # 更新QQ邮箱服务配置
            from qq_email_service import qq_email_service
            qq_email_service.update_config(qq_user, qq_password, qq_from_name, qq_recipients)
            
            # 更新状态显示
            status_display = get_notification_status_display()
            return message, status_display
        
        save_notification_btn.click(
            fn=save_notification_settings,
            inputs=[
                notification_master_switch,
                wxpusher_switch, wxpusher_token, wxpusher_uid,
                pushplus_switch, pushplus_token,
                resend_switch, resend_api_key, resend_to_email,
                telegram_switch, telegram_bot_token, telegram_chat_id,
                qq_email_switch, qq_email_user, qq_email_password, qq_email_from_name, qq_email_recipients
            ],
            outputs=[notification_status, notification_status_display]
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
