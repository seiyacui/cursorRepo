const pool = require('../config/database');

class Video {
  static async create(videoData) {
    const {
      url, title, filename, video_format, audio_format, duration,
      video_file_size, audio_file_size, video_file_path, audio_file_path,
      thumbnail_path, description, uploader, upload_date, view_count, like_count
    } = videoData;

    const query = `
      INSERT INTO videos (
        url, title, filename, video_format, audio_format, duration,
        video_file_size, audio_file_size, video_file_path, audio_file_path,
        thumbnail_path, description, uploader, upload_date, view_count, like_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      url, title, filename, video_format, audio_format, duration,
      video_file_size, audio_file_size, video_file_path, audio_file_path,
      thumbnail_path, description, uploader, upload_date, view_count, like_count
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findAll(limit = 50, offset = 0, search = '', dateFrom = '', dateTo = '') {
    let query = `
      SELECT * FROM videos 
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR filename ILIKE $${paramCount} OR uploader ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    if (dateFrom) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(dateTo);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM videos WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByUrl(url) {
    const query = 'SELECT * FROM videos WHERE url = $1';
    try {
      const result = await pool.query(query, [url]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(id, status, errorMessage = null) {
    const query = `
      UPDATE videos 
      SET status = $2, error_message = $3, 
          download_started_at = CASE WHEN $2 = 'downloading' THEN CURRENT_TIMESTAMP ELSE download_started_at END,
          download_completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE download_completed_at END
      WHERE id = $1 
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id, status, errorMessage]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async updateFileInfo(id, fileInfo) {
    const {
      video_file_size, audio_file_size, video_file_path, audio_file_path,
      thumbnail_path, title, duration, description, uploader, upload_date,
      view_count, like_count
    } = fileInfo;

    const query = `
      UPDATE videos 
      SET video_file_size = $2, audio_file_size = $3, video_file_path = $4,
          audio_file_path = $5, thumbnail_path = $6, title = $7, duration = $8,
          description = $9, uploader = $10, upload_date = $11, view_count = $12, like_count = $13
      WHERE id = $1 
      RETURNING *
    `;

    const values = [
      id, video_file_size, audio_file_size, video_file_path, audio_file_path,
      thumbnail_path, title, duration, description, uploader, upload_date,
      view_count, like_count
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_videos,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_videos,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_videos,
        COUNT(CASE WHEN status = 'downloading' THEN 1 END) as downloading_videos,
        COALESCE(SUM(video_file_size), 0) as total_video_size,
        COALESCE(SUM(audio_file_size), 0) as total_audio_size,
        COALESCE(AVG(duration), 0) as avg_duration
      FROM videos
    `;

    try {
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM videos WHERE id = $1 RETURNING *';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async count(search = '', dateFrom = '', dateTo = '') {
    let query = 'SELECT COUNT(*) FROM videos WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR filename ILIKE $${paramCount} OR uploader ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    if (dateFrom) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(dateTo);
    }

    try {
      const result = await pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Video;