const { pool } = require('../config/database');

const createTablesSQL = `
-- 视频下载记录表
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  video_url VARCHAR(500) NOT NULL,
  video_id VARCHAR(100),
  title VARCHAR(500),
  filename VARCHAR(500),
  video_format VARCHAR(50),
  audio_format VARCHAR(50),
  duration INTEGER,
  video_size BIGINT,
  audio_size BIGINT,
  thumbnail_url TEXT,
  description TEXT,
  author VARCHAR(200),
  upload_date DATE,
  view_count BIGINT,
  like_count BIGINT,
  download_status VARCHAR(50) DEFAULT 'pending',
  download_progress INTEGER DEFAULT 0,
  video_path VARCHAR(1000),
  audio_path VARCHAR(1000),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  download_started_at TIMESTAMP,
  download_completed_at TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(download_status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
CREATE INDEX IF NOT EXISTS idx_videos_video_id ON videos(video_id);

-- 下载任务队列表
CREATE TABLE IF NOT EXISTS download_queue (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status VARCHAR(50) DEFAULT 'queued',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON download_queue(status, priority DESC);

-- 通知日志表
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
  channel VARCHAR(50),
  title VARCHAR(500),
  content TEXT,
  status VARCHAR(50),
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 导出记录表
CREATE TABLE IF NOT EXISTS export_logs (
  id SERIAL PRIMARY KEY,
  export_format VARCHAR(50),
  filter_params JSONB,
  record_count INTEGER,
  file_path VARCHAR(1000),
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function initDatabase() {
  try {
    console.log('🔄 开始初始化数据库...');
    
    await pool.query(createTablesSQL);
    
    console.log('✅ 数据库表创建成功！');
    console.log('📊 已创建以下表：');
    console.log('  - videos (视频记录表)');
    console.log('  - download_queue (下载队列表)');
    console.log('  - notification_logs (通知日志表)');
    console.log('  - export_logs (导出记录表)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
