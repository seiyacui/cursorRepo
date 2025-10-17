"""
文本转图片服务 - 基于Qwen-Image模型
"""
import os
import time
import torch
from pathlib import Path
from datetime import datetime
from PIL import Image
from diffusers import QwenImagePipeline
from loguru import logger
import sys

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import MODEL_CONFIG, HF_HOME, DEFAULT_OUTPUT_DIR
from models.text_image_record import TextImageRecord

class Text2ImageService:
    def __init__(self):
        self.pipeline = None
        self.model_loaded = False
        self._load_model()
    
    def _load_model(self):
        """加载AI模型"""
        try:
            logger.info("🤖 开始加载Qwen-Image模型...")
            
            # 设置Hugging Face缓存目录
            os.environ['HF_HOME'] = HF_HOME
            
            # 加载模型
            self.pipeline = QwenImagePipeline.from_pretrained(
                MODEL_CONFIG['model_name'],
                torch_dtype=getattr(torch, MODEL_CONFIG['torch_dtype'])
            )
            
            # 设置设备
            device = MODEL_CONFIG['device']
            if device == 'mps' and torch.backends.mps.is_available():
                self.pipeline.to("mps")
                logger.info("🚀 使用Apple Silicon GPU (MPS)")
            elif device == 'cuda' and torch.cuda.is_available():
                self.pipeline.to("cuda")
                logger.info("🚀 使用NVIDIA GPU (CUDA)")
            else:
                self.pipeline.to("cpu")
                logger.info("💻 使用CPU")
            
            self.model_loaded = True
            logger.info("✅ Qwen-Image模型加载成功")
            
        except Exception as e:
            logger.error(f"❌ 模型加载失败: {e}")
            self.model_loaded = False
            raise
    
    def generate_image(self, text_content, output_dir=None, progress_callback=None):
        """
        生成图片
        
        Args:
            text_content (str): 输入文本
            output_dir (str): 输出目录
            progress_callback (callable): 进度回调函数
            
        Returns:
            dict: 生成结果
        """
        if not self.model_loaded:
            raise RuntimeError("模型未加载，无法生成图片")
        
        if not text_content.strip():
            raise ValueError("文本内容不能为空")
        
        # 设置输出目录
        if output_dir:
            output_path = Path(output_dir)
        else:
            output_path = DEFAULT_OUTPUT_DIR
        
        output_path.mkdir(parents=True, exist_ok=True)
        
        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"qwen_image_{timestamp}.png"
        image_path = output_path / filename
        
        # 创建数据库记录
        record = TextImageRecord.create(
            text_content=text_content,
            image_filename=filename,
            image_path=str(image_path),
            output_directory=str(output_path),
            model_name=MODEL_CONFIG['model_name'],
            inference_steps=MODEL_CONFIG['num_inference_steps'],
            guidance_scale=MODEL_CONFIG['guidance_scale']
        )
        
        try:
            # 更新状态为生成中
            TextImageRecord.update_status(record['id'], 'generating')
            
            if progress_callback:
                progress_callback(0.1, "开始生成图片...")
            
            # 记录开始时间
            start_time = time.time()
            
            logger.info(f"🎨 开始生成图片: {text_content[:50]}...")
            
            if progress_callback:
                progress_callback(0.3, "AI模型处理中...")
            
            # 生成图片
            image = self.pipeline(
                text_content,
                num_inference_steps=MODEL_CONFIG['num_inference_steps'],
                guidance_scale=MODEL_CONFIG['guidance_scale']
            ).images[0]
            
            if progress_callback:
                progress_callback(0.8, "保存图片...")
            
            # 保存图片
            image.save(str(image_path))
            
            # 计算生成时间
            generation_time = time.time() - start_time
            
            # 获取图片信息
            image_size = image_path.stat().st_size
            width, height = image.size
            
            if progress_callback:
                progress_callback(0.9, "更新数据库...")
            
            # 更新数据库记录
            TextImageRecord.update_completion(
                record['id'],
                image_size=image_size,
                image_width=width,
                image_height=height,
                generation_time=generation_time
            )
            
            if progress_callback:
                progress_callback(1.0, "生成完成!")
            
            logger.info(f"✅ 图片生成成功: {filename} ({generation_time:.2f}秒)")
            
            return {
                'success': True,
                'record_id': record['id'],
                'filename': filename,
                'image_path': str(image_path),
                'image_size': image_size,
                'width': width,
                'height': height,
                'generation_time': generation_time,
                'message': f'图片生成成功，耗时 {generation_time:.2f} 秒'
            }
            
        except Exception as e:
            # 更新状态为失败
            TextImageRecord.update_status(record['id'], 'failed', str(e))
            logger.error(f"❌ 图片生成失败: {e}")
            
            if progress_callback:
                progress_callback(1.0, f"生成失败: {str(e)}")
            
            return {
                'success': False,
                'record_id': record['id'],
                'error': str(e),
                'message': f'图片生成失败: {str(e)}'
            }
    
    def batch_generate(self, text_list, output_dir=None, progress_callback=None):
        """
        批量生成图片
        
        Args:
            text_list (list): 文本列表
            output_dir (str): 输出目录
            progress_callback (callable): 进度回调函数
            
        Returns:
            list: 生成结果列表
        """
        results = []
        total_count = len(text_list)
        
        for i, text_content in enumerate(text_list):
            try:
                if progress_callback:
                    overall_progress = i / total_count
                    progress_callback(overall_progress, f"生成第 {i+1}/{total_count} 张图片...")
                
                result = self.generate_image(text_content, output_dir)
                results.append(result)
                
            except Exception as e:
                logger.error(f"❌ 批量生成第 {i+1} 张图片失败: {e}")
                results.append({
                    'success': False,
                    'error': str(e),
                    'text_content': text_content
                })
        
        if progress_callback:
            progress_callback(1.0, f"批量生成完成! 共处理 {total_count} 张图片")
        
        return results
    
    def get_model_info(self):
        """获取模型信息"""
        return {
            'model_name': MODEL_CONFIG['model_name'],
            'device': MODEL_CONFIG['device'],
            'loaded': self.model_loaded,
            'inference_steps': MODEL_CONFIG['num_inference_steps'],
            'guidance_scale': MODEL_CONFIG['guidance_scale']
        }
    
    def reload_model(self):
        """重新加载模型"""
        logger.info("🔄 重新加载模型...")
        self.model_loaded = False
        self.pipeline = None
        self._load_model()

# 创建全局服务实例
text2image_service = Text2ImageService()

def get_text2image_service():
    """获取文本转图片服务实例"""
    return text2image_service

if __name__ == "__main__":
    # 测试服务
    service = get_text2image_service()
    print("模型信息:", service.get_model_info())
    
    # 测试生成图片
    test_text = "一只可爱的小猫咪在花园里玩耍"
    result = service.generate_image(test_text)
    print("生成结果:", result)