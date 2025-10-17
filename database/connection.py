"""
数据库连接管理
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from loguru import logger
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import DATABASE_CONFIG, DATABASE_URL

class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self._init_engine()
    
    def _init_engine(self):
        """初始化数据库引擎"""
        try:
            self.engine = create_engine(
                DATABASE_URL,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=300
            )
            self.SessionLocal = sessionmaker(bind=self.engine)
            logger.info("✅ 数据库引擎初始化成功")
        except Exception as e:
            logger.error(f"❌ 数据库引擎初始化失败: {e}")
            raise
    
    @contextmanager
    def get_session(self):
        """获取数据库会话"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"❌ 数据库操作失败: {e}")
            raise
        finally:
            session.close()
    
    def get_connection(self):
        """获取原始数据库连接"""
        try:
            return psycopg2.connect(
                host=DATABASE_CONFIG['host'],
                port=DATABASE_CONFIG['port'],
                database=DATABASE_CONFIG['database'],
                user=DATABASE_CONFIG['user'],
                password=DATABASE_CONFIG['password'],
                cursor_factory=RealDictCursor
            )
        except Exception as e:
            logger.error(f"❌ 获取数据库连接失败: {e}")
            raise
    
    def test_connection(self):
        """测试数据库连接"""
        try:
            with self.get_session() as session:
                result = session.execute(text("SELECT 1"))
                logger.info("✅ 数据库连接测试成功")
                return True
        except Exception as e:
            logger.error(f"❌ 数据库连接测试失败: {e}")
            return False
    
    def init_database(self):
        """初始化数据库（创建表和索引）"""
        try:
            schema_file = Path(__file__).parent / "schema.sql"
            if not schema_file.exists():
                logger.error("❌ 数据库模式文件不存在")
                return False
            
            with open(schema_file, 'r', encoding='utf-8') as f:
                schema_sql = f.read()
            
            with self.get_session() as session:
                # 分割SQL语句并执行
                statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
                for statement in statements:
                    if statement:
                        session.execute(text(statement))
                
                logger.info("✅ 数据库初始化成功")
                return True
                
        except Exception as e:
            logger.error(f"❌ 数据库初始化失败: {e}")
            return False
    
    def execute_query(self, query, params=None):
        """执行查询并返回结果"""
        try:
            conn = self.get_connection()
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params or ())
                    if cursor.description:  # 有返回结果
                        return cursor.fetchall()
                    else:  # 无返回结果（INSERT, UPDATE, DELETE等）
                        return cursor.rowcount
        except Exception as e:
            logger.error(f"❌ 执行查询失败: {e}")
            raise
    
    def execute_many(self, query, params_list):
        """批量执行查询"""
        try:
            conn = self.get_connection()
            with conn:
                with conn.cursor() as cursor:
                    cursor.executemany(query, params_list)
                    return cursor.rowcount
        except Exception as e:
            logger.error(f"❌ 批量执行查询失败: {e}")
            raise

# 创建全局数据库管理器实例
db_manager = DatabaseManager()

def get_db_manager():
    """获取数据库管理器实例"""
    return db_manager

def init_db():
    """初始化数据库"""
    logger.info("🔄 开始初始化数据库...")
    
    # 测试连接
    if not db_manager.test_connection():
        logger.error("❌ 数据库连接失败，请检查配置")
        return False
    
    # 初始化数据库结构
    if not db_manager.init_database():
        logger.error("❌ 数据库结构初始化失败")
        return False
    
    logger.info("✅ 数据库初始化完成")
    return True

if __name__ == "__main__":
    # 测试数据库连接
    init_db()