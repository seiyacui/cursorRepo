#!/usr/bin/env python3
"""
通知功能测试脚本
用于测试4种通知渠道是否配置正确
"""
from notification_service import NotificationService
from datetime import datetime

def test_single_notification():
    """测试单个图片生成通知"""
    print("=" * 60)
    print("测试单个图片生成通知")
    print("=" * 60)
    
    notification_service = NotificationService()
    
    # 模拟生成结果
    test_result = {
        'success': True,
        'prompt': '一个穿着QWEN T恤的中国美女，手持黑马克笔微笑，身后玻璃板上手写：Qwen-Image 的未来：赋能内容创作',
        'image_path': '/path/to/output/test_image_20241010_120000.png',
        'filename': 'test_image_20241010_120000.png',
        'file_size': 2048000,  # 2MB
        'generation_time': '45.23秒',
        'num_inference_steps': 28,
        'guidance_scale': 7.5
    }
    
    # 发送通知
    notification_service.send_image_generation_notification(test_result)
    
    print("\n测试完成！请检查各通知渠道是否收到消息。\n")

def test_batch_notification():
    """测试批量生成通知"""
    print("=" * 60)
    print("测试批量生成通知")
    print("=" * 60)
    
    notification_service = NotificationService()
    
    # 模拟批量生成结果
    test_records = [
        {
            'status': '完成',
            'prompt': '一个美丽的日出景象，金色的阳光洒满大地',
            'file_size': 1536000,
            'generation_time': '42.5秒'
        },
        {
            'status': '完成',
            'prompt': '赛博朋克风格的未来城市，霓虹灯闪烁',
            'file_size': 2048000,
            'generation_time': '48.2秒'
        },
        {
            'status': '失败',
            'prompt': '测试失败的情况',
            'file_size': 0,
            'generation_time': '0秒'
        }
    ]
    
    total_time = 125.5
    
    # 发送通知
    notification_service.send_batch_notification(test_records, total_time)
    
    print("\n测试完成！请检查各通知渠道是否收到消息。\n")

def check_config():
    """检查通知配置"""
    print("=" * 60)
    print("检查通知配置")
    print("=" * 60)
    
    notification_service = NotificationService()
    
    print("\n当前配置状态：\n")
    
    # WxPusher
    wxpusher_ok = bool(notification_service.config['wxpusher']['token'] and 
                       notification_service.config['wxpusher']['uid'])
    print(f"WxPusher:     {'✅ 已配置' if wxpusher_ok else '❌ 未配置'}")
    
    # PushPlus
    pushplus_ok = bool(notification_service.config['pushplus']['token'])
    print(f"PushPlus:     {'✅ 已配置' if pushplus_ok else '❌ 未配置'}")
    
    # Resend Email
    resend_ok = bool(notification_service.config['resend']['api_key'] and 
                     notification_service.config['resend']['to_email'])
    print(f"Resend Email: {'✅ 已配置' if resend_ok else '❌ 未配置'}")
    
    # Telegram
    telegram_ok = bool(notification_service.config['telegram']['bot_token'] and 
                       notification_service.config['telegram']['chat_id'])
    print(f"Telegram:     {'✅ 已配置' if telegram_ok else '❌ 未配置'}")
    
    print(f"\n配置的渠道数: {sum([wxpusher_ok, pushplus_ok, resend_ok, telegram_ok])}/4\n")

if __name__ == "__main__":
    import sys
    
    print("\n🔔 通知功能测试工具\n")
    
    # 先检查配置
    check_config()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == 'single':
            test_single_notification()
        elif sys.argv[1] == 'batch':
            test_batch_notification()
        elif sys.argv[1] == 'config':
            # 已经执行过了
            pass
        else:
            print("用法:")
            print("  python3 test_notification.py config  # 检查配置")
            print("  python3 test_notification.py single  # 测试单个通知")
            print("  python3 test_notification.py batch   # 测试批量通知")
    else:
        print("请选择测试类型:")
        print("  1. 检查配置 (config)")
        print("  2. 测试单个图片生成通知 (single)")
        print("  3. 测试批量生成通知 (batch)")
        print("\n用法: python3 test_notification.py [config|single|batch]")
