"""
数据库迁移脚本 - 添加 image_dimensions 字段
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def migrate():
    """执行数据库迁移"""
    DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    
    try:
        engine = create_engine(DATABASE_URL, echo=True)
        
        with engine.connect() as conn:
            print("🔄 开始数据库迁移...")
            
            # 检查字段是否已存在
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='generated_images' 
                AND column_name='image_dimensions';
            """)
            
            result = conn.execute(check_sql)
            if result.fetchone():
                print("⚠️  image_dimensions 字段已存在，跳过迁移")
                return
            
            # 添加新列
            print("📝 添加 image_dimensions 字段...")
            conn.execute(text("""
                ALTER TABLE generated_images 
                ADD COLUMN image_dimensions VARCHAR(50);
            """))
            
            # 添加注释
            print("📝 添加字段注释...")
            conn.execute(text("""
                COMMENT ON COLUMN generated_images.image_dimensions 
                IS '图片尺寸（宽x高）';
            """))
            
            conn.commit()
            
            print("✅ 数据库迁移成功！")
            print("   • 添加了 image_dimensions 字段")
            print("   • 已有记录的该字段为 NULL（显示为'未知'）")
            print("   • 新生成的图片将自动记录尺寸")
            
    except Exception as e:
        print(f"❌ 数据库迁移失败: {e}")
        raise

if __name__ == "__main__":
    migrate()
