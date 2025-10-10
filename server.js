const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const videoRoutes = require('./routes/videos');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/exports', express.static(path.join(__dirname, 'exports')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// API 路由
app.use('/api/videos', videoRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'YouTube下载管理器运行中' });
});

// 根路径重定向到前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '路由不存在' });
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await db.query('SELECT NOW()');
    console.log('✅ 数据库连接成功');

    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 YouTube视频批量下载管理器已启动');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🌐 Web界面: http://localhost:${PORT}`);
      console.log(`🔧 API地址: http://localhost:${PORT}/api`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📋 功能特性:');
      console.log('  ✓ 批量下载YouTube视频');
      console.log('  ✓ 支持多种视频和音频格式');
      console.log('  ✓ 并发下载 (最大并发数: ' + (process.env.MAX_CONCURRENT_DOWNLOADS || 3) + ')');
      console.log('  ✓ 实时进度显示');
      console.log('  ✓ PostgreSQL数据库存储');
      console.log('  ✓ 多格式导出 (HTML, PDF, Markdown, PNG)');
      console.log('  ✓ 4渠道通知 (WxPusher, PushPlus, Resend, Telegram)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});

startServer();
