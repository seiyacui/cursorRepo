"""
数据库管理器
"""
import os
from sqlalchemy import create_engine, desc, and_, or_
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv
from database.init_db import GeneratedImage

load_dotenv()

class DatabaseManager:
    """数据库管理类"""
    
    def __init__(self):
        DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
        self.engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def add_image(self, prompt, image_path, image_size, num_inference_steps, 
                  guidance_scale, generation_time):
        """添加图片记录"""
        try:
            new_image = GeneratedImage(
                prompt=prompt,
                image_path=image_path,
                image_size=image_size,
                num_inference_steps=num_inference_steps,
                guidance_scale=str(guidance_scale),
                generation_time=generation_time
            )
            self.session.add(new_image)
            self.session.commit()
            return new_image.id
        except Exception as e:
            self.session.rollback()
            raise e
    
    def get_all_images(self, limit=None):
        """获取所有图片记录"""
        query = self.session.query(GeneratedImage).order_by(desc(GeneratedImage.created_at))
        if limit:
            query = query.limit(limit)
        return query.all()
    
    def search_images(self, keyword=None, start_date=None, end_date=None):
        """搜索图片记录"""
        query = self.session.query(GeneratedImage)
        
        conditions = []
        
        if keyword:
            conditions.append(GeneratedImage.prompt.ilike(f'%{keyword}%'))
        
        if start_date:
            conditions.append(GeneratedImage.created_at >= start_date)
        
        if end_date:
            conditions.append(GeneratedImage.created_at <= end_date)
        
        if conditions:
            query = query.filter(and_(*conditions))
        
        return query.order_by(desc(GeneratedImage.created_at)).all()
    
    def get_image_by_id(self, image_id):
        """根据ID获取图片记录"""
        return self.session.query(GeneratedImage).filter(
            GeneratedImage.id == image_id
        ).first()
    
    def delete_image(self, image_id):
        """删除图片记录"""
        try:
            image = self.get_image_by_id(image_id)
            if image:
                self.session.delete(image)
                self.session.commit()
                return True
            return False
        except Exception as e:
            self.session.rollback()
            raise e
    
    def get_statistics(self):
        """获取统计信息"""
        total = self.session.query(GeneratedImage).count()
        total_size = self.session.query(
            GeneratedImage.image_size
        ).all()
        
        size_sum = sum([s[0] or 0 for s in total_size])
        
        return {
            'total_images': total,
            'total_size': size_sum
        }
    
    def close(self):
        """关闭数据库连接"""
        self.session.close()
