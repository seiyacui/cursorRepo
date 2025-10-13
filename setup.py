"""
安装和初始化脚本
"""
import subprocess
import sys
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def install_requirements():
    """安装Python依赖"""
    print("📦 安装Python依赖...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ 依赖安装成功")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 依赖安装失败: {e}")
        return False

def create_database():
    """创建数据库"""
    print("🗄️ 创建数据库...")
    try:
        # 连接到PostgreSQL服务器（默认数据库）
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password=input("请输入PostgreSQL密码: ")
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # 检查数据库是否存在
        cursor.execute("SELECT 1 FROM pg_database WHERE datname='text2image_db'")
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute("CREATE DATABASE text2image_db")
            print("✅ 数据库创建成功")
        else:
            print("ℹ️ 数据库已存在")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 数据库创建失败: {e}")
        return False

def create_env_file():
    """创建环境配置文件"""
    print("⚙️ 创建环境配置文件...")
    
    env_file = Path(".env")
    if env_file.exists():
        print("ℹ️ .env文件已存在")
        return True
    
    try:
        # 获取用户输入
        db_password = input("请输入PostgreSQL密码: ")
        
        env_content = f"""# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=text2image_db
DB_USER=postgres
DB_PASSWORD={db_password}

# 日志级别
LOG_LEVEL=INFO

# 可选：自定义Hugging Face缓存目录
# HF_HOME=/path/to/your/huggingface/cache

# 可选：自定义图片输出目录
# DEFAULT_OUTPUT_DIR=/path/to/your/images

# 可选：GPU配置 (如果有支持的GPU)
# DEVICE=cuda  # 或 mps (Apple Silicon) 或 cpu
"""
        
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        print("✅ 环境配置文件创建成功")
        return True
        
    except Exception as e:
        print(f"❌ 环境配置文件创建失败: {e}")
        return False

def create_directories():
    """创建必要的目录"""
    print("📁 创建项目目录...")
    
    directories = [
        "static/images",
        "exports", 
        "logs"
    ]
    
    try:
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
        
        print("✅ 项目目录创建成功")
        return True
        
    except Exception as e:
        print(f"❌ 项目目录创建失败: {e}")
        return False

def check_system_requirements():
    """检查系统要求"""
    print("🔍 检查系统要求...")
    
    # 检查Python版本
    if sys.version_info < (3, 8):
        print("❌ Python版本需要3.8或更高")
        return False
    
    print(f"✅ Python版本: {sys.version}")
    
    # 检查PostgreSQL
    try:
        result = subprocess.run(['psql', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ PostgreSQL: {result.stdout.strip()}")
        else:
            print("⚠️ PostgreSQL命令行工具未找到，请确保PostgreSQL已安装")
    except FileNotFoundError:
        print("⚠️ PostgreSQL命令行工具未找到，请确保PostgreSQL已安装")
    
    return True

def main():
    """主安装流程"""
    print("🎨 AI文本转图片工具 - 安装向导")
    print("=" * 50)
    
    # 检查系统要求
    if not check_system_requirements():
        print("❌ 系统要求检查失败")
        return False
    
    # 创建目录
    if not create_directories():
        print("❌ 目录创建失败")
        return False
    
    # 安装依赖
    if not install_requirements():
        print("❌ 依赖安装失败")
        return False
    
    # 创建环境配置文件
    if not create_env_file():
        print("❌ 环境配置失败")
        return False
    
    # 创建数据库
    if not create_database():
        print("❌ 数据库创建失败")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 安装完成!")
    print("\n📋 下一步:")
    print("1. 运行 'python app.py' 启动应用")
    print("2. 在浏览器中访问 http://localhost:7860")
    print("3. 开始使用AI文本转图片工具!")
    print("\n💡 提示:")
    print("- 首次运行时会自动下载Qwen-Image模型（约2-3GB）")
    print("- 请确保有足够的磁盘空间和网络连接")
    print("- 如需修改配置，请编辑 .env 文件")
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 安装被用户中断")
    except Exception as e:
        print(f"\n❌ 安装失败: {e}")
        sys.exit(1)