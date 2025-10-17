"""
日志配置模块
提供统一的日志输出格式和功能
"""
import logging
import sys
from datetime import datetime
from pathlib import Path

class ColoredFormatter(logging.Formatter):
    """带颜色的日志格式化器"""
    
    # ANSI 颜色代码
    COLORS = {
        'DEBUG': '\033[36m',      # 青色
        'INFO': '\033[32m',       # 绿色
        'WARNING': '\033[33m',    # 黄色
        'ERROR': '\033[31m',      # 红色
        'CRITICAL': '\033[35m',   # 紫色
        'RESET': '\033[0m'        # 重置
    }
    
    def format(self, record):
        # 添加颜色
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']
        
        # 格式化时间
        record.asctime = self.formatTime(record, '%Y-%m-%d %H:%M:%S')
        
        # 添加颜色到日志级别
        record.levelname_colored = f"{color}{record.levelname}{reset}"
        
        # 格式化消息
        return super().format(record)

def setup_logger(name='Text2ImageGenerator', log_file=None):
    """
    设置日志记录器
    
    Args:
        name: 日志记录器名称
        log_file: 日志文件路径（可选）
    
    Returns:
        logger: 配置好的日志记录器
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # 避免重复添加处理器
    if logger.handlers:
        return logger
    
    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # 使用带颜色的格式化器
    console_format = '%(asctime)s [%(levelname_colored)s] %(message)s'
    console_formatter = ColoredFormatter(console_format)
    console_handler.setFormatter(console_formatter)
    
    logger.addHandler(console_handler)
    
    # 文件处理器（如果指定了日志文件）
    if log_file:
        # 确保日志目录存在
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        
        # 文件日志不需要颜色
        file_format = '%(asctime)s [%(levelname)s] %(message)s'
        file_formatter = logging.Formatter(file_format)
        file_handler.setFormatter(file_formatter)
        
        logger.addHandler(file_handler)
    
    return logger

def log_separator(logger, char='=', length=80):
    """打印分隔线"""
    logger.info(char * length)

def log_section(logger, title, char='━', length=80):
    """打印章节标题"""
    logger.info(f"\n{char * length}")
    logger.info(f"  {title}")
    logger.info(char * length)

def log_generation_start(logger, prompt, params):
    """记录生成开始"""
    log_section(logger, "🎨 开始生成图片")
    logger.info(f"📝 提示词: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    logger.info(f"⚙️  生成参数:")
    for key, value in params.items():
        logger.info(f"   • {key}: {value}")

def log_generation_success(logger, result):
    """记录生成成功"""
    log_section(logger, "✅ 图片生成成功")
    logger.info(f"📁 文件路径: {result['image_path']}")
    logger.info(f"📐 图片尺寸: {result.get('image_dimensions', '未知')}")
    logger.info(f"📊 文件大小: {format_size(result['file_size'])}")
    logger.info(f"⏱️  生成耗时: {result['generation_time']}")
    logger.info(f"🔢 推理步数: {result['num_inference_steps']}")
    logger.info(f"📈 引导比例: {result['guidance_scale']}")
    logger.info(f"🕐 完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log_separator(logger)

def log_generation_error(logger, error):
    """记录生成失败"""
    log_section(logger, "❌ 图片生成失败")
    logger.error(f"错误信息: {str(error)}")
    logger.error(f"错误类型: {type(error).__name__}")
    log_separator(logger)

def log_database_operation(logger, operation, success, details=None):
    """记录数据库操作"""
    status = "✅ 成功" if success else "❌ 失败"
    logger.info(f"💾 数据库操作 [{operation}]: {status}")
    if details:
        logger.info(f"   详情: {details}")

def log_notification_status(logger, enabled, channels):
    """记录通知状态"""
    if enabled:
        logger.info(f"🔔 通知已启用 - 活动渠道: {', '.join(channels)}")
    else:
        logger.info(f"🔕 通知已禁用")

def format_size(size_bytes):
    """格式化文件大小"""
    if not size_bytes:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"
