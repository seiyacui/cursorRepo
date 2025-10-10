const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// 导入路由和服务
const apiRoutes = require('./routes/api');
const pool = require('./config/database');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 全局变量，用于在其他模块中访问io
global.io = io;

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static('public'));

// API路由
app.use('/api', apiRoutes);

// 根路径重定向到主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket连接处理
io.on('connection', (socket) => {
  console.log('🔌 客户端已连接:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 客户端已断开:', socket.id);
  });

  // 可以在这里添加更多的WebSocket事件处理
  socket.on('join-download', (taskId) => {
    socket.join(`download-${taskId}`);
    console.log(`客户端 ${socket.id} 加入下载任务 ${taskId}`);
  });

  socket.on('leave-download', (taskId) => {
    socket.leave(`download-${taskId}`);
    console.log(`客户端 ${socket.id} 离开下载任务 ${taskId}`);
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 数据库初始化
async function initDatabase() {
  try {
    console.log('🔄 正在初始化数据库...');
    
    // 读取并执行SQL模式文件
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ 数据库模式初始化完成');
    } else {
      console.log('⚠️ 数据库模式文件不存在，跳过初始化');
    }
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    // 不要因为数据库初始化失败而退出程序
    // 可能数据库已经存在或者有其他原因
  }
}

// 确保下载目录存在
function ensureDirectories() {
  const downloadPath = process.env.DOWNLOAD_PATH || './downloads';
  const dirs = [
    downloadPath,
    path.join(downloadPath, 'videos'),
    path.join(downloadPath, 'audio'),
    path.join(downloadPath, 'thumbnails')
  ];

  dirs.forEach(dir => {
    fs.ensureDirSync(dir);
    console.log(`📁 确保目录存在: ${dir}`);
  });
}

// 检查yt-dlp是否安装
async function checkYtDlp() {
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const ytdlp = spawn('yt-dlp', ['--version']);
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        console.log('✅ yt-dlp 已安装并可用');
        resolve(true);
      } else {
        console.log('⚠️ yt-dlp 不可用，请确保已安装 yt-dlp');
        resolve(false);
      }
    });
    
    ytdlp.on('error', () => {
      console.log('⚠️ yt-dlp 未找到，请安装 yt-dlp');
      console.log('💡 安装方法:');
      console.log('   macOS: brew install yt-dlp');
      console.log('   Ubuntu/Debian: sudo apt install yt-dlp');
      console.log('   或访问: https://github.com/yt-dlp/yt-dlp');
      resolve(false);
    });
  });
}

// 启动服务器
async function startServer() {
  const PORT = process.env.PORT || 3000;
  
  try {
    // 初始化数据库
    await initDatabase();
    
    // 确保目录存在
    ensureDirectories();
    
    // 检查yt-dlp
    await checkYtDlp();
    
    // 启动服务器
    server.listen(PORT, () => {
      console.log('🚀 YouTube批量下载器服务器启动成功!');
      console.log(`📡 服务器地址: http://localhost:${PORT}`);
      console.log(`🌐 Web界面: http://localhost:${PORT}`);
      console.log(`🔧 API接口: http://localhost:${PORT}/api`);
      console.log(`📊 WebSocket: ws://localhost:${PORT}`);
      console.log('');
      console.log('🎬 功能特性:');
      console.log('   ✅ 批量下载YouTube视频');
      console.log('   ✅ 支持多种视频和音频格式');
      console.log('   ✅ 实时下载进度显示');
      console.log('   ✅ PostgreSQL数据存储');
      console.log('   ✅ 数据导出(HTML/PDF/Markdown/PNG)');
      console.log('   ✅ 多渠道通知推送');
      console.log('   ✅ 并发下载支持');
      console.log('');
      console.log('📝 使用说明:');
      console.log('   1. 在输入框中粘贴YouTube视频地址');
      console.log('   2. 选择视频格式和质量');
      console.log('   3. 可选择同时下载音频');
      console.log('   4. 点击"开始批量下载"按钮');
      console.log('   5. 实时查看下载进度');
      console.log('   6. 下载完成后可导出数据报告');
      console.log('');
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📴 收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    pool.end(() => {
      console.log('✅ 数据库连接已关闭');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('📴 收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    pool.end(() => {
      console.log('✅ 数据库连接已关闭');
      process.exit(0);
    });
  });
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
});

// 启动服务器
startServer();