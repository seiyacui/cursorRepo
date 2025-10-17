const { pool } = require('./init');

class Database {
  // Insert new video record
  async insertVideo(videoData) {
    const query = `
      INSERT INTO videos (url, title, filename, video_format, audio_format, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      videoData.url,
      videoData.title || null,
      videoData.filename || null,
      videoData.videoFormat || null,
      videoData.audioFormat || null,
      'pending'
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        // Return existing record
        const existingQuery = 'SELECT * FROM videos WHERE url = $1';
        const existingResult = await pool.query(existingQuery, [videoData.url]);
        return existingResult.rows[0];
      }
      throw error;
    }
  }
  
  // Update video record
  async updateVideo(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });
    
    values.push(id);
    const query = `
      UPDATE videos 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Get all videos with optional filters
  async getVideos(filters = {}) {
    let query = 'SELECT * FROM videos WHERE 1=1';
    const values = [];
    let paramCount = 1;
    
    if (filters.keyword) {
      query += ` AND (title ILIKE $${paramCount} OR filename ILIKE $${paramCount})`;
      values.push(`%${filters.keyword}%`);
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
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT ${parseInt(filters.limit)}`;
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  }
  
  // Get video by ID
  async getVideoById(id) {
    const query = 'SELECT * FROM videos WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
  
  // Get video statistics
  async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_videos,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'downloading' THEN 1 END) as downloading,
        SUM(video_size) as total_video_size,
        SUM(audio_size) as total_audio_size,
        SUM(duration) as total_duration
      FROM videos
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  }
  
  // Delete video
  async deleteVideo(id) {
    const query = 'DELETE FROM videos WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = new Database();
