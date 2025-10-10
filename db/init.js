// Database initialization script
const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function initializeDatabase() {
  try {
    console.log('🔄 开始初始化数据库...');
    
    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, '..', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // 执行 SQL
    await pool.query(sql);
    
    console.log('✅ 数据库初始化成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
