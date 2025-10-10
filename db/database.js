// Database connection and query utilities
const { Pool } = require('pg');
require('dotenv').config();

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'youtube_downloader',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 测试数据库连接
pool.on('connect', () => {
  console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接错误:', err);
  process.exit(-1);
});

// 查询方法
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('执行查询', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
};

// 获取连接
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  // 设置超时
  const timeout = setTimeout(() => {
    console.error('数据库客户端获取超时');
    client.release();
  }, 5000);
  
  // 重写release方法
  client.release = () => {
    clearTimeout(timeout);
    client.release = release;
    return release.apply(client);
  };
  
  return client;
};

// 视频相关数据库操作
const videoOperations = {
  // 创建视频记录
  async create(videoData) {
    const {
      video_url,
      video_id,
      title,
      filename,
      video_format,
      audio_format,
      duration,
      thumbnail_url
    } = videoData;
    
    const result = await query(
      `INSERT INTO videos (video_url, video_id, title, filename, video_format, audio_format, duration, thumbnail_url, download_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [video_url, video_id, title, filename, video_format, audio_format, duration, thumbnail_url]
    );
    
    return result.rows[0];
  },

  // 更新视频状态
  async updateStatus(id, status, progress = null) {
    const updateFields = ['download_status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (progress !== null) {
      updateFields.push(`download_progress = $${paramIndex}`);
      values.push(progress);
      paramIndex++;
    }

    if (status === 'downloading' && progress === 0) {
      updateFields.push(`download_started_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'completed' || status === 'failed') {
      updateFields.push(`download_completed_at = CURRENT_TIMESTAMP`);
    }

    const result = await query(
      `UPDATE videos SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // 更新视频信息
  async update(id, updateData) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;

    Object.keys(updateData).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updateData[key]);
      paramIndex++;
    });

    if (fields.length === 0) return null;

    const result = await query(
      `UPDATE videos SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // 获取视频列表（支持搜索和分页）
  async list(filters = {}) {
    const { keyword, start_date, end_date, status, limit = 100, offset = 0 } = filters;
    
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (keyword) {
      conditions.push(`(title ILIKE $${paramIndex} OR filename ILIKE $${paramIndex})`);
      values.push(`%${keyword}%`);
      paramIndex++;
    }

    if (start_date) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(end_date);
      paramIndex++;
    }

    if (status) {
      conditions.push(`download_status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const result = await query(
      `SELECT * FROM videos ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM videos ${whereClause}`,
      values
    );

    return {
      videos: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    };
  },

  // 获取单个视频
  async getById(id) {
    const result = await query('SELECT * FROM videos WHERE id = $1', [id]);
    return result.rows[0];
  },

  // 删除视频
  async delete(id) {
    const result = await query('DELETE FROM videos WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // 获取统计信息
  async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE download_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE download_status = 'failed') as failed,
        COUNT(*) FILTER (WHERE download_status = 'downloading') as downloading,
        COUNT(*) FILTER (WHERE download_status = 'pending') as pending,
        SUM(video_file_size) FILTER (WHERE download_status = 'completed') as total_video_size,
        SUM(audio_file_size) FILTER (WHERE download_status = 'completed') as total_audio_size,
        SUM(duration) FILTER (WHERE download_status = 'completed') as total_duration
      FROM videos
    `);
    
    return result.rows[0];
  }
};

// 批次相关数据库操作
const batchOperations = {
  // 创建批次
  async create(batchName, totalVideos) {
    const result = await query(
      `INSERT INTO download_batches (batch_name, total_videos, status, started_at)
       VALUES ($1, $2, 'processing', CURRENT_TIMESTAMP)
       RETURNING *`,
      [batchName, totalVideos]
    );
    
    return result.rows[0];
  },

  // 添加视频到批次
  async addVideo(batchId, videoId) {
    const result = await query(
      `INSERT INTO batch_videos (batch_id, video_id) VALUES ($1, $2) RETURNING *`,
      [batchId, videoId]
    );
    
    return result.rows[0];
  },

  // 更新批次状态
  async updateStatus(id, status, completedVideos = null, failedVideos = null) {
    const updates = ['status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (completedVideos !== null) {
      updates.push(`completed_videos = $${paramIndex}`);
      values.push(completedVideos);
      paramIndex++;
    }

    if (failedVideos !== null) {
      updates.push(`failed_videos = $${paramIndex}`);
      values.push(failedVideos);
      paramIndex++;
    }

    if (status === 'completed' || status === 'failed') {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    const result = await query(
      `UPDATE download_batches SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // 获取批次详情
  async getById(id) {
    const result = await query('SELECT * FROM download_batches WHERE id = $1', [id]);
    return result.rows[0];
  },

  // 获取批次的所有视频
  async getVideos(batchId) {
    const result = await query(
      `SELECT v.* FROM videos v
       JOIN batch_videos bv ON v.id = bv.video_id
       WHERE bv.batch_id = $1
       ORDER BY v.created_at ASC`,
      [batchId]
    );
    
    return result.rows;
  }
};

// 通知日志操作
const notificationOperations = {
  async log(logData) {
    const { batch_id, notification_type, channel, title, content, status, error_message } = logData;
    
    const result = await query(
      `INSERT INTO notification_logs (batch_id, notification_type, channel, title, content, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [batch_id, notification_type, channel, title, content, status, error_message]
    );
    
    return result.rows[0];
  }
};

module.exports = {
  query,
  getClient,
  pool,
  videos: videoOperations,
  batches: batchOperations,
  notifications: notificationOperations
};
