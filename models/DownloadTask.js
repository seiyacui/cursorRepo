const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class DownloadTask {
  static async create(taskData) {
    const {
      video_urls, video_format = 'mp4', audio_format = null,
      download_audio = false, quality = 'best'
    } = taskData;

    const batch_id = uuidv4();
    const total_videos = video_urls.length;

    const query = `
      INSERT INTO download_tasks (
        batch_id, video_urls, video_format, audio_format, 
        download_audio, quality, total_videos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      batch_id, video_urls, video_format, audio_format,
      download_audio, quality, total_videos
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM download_tasks WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByBatchId(batchId) {
    const query = 'SELECT * FROM download_tasks WHERE batch_id = $1';
    try {
      const result = await pool.query(query, [batchId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE download_tasks 
      SET status = $2,
          started_at = CASE WHEN $2 = 'running' THEN CURRENT_TIMESTAMP ELSE started_at END,
          completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $1 
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id, status]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async updateProgress(id, completed_videos, failed_videos) {
    const query = `
      UPDATE download_tasks 
      SET completed_videos = $2, failed_videos = $3,
          progress_percentage = ROUND(($2 + $3) * 100.0 / total_videos, 2)
      WHERE id = $1 
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [id, completed_videos, failed_videos]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findAll(limit = 20, offset = 0) {
    const query = `
      SELECT * FROM download_tasks 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getRunningTasks() {
    const query = "SELECT * FROM download_tasks WHERE status = 'running'";
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM download_tasks WHERE id = $1 RETURNING *';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DownloadTask;