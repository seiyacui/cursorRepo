-- Slideshow Video Generator Database Schema
-- 幻灯片视频生成器数据库结构

-- 创建数据库 (如果需要)
-- CREATE DATABASE slideshow_generator WITH ENCODING 'UTF8' LC_COLLATE = 'zh_CN.UTF-8' LC_CTYPE = 'zh_CN.UTF-8' TEMPLATE template0;

-- 视频记录表
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    -- 文本内容
    text_content TEXT NOT NULL,
    
    -- 文件路径
    background_image VARCHAR(500),
    background_music VARCHAR(500) NOT NULL,
    custom_font VARCHAR(500),
    video_path VARCHAR(500),
    video_filename VARCHAR(500),
    
    -- 背景设置
    background_color VARCHAR(20) DEFAULT '#000000',
    
    -- 字体属性
    font_family VARCHAR(100) DEFAULT 'Arial',
    font_size INTEGER DEFAULT 48,
    font_color VARCHAR(20) DEFAULT '#FFFFFF',
    font_background_color VARCHAR(20) DEFAULT 'transparent',
    
    -- 文本位置（边距，单位：像素）
    text_margin_top INTEGER DEFAULT 100,
    text_margin_bottom INTEGER DEFAULT 100,
    text_margin_left INTEGER DEFAULT 100,
    text_margin_right INTEGER DEFAULT 100,
    
    -- 幻灯片设置
    slide_duration INTEGER DEFAULT 5,
    text_animation VARCHAR(50) DEFAULT 'fade',
    
    -- 视频属性
    video_format VARCHAR(10) DEFAULT 'mp4',
    video_duration DECIMAL(10, 2),
    video_file_size BIGINT,
    video_width INTEGER DEFAULT 1920,
    video_height INTEGER DEFAULT 1080,
    video_fps INTEGER DEFAULT 30,
    
    -- 生成状态
    generation_status VARCHAR(50) DEFAULT 'pending',
    generation_progress INTEGER DEFAULT 0,
    error_message TEXT,
    generation_started_at TIMESTAMP,
    generation_completed_at TIMESTAMP,
    
    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(generation_status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_text_content ON videos USING gin(to_tsvector('simple', text_content));

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE videos IS '幻灯片视频记录表';
COMMENT ON COLUMN videos.text_content IS '显示的文本内容';
COMMENT ON COLUMN videos.slide_duration IS '幻灯片停留时长（秒）';
COMMENT ON COLUMN videos.text_animation IS '文本动画效果';
COMMENT ON COLUMN videos.generation_status IS '生成状态: pending, generating, completed, failed';
