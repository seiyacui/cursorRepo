const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'youtube_downloader',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 开始初始化数据库...');
    
    // Create videos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        filename TEXT,
        video_format VARCHAR(20),
        audio_format VARCHAR(20),
        duration INTEGER,
        video_size BIGINT,
        audio_size BIGINT,
        thumbnail_url TEXT,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        video_path TEXT,
        audio_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(url)
      )
    `);
    
    console.log('✅ 创建 videos 表成功');
    
    // Create indexes for better search performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_title ON videos USING gin(to_tsvector('english', COALESCE(title, '')));
    `);
    
    console.log('✅ 创建索引成功');
    console.log('🎉 数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run initialization
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('数据库初始化脚本执行完毕');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { pool, initDatabase };
