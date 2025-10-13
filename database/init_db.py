"""
数据库初始化脚本
"""
import os
from sqlalchemy import create_engine, Column, Integer, String, Text, BigInteger, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# 数据库连接
DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"

Base = declarative_base()

class GeneratedImage(Base):
    """生成图片记录表"""
    __tablename__ = 'generated_images'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    prompt = Column(Text, nullable=False, comment='文本提示词')
    image_path = Column(String(500), nullable=False, comment='图片路径')
    image_size = Column(BigInteger, comment='图片大小（字节）')
    num_inference_steps = Column(Integer, comment='推理步数')
    guidance_scale = Column(String(20), comment='引导比例')
    generation_time = Column(String(50), comment='生成耗时')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    
    def __repr__(self):
        return f"<GeneratedImage(id={self.id}, prompt='{self.prompt[:50]}...')>"

def init_database():
    """初始化数据库表"""
    try:
        engine = create_engine(DATABASE_URL, echo=True)
        
        # 创建所有表
        Base.metadata.create_all(engine)
        
        print("✅ 数据库表创建成功！")
        
        # 创建索引
        from sqlalchemy import Index
        Index('idx_created_at', GeneratedImage.created_at).create(engine, checkfirst=True)
        Index('idx_prompt', GeneratedImage.prompt, postgresql_using='gin', 
              postgresql_ops={'prompt': 'gin_trgm_ops'}).create(engine, checkfirst=True)
        
        print("✅ 索引创建成功！")
        
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        raise

if __name__ == "__main__":
    print("🔧 开始初始化数据库...")
    init_database()
    print("🎉 数据库初始化完成！")
