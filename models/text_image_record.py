"""
文本转图片记录数据模型
"""
from datetime import datetime, date
from typing import List, Dict, Optional, Any
from loguru import logger
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent.parent))

from database.connection import get_db_manager

class TextImageRecord:
    """文本转图片记录模型"""
    
    @staticmethod
    def create(text_content: str, image_filename: str, image_path: str, 
               output_directory: str, model_name: str = 'Qwen/Qwen-Image',
               inference_steps: int = 28, guidance_scale: float = 7.5) -> Dict[str, Any]:
        """
        创建新的文本转图片记录
        
        Args:
            text_content: 文本内容
            image_filename: 图片文件名
            image_path: 图片路径
            output_directory: 输出目录
            model_name: 模型名称
            inference_steps: 推理步数
            guidance_scale: 引导比例
            
        Returns:
            Dict: 创建的记录
        """
        try:
            db = get_db_manager()
            query = """
                INSERT INTO text_to_image_records 
                (text_content, image_filename, image_path, output_directory, 
                 model_name, inference_steps, guidance_scale, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """
            params = (
                text_content, image_filename, image_path, output_directory,
                model_name, inference_steps, guidance_scale, 'pending'
            )
            
            result = db.execute_query(query, params)
            if result:
                logger.info(f"✅ 创建记录成功: {image_filename}")
                return dict(result[0])
            else:
                raise Exception("创建记录失败")
                
        except Exception as e:
            logger.error(f"❌ 创建记录失败: {e}")
            raise
    
    @staticmethod
    def update_status(record_id: int, status: str, error_message: str = None) -> bool:
        """
        更新记录状态
        
        Args:
            record_id: 记录ID
            status: 状态 (pending, generating, completed, failed)
            error_message: 错误信息（可选）
            
        Returns:
            bool: 是否更新成功
        """
        try:
            db = get_db_manager()
            query = """
                UPDATE text_to_image_records 
                SET status = %s, error_message = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            params = (status, error_message, record_id)
            
            rows_affected = db.execute_query(query, params)
            success = rows_affected > 0
            
            if success:
                logger.info(f"✅ 更新记录状态成功: ID={record_id}, status={status}")
            else:
                logger.warning(f"⚠️ 未找到记录: ID={record_id}")
                
            return success
            
        except Exception as e:
            logger.error(f"❌ 更新记录状态失败: {e}")
            return False
    
    @staticmethod
    def update_completion(record_id: int, image_size: int, image_width: int, 
                         image_height: int, generation_time: float) -> bool:
        """
        更新完成信息
        
        Args:
            record_id: 记录ID
            image_size: 图片大小
            image_width: 图片宽度
            image_height: 图片高度
            generation_time: 生成时间
            
        Returns:
            bool: 是否更新成功
        """
        try:
            db = get_db_manager()
            query = """
                UPDATE text_to_image_records 
                SET image_size = %s, image_width = %s, image_height = %s, 
                    generation_time = %s, status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            params = (image_size, image_width, image_height, generation_time, record_id)
            
            rows_affected = db.execute_query(query, params)
            success = rows_affected > 0
            
            if success:
                logger.info(f"✅ 更新完成信息成功: ID={record_id}")
            else:
                logger.warning(f"⚠️ 未找到记录: ID={record_id}")
                
            return success
            
        except Exception as e:
            logger.error(f"❌ 更新完成信息失败: {e}")
            return False
    
    @staticmethod
    def get_by_id(record_id: int) -> Optional[Dict[str, Any]]:
        """
        根据ID获取记录
        
        Args:
            record_id: 记录ID
            
        Returns:
            Dict: 记录信息，如果不存在返回None
        """
        try:
            db = get_db_manager()
            query = "SELECT * FROM text_to_image_records WHERE id = %s"
            result = db.execute_query(query, (record_id,))
            
            if result:
                return dict(result[0])
            return None
            
        except Exception as e:
            logger.error(f"❌ 获取记录失败: {e}")
            return None
    
    @staticmethod
    def get_all(limit: int = 50, offset: int = 0, status: str = None) -> List[Dict[str, Any]]:
        """
        获取所有记录
        
        Args:
            limit: 限制数量
            offset: 偏移量
            status: 状态筛选（可选）
            
        Returns:
            List[Dict]: 记录列表
        """
        try:
            db = get_db_manager()
            
            if status:
                query = """
                    SELECT * FROM text_to_image_records 
                    WHERE status = %s 
                    ORDER BY created_at DESC 
                    LIMIT %s OFFSET %s
                """
                params = (status, limit, offset)
            else:
                query = """
                    SELECT * FROM text_to_image_records 
                    ORDER BY created_at DESC 
                    LIMIT %s OFFSET %s
                """
                params = (limit, offset)
            
            result = db.execute_query(query, params)
            return [dict(row) for row in result] if result else []
            
        except Exception as e:
            logger.error(f"❌ 获取记录列表失败: {e}")
            return []
    
    @staticmethod
    def search(keyword: str = None, date_from: date = None, date_to: date = None,
               limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """
        搜索记录
        
        Args:
            keyword: 关键字搜索
            date_from: 开始日期
            date_to: 结束日期
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            List[Dict]: 搜索结果
        """
        try:
            db = get_db_manager()
            
            conditions = []
            params = []
            
            # 关键字搜索
            if keyword:
                conditions.append("text_content ILIKE %s")
                params.append(f"%{keyword}%")
            
            # 日期范围
            if date_from:
                conditions.append("DATE(created_at) >= %s")
                params.append(date_from)
            
            if date_to:
                conditions.append("DATE(created_at) <= %s")
                params.append(date_to)
            
            # 构建查询
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            query = f"""
                SELECT * FROM text_to_image_records 
                WHERE {where_clause}
                ORDER BY created_at DESC 
                LIMIT %s OFFSET %s
            """
            params.extend([limit, offset])
            
            result = db.execute_query(query, params)
            return [dict(row) for row in result] if result else []
            
        except Exception as e:
            logger.error(f"❌ 搜索记录失败: {e}")
            return []
    
    @staticmethod
    def count(keyword: str = None, date_from: date = None, date_to: date = None) -> int:
        """
        统计记录数量
        
        Args:
            keyword: 关键字搜索
            date_from: 开始日期
            date_to: 结束日期
            
        Returns:
            int: 记录数量
        """
        try:
            db = get_db_manager()
            
            conditions = []
            params = []
            
            # 关键字搜索
            if keyword:
                conditions.append("text_content ILIKE %s")
                params.append(f"%{keyword}%")
            
            # 日期范围
            if date_from:
                conditions.append("DATE(created_at) >= %s")
                params.append(date_from)
            
            if date_to:
                conditions.append("DATE(created_at) <= %s")
                params.append(date_to)
            
            # 构建查询
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            query = f"SELECT COUNT(*) as count FROM text_to_image_records WHERE {where_clause}"
            
            result = db.execute_query(query, params)
            return result[0]['count'] if result else 0
            
        except Exception as e:
            logger.error(f"❌ 统计记录数量失败: {e}")
            return 0
    
    @staticmethod
    def delete(record_id: int) -> bool:
        """
        删除记录
        
        Args:
            record_id: 记录ID
            
        Returns:
            bool: 是否删除成功
        """
        try:
            db = get_db_manager()
            query = "DELETE FROM text_to_image_records WHERE id = %s"
            
            rows_affected = db.execute_query(query, (record_id,))
            success = rows_affected > 0
            
            if success:
                logger.info(f"✅ 删除记录成功: ID={record_id}")
            else:
                logger.warning(f"⚠️ 未找到记录: ID={record_id}")
                
            return success
            
        except Exception as e:
            logger.error(f"❌ 删除记录失败: {e}")
            return False
    
    @staticmethod
    def get_statistics() -> Dict[str, Any]:
        """
        获取统计信息
        
        Returns:
            Dict: 统计信息
        """
        try:
            db = get_db_manager()
            query = """
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
                    COUNT(CASE WHEN status = 'generating' THEN 1 END) as generating_count,
                    COALESCE(AVG(generation_time), 0) as avg_generation_time,
                    COALESCE(SUM(image_size), 0) as total_image_size,
                    MAX(created_at) as last_generation
                FROM text_to_image_records
            """
            
            result = db.execute_query(query)
            if result:
                stats = dict(result[0])
                # 格式化数据
                stats['success_rate'] = (
                    stats['completed_count'] / stats['total_records'] * 100 
                    if stats['total_records'] > 0 else 0
                )
                return stats
            
            return {
                'total_records': 0,
                'completed_count': 0,
                'failed_count': 0,
                'generating_count': 0,
                'avg_generation_time': 0,
                'total_image_size': 0,
                'success_rate': 0,
                'last_generation': None
            }
            
        except Exception as e:
            logger.error(f"❌ 获取统计信息失败: {e}")
            return {}

if __name__ == "__main__":
    # 测试模型
    print("测试文本转图片记录模型...")
    
    # 获取统计信息
    stats = TextImageRecord.get_statistics()
    print("统计信息:", stats)
    
    # 获取最近的记录
    records = TextImageRecord.get_all(limit=5)
    print(f"最近的 {len(records)} 条记录:")
    for record in records:
        print(f"- ID: {record['id']}, 文本: {record['text_content'][:30]}..., 状态: {record['status']}")