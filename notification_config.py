"""
通知配置管理模块
用于保存和加载通知开关设置
"""
import json
import os
from pathlib import Path

class NotificationConfig:
    """通知配置管理类"""
    
    CONFIG_FILE = "notification_config.json"
    
    def __init__(self):
        self.config_path = Path(self.CONFIG_FILE)
            self.default_config = {
                'enabled': True,  # 总开关
                'channels': {
                    'wxpusher': True,
                    'pushplus': True,
                    'resend': True,
                    'telegram': True,
                    'qq_email': True  # QQ邮箱
                }
            }
    
    def load_config(self):
        """加载配置"""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    # 合并默认配置，确保所有字段都存在
                    result = self.default_config.copy()
                    result.update(config)
                    if 'channels' in config:
                        result['channels'].update(config['channels'])
                    return result
            except Exception as e:
                print(f"⚠️ 加载通知配置失败: {e}")
                return self.default_config.copy()
        return self.default_config.copy()
    
    def save_config(self, enabled, wxpusher, pushplus, resend, telegram, qq_email):
        """
        保存配置
        
        Args:
            enabled: 总开关
            wxpusher: WxPusher 开关
            pushplus: PushPlus 开关
            resend: Resend Email 开关
            telegram: Telegram 开关
            qq_email: QQ Email 开关
        """
        config = {
            'enabled': enabled,
            'channels': {
                'wxpusher': wxpusher,
                'pushplus': pushplus,
                'resend': resend,
                'telegram': telegram,
                'qq_email': qq_email
            }
        }
        
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            return True, "✅ 配置保存成功！"
        except Exception as e:
            return False, f"❌ 配置保存失败: {e}"
    
    def is_enabled(self):
        """检查通知是否启用（总开关）"""
        config = self.load_config()
        return config.get('enabled', True)
    
    def is_channel_enabled(self, channel):
        """检查特定渠道是否启用"""
        config = self.load_config()
        if not config.get('enabled', True):
            return False  # 总开关关闭，所有渠道都禁用
        return config.get('channels', {}).get(channel, True)
    
    def get_enabled_channels(self):
        """获取所有启用的渠道列表"""
        config = self.load_config()
        if not config.get('enabled', True):
            return []  # 总开关关闭
        
        channels = []
        for channel, enabled in config.get('channels', {}).items():
            if enabled:
                channels.append(channel)
        return channels

# 全局配置管理器
notification_config = NotificationConfig()
