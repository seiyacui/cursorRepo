"""
配置文件 - 文本转图片工具
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 项目根目录
BASE_DIR = Path(__file__).parent.parent

# Hugging Face 缓存目录 (根据您的环境配置)
HF_HOME = "/Volumes/Mont125 - Données/Users/seigneur/.cache/tahoe26/huggingface"
os.environ['HF_HOME'] = HF_HOME

# 数据库配置
DATABASE_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'text2image_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
}

# 数据库URL
DATABASE_URL = f"postgresql://{DATABASE_CONFIG['user']}:{DATABASE_CONFIG['password']}@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}"

# 图片存储配置
DEFAULT_OUTPUT_DIR = BASE_DIR / "static" / "images"
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 导出文件目录
EXPORT_DIR = BASE_DIR / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

# AI模型配置
MODEL_CONFIG = {
    'model_name': "Qwen/Qwen-Image",
    'torch_dtype': 'bfloat16',
    'device': 'cpu',  # 根据您的硬件配置，可以改为 'cuda' 或 'mps'
    'num_inference_steps': 28,
    'guidance_scale': 7.5,
}

# Gradio配置
GRADIO_CONFIG = {
    'server_name': "0.0.0.0",
    'server_port': 7860,
    'share': False,
    'debug': True,
    'theme': "soft",
    'title': "🎨 AI文本转图片工具",
    'description': "基于Qwen-Image模型的文本转图片生成工具",
}

# 文件配置
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.webp']

# 分页配置
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# 日志配置
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = BASE_DIR / "logs" / "app.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# 导出格式配置
EXPORT_FORMATS = {
    'excel': {
        'extension': '.xlsx',
        'mime_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    'html': {
        'extension': '.html',
        'mime_type': 'text/html'
    },
    'txt': {
        'extension': '.txt',
        'mime_type': 'text/plain'
    },
    'markdown': {
        'extension': '.md',
        'mime_type': 'text/markdown'
    }
}

# 时间格式
DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"
DATE_FORMAT = "%Y-%m-%d"

# 缓存配置
CACHE_ENABLED = True
CACHE_TTL = 3600  # 1小时

print(f"✅ 配置加载完成")
print(f"📁 项目根目录: {BASE_DIR}")
print(f"🤖 HF缓存目录: {HF_HOME}")
print(f"🖼️  默认输出目录: {DEFAULT_OUTPUT_DIR}")
print(f"💾 数据库: {DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}")