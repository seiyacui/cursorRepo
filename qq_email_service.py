"""
QQ邮箱服务模块
使用 SMTP 发送邮件，支持多个收件人
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from dotenv import load_dotenv

load_dotenv()

class QQEmailService:
    """QQ邮箱服务类"""
    
    def __init__(self):
        """初始化QQ邮箱配置"""
        self.host = 'smtp.qq.com'
        self.port = 465
        self._load_config()
        self._initialized = False
        self.initialize()
    
    def _load_config(self):
        """从配置文件或环境变量加载配置"""
        from notification_config import notification_config
        
        # 优先从配置文件读取
        creds = notification_config.get_credentials('qq_email')
        
        self.user = creds.get('user') or os.getenv('QQ_EMAIL_USER', '')
        self.password = creds.get('password') or os.getenv('QQ_EMAIL_PASSWORD', '')
        self.from_name = creds.get('from_name') or os.getenv('QQ_EMAIL_FROM_NAME', '文本转图片生成器')
        
        # 收件人列表
        recipients_str = creds.get('recipients') or os.getenv('QQ_EMAIL_RECIPIENTS', '')
        self.default_recipients = [r.strip() for r in recipients_str.split(',') if r.strip()]
    
    def update_config(self, user=None, password=None, from_name=None, recipients=None):
        """更新配置"""
        if user is not None:
            self.user = user
        if password is not None:
            self.password = password
        if from_name is not None:
            self.from_name = from_name
        if recipients is not None:
            if isinstance(recipients, str):
                self.default_recipients = [r.strip() for r in recipients.split(',') if r.strip()]
            else:
                self.default_recipients = recipients
        
        # 重新初始化
        self.initialize()
    
    def initialize(self):
        """初始化邮件服务"""
        try:
            if not self.user or not self.password:
                print("⚠️  QQ邮箱配置不完整，请设置 QQ_EMAIL_USER 和 QQ_EMAIL_PASSWORD")
                return
            
            # 测试连接
            self.test_connection()
            self._initialized = True
            print("✅ QQ Email service initialized")
        except Exception as error:
            print(f"❌ Failed to initialize QQ email service: {error}")
            self._initialized = False
    
    def send_email(self, to, subject, text=None, html=None):
        """
        发送邮件
        
        Args:
            to: 收件人，可以是字符串（单个）或列表（多个）
            subject: 邮件主题
            text: 纯文本内容
            html: HTML内容（可选）
        
        Returns:
            dict: 发送结果 {'success': bool, 'message': str}
        """
        if not self._initialized:
            return {
                'success': False,
                'message': 'QQ邮箱服务未初始化'
            }
        
        try:
            # 处理收件人
            if isinstance(to, str):
                recipients = [to]
            else:
                recipients = to
            
            if not recipients:
                return {
                    'success': False,
                    'message': '收件人列表为空'
                }
            
            # 创建邮件对象
            msg = MIMEMultipart('alternative')
            msg['From'] = Header(f'{self.from_name} <{self.user}>', 'utf-8')
            msg['To'] = Header(', '.join(recipients), 'utf-8')
            msg['Subject'] = Header(subject, 'utf-8')
            
            # 添加纯文本内容
            if text:
                text_part = MIMEText(text, 'plain', 'utf-8')
                msg.attach(text_part)
            
            # 添加HTML内容
            if html:
                html_part = MIMEText(html, 'html', 'utf-8')
                msg.attach(html_part)
            elif not text:
                # 如果既没有text也没有html，使用空文本
                text_part = MIMEText('', 'plain', 'utf-8')
                msg.attach(text_part)
            
            # 连接SMTP服务器并发送
            import ssl
            context = ssl.create_default_context()
            
            with smtplib.SMTP_SSL(self.host, self.port, timeout=10, context=context) as server:
                server.login(self.user, self.password)
                server.sendmail(self.user, recipients, msg.as_string())
            
            print(f"✅ QQ Email sent successfully to: {', '.join(recipients)}")
            return {
                'success': True,
                'message': f'邮件发送成功: {", ".join(recipients)}'
            }
            
        except Exception as error:
            error_msg = f"Failed to send QQ email: {str(error)}"
            print(f"❌ {error_msg}")
            return {
                'success': False,
                'message': error_msg
            }
    
    def send_image_notification(self, image_data, recipients=None):
        """
        发送图片生成通知邮件
        
        Args:
            image_data: 图片生成数据
            recipients: 收件人列表（可选，默认使用环境变量配置）
        
        Returns:
            dict: 发送结果
        """
        if not self._initialized:
            return {
                'success': False,
                'message': 'QQ邮箱服务未初始化'
            }
        
        # 使用指定的收件人或默认收件人
        to_list = recipients if recipients else self.default_recipients
        
        if not to_list:
            return {
                'success': False,
                'message': '未配置收件人地址'
            }
        
        # 邮件主题
        subject = '🎨 图片生成成功通知'
        
        # 纯文本内容
        text = f"""
