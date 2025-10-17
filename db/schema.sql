-- YouTube视频下载数据库模式
-- 创建数据库（如果不存在）
-- CREATE DATABASE youtube_downloader;

-- 使用数据库
-- \c youtube_downloader;

-- 创建视频记录表
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    filename TEXT,
    video_format VARCHAR(10),
    audio_format VARCHAR(10),
    duration INTEGER, -- 秒
    video_file_size BIGINT, -- 字节
    audio_file_size BIGINT, -- 字节
    video_file_path TEXT,
    audio_file_path TEXT,
    thumbnail_path TEXT,
    description TEXT,
    uploader TEXT,
    upload_date DATE,
    view_count BIGINT,
    like_count BIGINT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, downloading, completed, failed
    error_message TEXT,
    download_started_at TIMESTAMP,
    download_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建下载任务表
CREATE TABLE IF NOT EXISTS download_tasks (
    id SERIAL PRIMARY KEY,
    batch_id UUID NOT NULL,
    video_urls TEXT[] NOT NULL,
    video_format VARCHAR(10) DEFAULT 'mp4',
    audio_format VARCHAR(10),
    download_audio BOOLEAN DEFAULT false,
    quality VARCHAR(20) DEFAULT 'best',
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    total_videos INTEGER DEFAULT 0,
    completed_videos INTEGER DEFAULT 0,
    failed_videos INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建下载统计表
CREATE TABLE IF NOT EXISTS download_stats (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_downloads INTEGER DEFAULT 0,
    successful_downloads INTEGER DEFAULT 0,
    failed_downloads INTEGER DEFAULT 0,
    total_size_mb DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_url ON videos(url);
CREATE INDEX IF NOT EXISTS idx_download_tasks_batch_id ON download_tasks(batch_id);
CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks(status);
CREATE INDEX IF NOT EXISTS idx_download_stats_date ON download_stats(date);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表添加更新时间触发器
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_download_tasks_updated_at ON download_tasks;
CREATE TRIGGER update_download_tasks_updated_at 
    BEFORE UPDATE ON download_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始统计数据
INSERT INTO download_stats (date, total_downloads, successful_downloads, failed_downloads, total_size_mb)
VALUES (CURRENT_DATE, 0, 0, 0, 0.0)
ON CONFLICT DO NOTHING;