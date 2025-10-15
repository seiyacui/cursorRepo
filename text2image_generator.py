"""
文本转图片生成器
基于 Qwen-Image 模型
"""
import os
import torch
from diffusers import QwenImagePipeline
from PIL import Image
import time
from datetime import datetime
from dotenv import load_dotenv
from logger_config import setup_logger, log_generation_start, log_generation_success, log_generation_error

load_dotenv()

# 设置日志记录器
logger = setup_logger('Text2ImageGenerator', 'logs/generator.log')

class Text2ImageGenerator:
    """文本转图片生成器类"""
    
    def __init__(self):
        # 设置 HuggingFace 缓存目录
        hf_home = os.getenv('HF_HOME', '/Volumes/Mont125 - Données/Users/seigneur/.cache/tahoe26/huggingface')
        os.environ['HF_HOME'] = hf_home
        
        self.model_name = os.getenv('MODEL_NAME', 'Qwen/Qwen-Image')
        self.device = os.getenv('DEVICE', 'cpu')
        self.torch_dtype = getattr(torch, os.getenv('TORCH_DTYPE', 'bfloat16'))
        
        self.pipeline = None
        self.is_loaded = False
    
    def load_model(self, progress_callback=None):
        """加载模型"""
        if self.is_loaded:
            return True
        
        try:
            if progress_callback:
                progress_callback("正在加载模型...", 0.1)
            
            print(f"📦 开始加载模型: {self.model_name}")
            print(f"🖥️  设备: {self.device}")
            print(f"📂 缓存目录: {os.environ['HF_HOME']}")
            
            self.pipeline = QwenImagePipeline.from_pretrained(
                self.model_name,
                torch_dtype=self.torch_dtype
            )
            
            if progress_callback:
                progress_callback("正在将模型移至设备...", 0.5)
            
            self.pipeline.to(self.device)
            
            if progress_callback:
                progress_callback("模型加载完成！", 1.0)
            
            self.is_loaded = True
            print("✅ 模型加载成功！")
            return True
            
        except Exception as e:
            error_msg = f"❌ 模型加载失败: {str(e)}"
            print(error_msg)
            if progress_callback:
                progress_callback(error_msg, 0)
            raise e
    
    def generate_image(self, prompt, output_dir=None, 
                      num_inference_steps=None, 
                      guidance_scale=None,
                      progress_callback=None):
        """
        生成图片
        
        Args:
            prompt: 文本提示词
            output_dir: 输出目录
            num_inference_steps: 推理步数
            guidance_scale: 引导比例
            progress_callback: 进度回调函数
        
        Returns:
            dict: 包含图片路径、大小、耗时等信息
        """
        if not self.is_loaded:
            self.load_model(progress_callback)
        
        # 默认参数
        if num_inference_steps is None:
            num_inference_steps = int(os.getenv('DEFAULT_NUM_INFERENCE_STEPS', 28))
        if guidance_scale is None:
            guidance_scale = float(os.getenv('DEFAULT_GUIDANCE_SCALE', 7.5))
        if output_dir is None:
            output_dir = os.getenv('DEFAULT_OUTPUT_DIR', './outputs')
        
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            if progress_callback:
                progress_callback("开始生成图片...", 0.2)
            
            start_time = time.time()
            
            # 记录生成开始
            params = {
                '推理步数': num_inference_steps,
                '引导比例': guidance_scale,
                '输出目录': output_dir
            }
            log_generation_start(logger, prompt, params)
            
            print(f"🎨 生成参数:")
            print(f"   提示词: {prompt}")
            print(f"   推理步数: {num_inference_steps}")
            print(f"   引导比例: {guidance_scale}")
            
            # 生成图片
            image = self.pipeline(
                prompt, 
                num_inference_steps=num_inference_steps, 
                guidance_scale=guidance_scale
            ).images[0]
            
            if progress_callback:
                progress_callback("正在保存图片...", 0.8)
            
            # 生成文件名（使用时间戳）
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"text2img_{timestamp}.png"
            filepath = os.path.join(output_dir, filename)
            
            # 保存图片
            image.save(filepath)
            
            # 获取文件大小和图片尺寸
            file_size = os.path.getsize(filepath)
            image_width, image_height = image.size
            image_dimensions = f"{image_width}x{image_height}"
            
            # 计算耗时
            elapsed_time = time.time() - start_time
            
            if progress_callback:
                progress_callback("图片生成完成！", 1.0)
            
            result = {
                'success': True,
                'image_path': filepath,
                'filename': filename,
                'file_size': file_size,
                'image_dimensions': image_dimensions,
                'generation_time': f"{elapsed_time:.2f}秒",
                'elapsed_seconds': elapsed_time,
                'num_inference_steps': num_inference_steps,
                'guidance_scale': guidance_scale,
                'prompt': prompt
            }
            
            # 记录生成成功
            log_generation_success(logger, result)
            
            print(f"✅ 图片生成成功！")
            print(f"   路径: {filepath}")
            print(f"   尺寸: {image_dimensions}")
            print(f"   大小: {self._format_size(file_size)}")
            print(f"   耗时: {elapsed_time:.2f}秒")
            
            return result
            
        except Exception as e:
            # 记录生成失败
            log_generation_error(logger, e)
            
            error_msg = f"❌ 图片生成失败: {str(e)}"
            print(error_msg)
            if progress_callback:
                progress_callback(error_msg, 0)
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def _format_size(self, size_bytes):
        """格式化文件大小"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"