图片生成成功！

📝 提示词: {image_data.get('prompt', 'N/A')[:100]}{'...' if len(image_data.get('prompt', '')) > 100 else ''}
📁 文件路径: {image_data.get('image_path', 'N/A')}
📐 图片尺寸: {image_data.get('image_dimensions', '未知')}
📊 文件大小: {self._format_size(image_data.get('file_size', 0))}
⏱️  生成耗时: {image_data.get('generation_time', 'N/A')}
🔢 推理步数: {image_data.get('num_inference_steps', 'N/A')}
📈 引导比例: {image_data.get('guidance_scale', 'N/A')}

此邮件由文本转图片生成器自动发送。
"""
        
        # HTML内容
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }}
        .content {{
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }}
        .info-box {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .info-item {{
            margin: 12px 0;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }}
        .info-item:last-child {{
            border-bottom: none;
        }}
        .label {{
            display: inline-block;
            width: 100px;
            font-weight: bold;
            color: #667eea;
        }}
        .value {{
            color: #333;
        }}
        .footer {{
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🎨 图片生成成功</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">文本转图片生成器</p>
        </div>
        <div class="content">
            <div class="info-box">
                <div class="info-item">
                    <span class="label">📝 提示词:</span>
                    <span class="value">{image_data.get('prompt', 'N/A')[:100]}{'...' if len(image_data.get('prompt', '')) > 100 else ''}</span>
                </div>
                <div class="info-item">
                    <span class="label">📁 文件路径:</span>
                    <span class="value">{image_data.get('image_path', 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="label">📐 图片尺寸:</span>
                    <span class="value">{image_data.get('image_dimensions', '未知')}</span>
                </div>
                <div class="info-item">
                    <span class="label">📊 文件大小:</span>
                    <span class="value">{self._format_size(image_data.get('file_size', 0))}</span>
                </div>
                <div class="info-item">
                    <span class="label">⏱️  生成耗时:</span>
                    <span class="value">{image_data.get('generation_time', 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="label">🔢 推理步数:</span>
                    <span class="value">{image_data.get('num_inference_steps', 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="label">📈 引导比例:</span>
                    <span class="value">{image_data.get('guidance_scale', 'N/A')}</span>
                </div>
            </div>
            <div class="footer">
                <p>此邮件由系统自动发送，请勿回复</p>
                <p>文本转图片生成器 - Powered by Qwen-Image</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        return self.send_email(to_list, subject, text, html)
    
    def test_connection(self):
        """测试邮件服务连接"""
        try:
            import ssl
            # 创建SSL上下文
            context = ssl.create_default_context()
            
            with smtplib.SMTP_SSL(self.host, self.port, timeout=10, context=context) as server:
                server.login(self.user, self.password)
            print("✅ QQ Email service connection verified")
            return True
        except Exception as error:
            print(f"❌ QQ Email service connection failed: {error}")
            return False
    
    def _format_size(self, size_bytes):
        """格式化文件大小"""
        if not size_bytes:
            return "0 B"
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"

# 全局实例
qq_email_service = QQEmailService()
