// Database Migration Script
// 数据库迁移脚本：添加 animation_duration 字段

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'slideshow_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function migrate() {
  console.log('🔧 开始数据库迁移：添加 animation_duration 字段...');
  console.log('');
  
  try {
    // 检查字段是否已存在
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='videos' 
      AND column_name='animation_duration'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('ℹ️  字段 animation_duration 已存在，无需迁移');
      return;
    }
    
    // 添加字段
    console.log('➕ 添加 animation_duration 字段...');
    await pool.query(`
      ALTER TABLE videos 
      ADD COLUMN animation_duration DECIMAL(3, 1) DEFAULT 1.5
    `);
    
    // 添加注释
    await pool.query(`
      COMMENT ON COLUMN videos.animation_duration IS '动画效果时长（秒）：0.5-5.0'
    `);
    
    console.log('✅ 字段添加成功！');
    console.log('');
    
    // 验证
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name='videos' 
      AND column_name='animation_duration'
    `);
    
    console.log('📊 字段信息:');
    console.log('   名称:', verifyResult.rows[0].column_name);
    console.log('   类型:', verifyResult.rows[0].data_type);
    console.log('   默认值:', verifyResult.rows[0].column_default);
    console.log('');
    
    // 统计现有记录
    const countResult = await pool.query('SELECT COUNT(*) FROM videos');
    const count = parseInt(countResult.rows[0].count);
    console.log(`📝 已为 ${count} 条现有记录设置默认值 1.5秒`);
    console.log('');
    console.log('=== ✅ 迁移完成！===');
    
  } catch (err) {
    console.error('❌ 迁移失败:', err.message);
    console.error('');
    console.error('错误详情:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行迁移
migrate().catch(err => {
  console.error('❌ 未处理的错误:', err);
  process.exit(1);
});
