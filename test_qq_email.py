"""
测试QQ邮箱服务
"""
from qq_email_service import qq_email_service

def test_qq_email():
    """测试QQ邮箱发送"""
    print("=" * 60)
    print("🧪 测试 QQ 邮箱服务")
    print("=" * 60)
    
    # 测试连接
    print("\n1️⃣  测试连接...")
    if qq_email_service.test_connection():
        print("✅ 连接测试成功\n")
    else:
        print("❌ 连接测试失败\n")
        return
    
    # 测试发送简单邮件
    print("2️⃣  测试发送简单邮件...")
    result = qq_email_service.send_email(
        to=qq_email_service.default_recipients,
        subject="🧪 QQ邮箱测试",
        text="这是一封测试邮件。\n\n如果您收到此邮件，说明QQ邮箱服务配置成功！",
        html="""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #667eea;">🧪 QQ邮箱测试</h2>
            <p>这是一封测试邮件。</p>
            <p><strong>如果您收到此邮件，说明QQ邮箱服务配置成功！</strong></p>
            <hr>
            <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复</p>
        </body>
        </html>
        """
    )
    
    if result['success']:
        print(f"✅ {result['message']}\n")
    else:
        print(f"❌ {result['message']}\n")
    
    # 测试发送图片通知
    print("3️⃣  测试发送图片生成通知...")
    image_data = {
        'prompt': 'A beautiful sunset over the ocean with vibrant colors',
        'image_path': './outputs/test_image.png',
        'image_dimensions': '1024x1024',
        'file_size': 1024 * 1024 * 1.5,  # 1.5 MB
        'generation_time': '23.45秒',
        'num_inference_steps': 28,
        'guidance_scale': '7.5'
    }
    
    result = qq_email_service.send_image_notification(image_data)
    
    if result['success']:
        print(f"✅ {result['message']}\n")
    else:
        print(f"❌ {result['message']}\n")
    
    print("=" * 60)
    print("✅ 测试完成！")
    print("=" * 60)
    print("\n📧 请检查收件箱（可能在垃圾邮件中）")
    print(f"📬 收件人: {', '.join(qq_email_service.default_recipients)}")

if __name__ == "__main__":
    test_qq_email()
