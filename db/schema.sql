-- YouTube Video Download Manager Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS videos CASCADE;

-- Create videos table
CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    title VARCHAR(500),
    filename VARCHAR(500),
    video_format VARCHAR(50),
    audio_format VARCHAR(50),
    duration INTEGER, -- in seconds
    video_size BIGINT, -- in bytes
    audio_size BIGINT, -- in bytes
    video_path VARCHAR(1000),
    audio_path VARCHAR(1000),
    thumbnail_url TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, downloading, completed, failed
    progress INTEGER DEFAULT 0, -- 0-100
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(url, video_format, audio_format)
);

-- Create indexes for better query performance
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_created_at ON videos(created_at);
CREATE INDEX idx_videos_title ON videos(title);
CREATE INDEX idx_videos_filename ON videos(filename);

-- Insert sample data (optional)
-- INSERT INTO videos (url, title, filename, video_format, audio_format, duration, video_size, audio_size, status, progress)
-- VALUES ('https://www.youtube.com/watch?v=example', 'Sample Video', 'sample.mp4', 'mp4', 'mp3', 180, 10485760, 3145728, 'completed', 100);

COMMENT ON TABLE videos IS 'YouTube video download records';
COMMENT ON COLUMN videos.url IS 'YouTube video URL';
COMMENT ON COLUMN videos.title IS 'Video title from YouTube';
COMMENT ON COLUMN videos.filename IS 'Downloaded filename';
COMMENT ON COLUMN videos.video_format IS 'Video format (mp4, mkv, webm, etc.)';
COMMENT ON COLUMN videos.audio_format IS 'Audio format (mp3, aac, wav, etc.)';
COMMENT ON COLUMN videos.duration IS 'Video duration in seconds';
COMMENT ON COLUMN videos.video_size IS 'Video file size in bytes';
COMMENT ON COLUMN videos.audio_size IS 'Audio file size in bytes';
COMMENT ON COLUMN videos.status IS 'Download status';
COMMENT ON COLUMN videos.progress IS 'Download progress (0-100)';
