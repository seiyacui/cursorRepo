"""
通知服务模块 - 支持4种通知渠道
基于参考代码实现
"""
import requests
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class NotificationService:
    """通知服务类"""
    
    def __init__(self):
        # 从环境变量获取通知凭证
        self.config = {
            'wxpusher': {
                'token': os.getenv('WXPUSHER_TOKEN', ''),
                'uid': os.getenv('WXPUSHER_UID', '')
            },
            'pushplus': {
                'token': os.getenv('PUSHPLUS_TOKEN', '')
            },
            'resend': {
                'api_key': os.getenv('RESEND_API_KEY', ''),
                'to_email': os.getenv('RESEND_TO_EMAIL', '')
            },
            'telegram': {
                'bot_token': os.getenv('TELEGRAM_BOT_TOKEN', ''),
                'chat_id': os.getenv('TELEGRAM_CHAT_ID', '')
            }
        }
    
    def format_size(self, size_bytes):
        """格式化文件大小"""
        if not size_bytes:
            return '0 B'
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"
    
    def format_time(self, timestamp):
        """格式化时间"""
        if isinstance(timestamp, datetime):
            return timestamp.strftime('%Y-%m-%d %H:%M:%S')
        return str(timestamp)
    
    def send_image_generation_notification(self, generation_result):
        """
        发送图片生成完成通知
        
        Args:
            generation_result: 生成结果字典，包含:
                - success: 是否成功
                - prompt: 提示词
                - image_path: 图片路径
                - file_size: 文件大小
                - generation_time: 生成耗时
                - num_inference_steps: 推理步数
                - guidance_scale: 引导比例
        """
        print("📢 开始发送通知...")
        
        if not generation_result.get('success'):
            print("⚠️  生成失败，跳过通知")
            return
        
        # 构建通知标题
        status_icon = "✅"
        title = f"{status_icon} 文本转图片生成完成"
        
        # 构建通知内容
        content = f"""### 文本转图片生成报告

**生成状态**: {status_icon} 成功

**文本内容**:
{generation_result.get('prompt', 'N/A')[:200]}...

**生成信息**:
- **图片路径**: {generation_result.get('filename', 'N/A')}
- **文件大小**: {self.format_size(generation_result.get('file_size', 0))}
- **生成耗时**: {generation_result.get('generation_time', 'N/A')}
- **推理步数**: {generation_result.get('num_inference_steps', 'N/A')}
- **引导比例**: {generation_result.get('guidance_scale', 'N/A')}
- **生成时间**: {self.format_time(datetime.now())}

---
*由文本转图片生成器自动发送*
"""
        
        # HTML 格式内容
        html_content = content.replace("\n", "<br>").replace("**", "<strong>").replace("**", "</strong>")
        
        # 发送通知
        self._send_to_all_channels(title, content, html_content)
    
    def send_batch_notification(self, generation_records, total_time):
        """
        发送批量生成完成通知
        
        Args:
            generation_records: 生成记录列表
            total_time: 总耗时（秒）
        """
        print("📢 开始发送批量通知...")
        
        # 统计成功和失败的记录
        success_count = sum(1 for r in generation_records if r.get('status') == '完成')
        error_count = len(generation_records) - success_count
        
        # 构建通知标题
        title = f"文本转图片批量生成完成 - 成功: {success_count}, 失败: {error_count}"
        
        # 构建详情列表
        summary_list = []
        for idx, record in enumerate(generation_records, 1):
            status_icon = "✅" if record.get('status') == '完成' else "❌"
            prompt_preview = record.get('prompt', 'N/A')[:50] + "..."
            file_size = self.format_size(record.get('file_size', 0))
            gen_time = record.get('generation_time', 'N/A')
            
            summary_list.append(
                f"{status_icon} {idx}. {prompt_preview} "
                f"({record.get('status')}) "
                f"(耗时: {gen_time}) "
                f"(大小: {file_size})"
            )
        
        # 构建通知内容
        content = f"""### 文本转图片批量生成报告

**总计文件**: {len(generation_records)}
**成功**: ✅ {success_count}
**失败**: ❌ {error_count}
**总耗时**: {total_time:.2f} 秒

---
**生成详情:**
""" + "\n".join(summary_list) + """

---
*由文本转图片生成器自动发送*
"""
        
        # HTML 格式内容
        html_content = content.replace("\n", "<br>")
        
        # 发送通知
        self._send_to_all_channels(title, content, html_content)
    
    def _send_to_all_channels(self, title, content, html_content):
        """发送通知到所有渠道"""
        
        # 准备通知配置
        notifications = [
            {
                'name': 'WxPusher',
                'url': 'https://wxpusher.zjiecode.com/api/send/message',
                'headers': {'Content-Type': 'application/json'},
                'data': {
                    "appToken": self.config['wxpusher']['token'],
                    "content": content,
                    "summary": title,
                    "contentType": 3,  # Markdown
                    "uids": [self.config['wxpusher']['uid']],
                },
                'enabled': bool(self.config['wxpusher']['token'] and self.config['wxpusher']['uid'])
            },
            {
                'name': 'PushPlus',
                'url': 'http://www.pushplus.plus/send',
                'headers': {'Content-Type': 'application/json'},
                'data': {
                    "token": self.config['pushplus']['token'],
                    "title": title,
                    "content": content,
                    "template": "markdown",
                },
                'enabled': bool(self.config['pushplus']['token'])
            },
            {
                'name': 'Resend Email',
                'url': 'https://api.resend.com/emails',
                'headers': {
                    'Authorization': f'Bearer {self.config["resend"]["api_key"]}',
                    'Content-Type': 'application/json',
                },
                'data': {
                    "from": 'onboarding@resend.dev',
                    "to": self.config['resend']['to_email'],
                    "subject": title,
                    "html": html_content,
                },
                'enabled': bool(self.config['resend']['api_key'] and self.config['resend']['to_email'])
            },
            {
                'name': 'Telegram',
                'url': f'https://api.telegram.org/bot{self.config["telegram"]["bot_token"]}/sendMessage',
                'headers': {'Content-Type': 'application/json'},
                'data': {
                    "chat_id": self.config['telegram']['chat_id'],
                    "text": content.replace('###', '').replace('**', '*'),
                    "parse_mode": "Markdown"
                },
                'enabled': bool(self.config['telegram']['bot_token'] and self.config['telegram']['chat_id'])
            },
        ]
        
        # 发送通知
        results = []
        for notification in notifications:
            if not notification['enabled']:
                print(f"🟡 跳过 {notification['name']}，配置信息不完整。")
                results.append({'name': notification['name'], 'status': 'skipped'})
                continue
            
            try:
                # 过滤掉空值
                if not all(notification.get('data', {}).values()):
                    print(f"🟡 跳过 {notification['name']}，数据不完整。")
                    results.append({'name': notification['name'], 'status': 'skipped'})
                    continue
                
                response = requests.post(
                    notification['url'],
                    headers=notification['headers'],
                    data=json.dumps(notification['data']),
                    timeout=10  # 设置10秒超时
                )
                response.raise_for_status()  # 如果请求失败则抛出异常
                
                print(f"✅ {notification['name']} 通知发送成功, 状态码: {response.status_code}")
                results.append({
                    'name': notification['name'],
                    'status': 'success',
                    'status_code': response.status_code
                })
                
            except requests.exceptions.RequestException as e:
                print(f"❌ 发送 {notification['name']} 通知失败: {e}")
                results.append({
                    'name': notification['name'],
                    'status': 'failed',
                    'error': str(e)
                })
        
        # 汇总结果
        success_count = sum(1 for r in results if r['status'] == 'success')
        failed_count = sum(1 for r in results if r['status'] == 'failed')
        skipped_count = sum(1 for r in results if r['status'] == 'skipped')
        
        print(f"📊 通知发送完成: 成功 {success_count}, 失败 {failed_count}, 跳过 {skipped_count}")
        return results

# 创建全局实例
notification_service = NotificationService()
