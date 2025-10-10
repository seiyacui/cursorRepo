-- YouTube Video Downloader Database Schema
-- 数据库初始化脚本

-- 创建数据库 (如果需要)
-- CREATE DATABASE youtube_downloader WITH ENCODING 'UTF8' LC_COLLATE = 'zh_CN.UTF-8' LC_CTYPE = 'zh_CN.UTF-8' TEMPLATE template0;

-- 视频下载记录表
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    video_url VARCHAR(500) NOT NULL,
    video_id VARCHAR(100),
    title VARCHAR(500),
    filename VARCHAR(500),
    video_format VARCHAR(50),
    audio_format VARCHAR(50),
    duration INTEGER, -- 时长（秒）
    video_file_size BIGINT, -- 视频文件大小（字节）
    audio_file_size BIGINT, -- 音频文件大小（字节）
    video_path VARCHAR(1000),
    audio_path VARCHAR(1000),
    thumbnail_url VARCHAR(1000),
    download_status VARCHAR(50) DEFAULT 'pending', -- pending, downloading, completed, failed
    download_progress INTEGER DEFAULT 0, -- 下载进度 0-100
    error_message TEXT,
    download_started_at TIMESTAMP,
    download_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_videos_video_id ON videos(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(download_status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos USING gin(to_tsvector('simple', title));

-- 批次下载记录表
CREATE TABLE IF NOT EXISTS download_batches (
    id SERIAL PRIMARY KEY,
    batch_name VARCHAR(200),
    total_videos INTEGER DEFAULT 0,
    completed_videos INTEGER DEFAULT 0,
    failed_videos INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 批次视频关联表
CREATE TABLE IF NOT EXISTS batch_videos (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES download_batches(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知日志表
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES download_batches(id),
    notification_type VARCHAR(50), -- batch_complete, download_success, download_failed
    channel VARCHAR(50), -- wxpusher, pushplus, resend, telegram
    title VARCHAR(500),
    content TEXT,
    status VARCHAR(50), -- success, failed, skipped
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- 插入示例数据（可选）
-- INSERT INTO videos (video_url, video_id, title, filename, video_format, duration, download_status)
-- VALUES ('https://www.youtube.com/watch?v=example', 'example', 'Example Video', 'example.mp4', 'mp4', 180, 'completed');

COMMENT ON TABLE videos IS '视频下载记录表';
COMMENT ON TABLE download_batches IS '批次下载记录表';
COMMENT ON TABLE batch_videos IS '批次视频关联表';
COMMENT ON TABLE notification_logs IS '通知日志表';
