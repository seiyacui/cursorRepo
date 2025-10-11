const db = require('./db/database');

async function checkDatabase() {
  try {
    console.log('🔍 检查数据库中的视频记录...\n');
    
    const result = await db.query('SELECT id, text_content, video_filename, video_format, video_duration, video_file_size, generation_status, generation_progress FROM videos ORDER BY id DESC LIMIT 5');
    
    console.log(`找到 ${result.rows.length} 条记录:\n`);
    
    result.rows.forEach(v => {
      console.log(`视频ID: ${v.id}`);
      console.log(`  文本: ${v.text_content.substring(0, 30)}...`);
      console.log(`  文件名: ${v.video_filename}`);
      console.log(`  格式: ${v.video_format}`);
      console.log(`  时长: ${v.video_duration} 秒`);
      console.log(`  大小: ${v.video_file_size} bytes`);
      console.log(`  状态: ${v.generation_status}`);
      console.log(`  进度: ${v.generation_progress}%`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkDatabase();
