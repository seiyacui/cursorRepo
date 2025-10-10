// Database connection and operations
const { Pool } = require('pg');
require('dotenv').config();

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'slideshow_generator',
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
});

// 查询方法
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('执行查询', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
};

// 视频记录操作
const videoOperations = {
  // 创建视频记录
  async create(videoData) {
    const fields = Object.keys(videoData);
    const values = Object.values(videoData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await query(
      `INSERT INTO videos (${fields.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  },

  // 更新视频记录
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

  // 更新生成状态
  async updateStatus(id, status, progress = null, errorMessage = null) {
    const updates = ['generation_status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (progress !== null) {
      updates.push(`generation_progress = $${paramIndex}`);
      values.push(progress);
      paramIndex++;
    }

    if (errorMessage) {
      updates.push(`error_message = $${paramIndex}`);
      values.push(errorMessage);
      paramIndex++;
    }

    if (status === 'generating' && progress === 0) {
      updates.push(`generation_started_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'completed' || status === 'failed') {
      updates.push(`generation_completed_at = CURRENT_TIMESTAMP`);
    }

    const result = await query(
      `UPDATE videos SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // 获取视频列表（支持搜索和分页）
  async list(filters = {}) {
    const { keyword, start_date, end_date, status, limit = 50, offset = 0 } = filters;
    
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (keyword) {
      conditions.push(`text_content ILIKE $${paramIndex}`);
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
      conditions.push(`generation_status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 处理 ALL 选项
    const limitClause = limit === 'ALL' ? '' : `LIMIT $${paramIndex}`;
    const offsetClause = limit === 'ALL' ? '' : `OFFSET $${paramIndex + 1}`;
    
    const queryParams = limit === 'ALL' ? values : [...values, limit, offset];
    
    const result = await query(
      `SELECT * FROM videos ${whereClause} ORDER BY created_at DESC ${limitClause} ${offsetClause}`,
      queryParams
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
        COUNT(*) FILTER (WHERE generation_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE generation_status = 'failed') as failed,
        COUNT(*) FILTER (WHERE generation_status = 'generating') as generating,
        COUNT(*) FILTER (WHERE generation_status = 'pending') as pending,
        SUM(video_file_size) FILTER (WHERE generation_status = 'completed') as total_size,
        SUM(video_duration) FILTER (WHERE generation_status = 'completed') as total_duration
      FROM videos
    `);
    
    return result.rows[0];
  }
};

module.exports = {
  query,
  pool,
  videos: videoOperations
};
