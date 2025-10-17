-- 文本转图片工具数据库模式
-- 创建数据库（如果不存在）
-- CREATE DATABASE text2image_db;

-- 使用数据库
-- \c text2image_db;

-- 创建文本转图片记录表
CREATE TABLE IF NOT EXISTS text_to_image_records (
    id SERIAL PRIMARY KEY,
    text_content TEXT NOT NULL,
    image_filename VARCHAR(255) NOT NULL,
    image_path TEXT NOT NULL,
    image_size BIGINT, -- 图片文件大小（字节）
    image_width INTEGER, -- 图片宽度
    image_height INTEGER, -- 图片高度
    output_directory TEXT NOT NULL,
    model_name VARCHAR(100) DEFAULT 'Qwen/Qwen-Image',
    inference_steps INTEGER DEFAULT 28,
    guidance_scale DECIMAL(4,2) DEFAULT 7.5,
    generation_time DECIMAL(8,3), -- 生成耗时（秒）
    status VARCHAR(20) DEFAULT 'pending', -- pending, generating, completed, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_records_status ON text_to_image_records(status);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON text_to_image_records(created_at);
CREATE INDEX IF NOT EXISTS idx_records_text_content ON text_to_image_records USING gin(to_tsvector('english', text_content));

-- 创建统计视图
CREATE OR REPLACE VIEW generation_stats AS
SELECT 
    COUNT(*) as total_generations,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_generations,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_generations,
    COUNT(CASE WHEN status = 'generating' THEN 1 END) as in_progress_generations,
    COALESCE(AVG(generation_time), 0) as avg_generation_time,
    COALESCE(SUM(image_size), 0) as total_image_size,
    DATE(created_at) as generation_date
FROM text_to_image_records
GROUP BY DATE(created_at)
ORDER BY generation_date DESC;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表添加更新时间触发器
DROP TRIGGER IF EXISTS update_records_updated_at ON text_to_image_records;
CREATE TRIGGER update_records_updated_at 
    BEFORE UPDATE ON text_to_image_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建全文搜索函数
CREATE OR REPLACE FUNCTION search_records(search_term TEXT)
RETURNS TABLE(
    id INTEGER,
    text_content TEXT,
    image_filename VARCHAR(255),
    image_path TEXT,
    image_size BIGINT,
    created_at TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.text_content,
        r.image_filename,
        r.image_path,
        r.image_size,
        r.created_at,
        ts_rank(to_tsvector('english', r.text_content), plainto_tsquery('english', search_term)) as rank
    FROM text_to_image_records r
    WHERE to_tsvector('english', r.text_content) @@ plainto_tsquery('english', search_term)
        AND r.status = 'completed'
    ORDER BY rank DESC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 插入示例数据（可选）
-- INSERT INTO text_to_image_records (
--     text_content, 
--     image_filename, 
--     image_path, 
--     image_size,
--     image_width,
--     image_height,
--     output_directory,
--     generation_time,
--     status
-- ) VALUES (
--     '一个穿着QWEN T恤的中国美女，手持黑马克笔微笑',
--     'sample_image.png',
--     '/path/to/sample_image.png',
--     1024000,
--     1024,
--     1024,
--     '/path/to/output',
--     15.5,
--     'completed'
-- );

-- 创建数据清理函数（删除过期记录）
CREATE OR REPLACE FUNCTION cleanup_old_records(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM text_to_image_records 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep
    AND status IN ('failed', 'completed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE text_to_image_records IS '文本转图片生成记录表';
COMMENT ON COLUMN text_to_image_records.text_content IS '输入的文本内容';
COMMENT ON COLUMN text_to_image_records.image_filename IS '生成的图片文件名';
COMMENT ON COLUMN text_to_image_records.image_path IS '图片完整路径';
COMMENT ON COLUMN text_to_image_records.image_size IS '图片文件大小（字节）';
COMMENT ON COLUMN text_to_image_records.generation_time IS '图片生成耗时（秒）';
COMMENT ON COLUMN text_to_image_records.status IS '生成状态：pending-等待中, generating-生成中, completed-已完成, failed-失败';

COMMENT ON VIEW generation_stats IS '生成统计视图';
COMMENT ON FUNCTION search_records(TEXT) IS '全文搜索函数';
COMMENT ON FUNCTION cleanup_old_records(INTEGER) IS '清理过期记录函数';