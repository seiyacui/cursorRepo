#!/usr/bin/env python3
"""
快速启动脚本 - AI文本转图片工具
"""
import os
import sys
import subprocess
from pathlib import Path
from loguru import logger

def check_requirements():
    """检查运行要求"""
    print("🔍 检查运行环境...")
    
    # 检查Python版本
    if sys.version_info < (3, 8):
        print("❌ Python版本需要3.8或更高")
        return False
    
    # 检查必要文件
    required_files = [
        "app.py",
        "requirements.txt", 
        "config/settings.py",
        "database/connection.py"
    ]
    
    for file_path in required_files:
        if not Path(file_path).exists():
            print(f"❌ 缺少必要文件: {file_path}")
            return False
    
    # 检查.env文件
    if not Path(".env").exists():
        print("⚠️ 未找到.env配置文件")
        print("💡 请运行 'python setup.py' 进行初始化")
        return False
    
    print("✅ 运行环境检查通过")
    return True

def check_dependencies():
    """检查Python依赖"""
    print("📦 检查Python依赖...")
    
    try:
        import gradio
        import psycopg2
        import torch
        import diffusers
        print("✅ 核心依赖已安装")
        return True
    except ImportError as e:
        print(f"❌ 缺少依赖: {e}")
        print("💡 请运行 'pip install -r requirements.txt' 安装依赖")
        return False

def check_database():
    """检查数据库连接"""
    print("🗄️ 检查数据库连接...")
    
    try:
        from database.connection import get_db_manager
        db = get_db_manager()
        if db.test_connection():
            print("✅ 数据库连接正常")
            return True
        else:
            print("❌ 数据库连接失败")
            return False
    except Exception as e:
        print(f"❌ 数据库检查失败: {e}")
        print("💡 请检查PostgreSQL服务和配置")
        return False

def start_application():
    """启动应用"""
    print("🚀 启动AI文本转图片工具...")
    
    try:
        # 设置环境变量
        os.environ['PYTHONPATH'] = str(Path.cwd())
        
        # 启动应用
        subprocess.run([sys.executable, "app.py"], check=True)
        
    except KeyboardInterrupt:
        print("\n👋 用户中断，应用退出")
    except subprocess.CalledProcessError as e:
        print(f"❌ 应用启动失败: {e}")
        return False
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return False
    
    return True

def main():
    """主函数"""
    print("🎨 AI文本转图片工具")
    print("=" * 50)
    
    # 检查运行要求
    if not check_requirements():
        print("\n💡 解决方案:")
        print("1. 运行 'python setup.py' 进行完整安装")
        print("2. 检查Python版本和项目文件")
        return False
    
    # 检查依赖
    if not check_dependencies():
        print("\n💡 解决方案:")
        print("1. 运行 'pip install -r requirements.txt'")
        print("2. 或运行 'python setup.py' 自动安装")
        return False
    
    # 检查数据库
    if not check_database():
        print("\n💡 解决方案:")
        print("1. 启动PostgreSQL服务")
        print("2. 检查.env文件中的数据库配置")
        print("3. 运行 'python setup.py' 重新配置")
        return False
    
    print("\n✅ 所有检查通过，准备启动应用...")
    print("📱 应用将在 http://localhost:7860 启动")
    print("🔄 首次运行可能需要下载模型，请耐心等待...")
    print("\n按 Ctrl+C 可随时退出应用")
    print("-" * 50)
    
    # 启动应用
    return start_application()

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            sys.exit(1)
    except Exception as e:
        logger.error(f"❌ 启动失败: {e}")
        sys.exit(1)