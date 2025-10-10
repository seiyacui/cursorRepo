const db = require('../config/database');

class Video {
  /**
   * 创建新的视频记录
   */
  static async create(videoData) {
    const {
      video_url,
      video_id,
      title,
      filename,
      video_format,
      audio_format,
      duration,
      thumbnail_url,
      description,
      author
    } = videoData;

    const query = `
      INSERT INTO videos (
        video_url, video_id, title, filename, video_format, audio_format,
        duration, thumbnail_url, description, author, download_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *
    `;

    const values = [
      video_url,
      video_id,
      title,
      filename,
      video_format,
      audio_format,
      duration,
      thumbnail_url,
      description,
      author
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * 更新视频记录
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `
      UPDATE videos 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * 根据ID获取视频
   */
  static async findById(id) {
    const result = await db.query('SELECT * FROM videos WHERE id = $1', [id]);
    return result.rows[0];
  }

  /**
   * 获取所有视频（支持分页和过滤）
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM videos WHERE 1=1';
    const values = [];
    let paramCount = 1;

    // 关键字搜索
    if (filters.keyword) {
      query += ` AND (title ILIKE $${paramCount} OR filename ILIKE $${paramCount} OR author ILIKE $${paramCount})`;
      values.push(`%${filters.keyword}%`);
      paramCount++;
    }

    // 状态过滤
    if (filters.status) {
      query += ` AND download_status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    // 日期范围过滤
    if (filters.startDate) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(filters.endDate);
      paramCount++;
    }

    // 视频格式过滤
    if (filters.videoFormat) {
      query += ` AND video_format = $${paramCount}`;
      values.push(filters.videoFormat);
      paramCount++;
    }

    // 音频格式过滤
    if (filters.audioFormat) {
      query += ` AND audio_format = $${paramCount}`;
      values.push(filters.audioFormat);
      paramCount++;
    }

    // 排序
    query += ' ORDER BY created_at DESC';

    // 分页
    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
      paramCount++;
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * 获取视频总数（支持过滤）
   */
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM videos WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.keyword) {
      query += ` AND (title ILIKE $${paramCount} OR filename ILIKE $${paramCount} OR author ILIKE $${paramCount})`;
      values.push(`%${filters.keyword}%`);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND download_status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(filters.endDate);
      paramCount++;
    }

    const result = await db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * 删除视频记录
   */
  static async delete(id) {
    const result = await db.query('DELETE FROM videos WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  /**
   * 获取下载统计
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE download_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE download_status = 'downloading') as downloading,
        COUNT(*) FILTER (WHERE download_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE download_status = 'failed') as failed,
        SUM(video_size) as total_video_size,
        SUM(audio_size) as total_audio_size,
        SUM(duration) as total_duration
      FROM videos
    `;

    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = Video;
