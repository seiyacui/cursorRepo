// WebSocket Server for real-time progress updates
const WebSocket = require('ws');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 WebSocket 客户端连接');
      this.clients.add(ws);

      // 发送欢迎消息
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'WebSocket连接成功',
        timestamp: new Date().toISOString()
      }));

      // 处理客户端消息
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📨 收到客户端消息:', data);

          // 处理ping消息
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error('处理WebSocket消息失败:', error);
        }
      });

      // 处理连接关闭
      ws.on('close', () => {
        console.log('🔌 WebSocket 客户端断开');
        this.clients.delete(ws);
      });

      // 处理错误
      ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
        this.clients.delete(ws);
      });

      // 心跳检测
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // 心跳检测定时器
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log('🔌 客户端心跳超时，关闭连接');
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30秒

    console.log('✅ WebSocket服务器已启动');
  }

  // 广播消息给所有客户端
  broadcast(data) {
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    });

    let sentCount = 0;
    let totalClients = this.clients.size;
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`📤 广播消息给 ${sentCount}/${totalClients} 个客户端:`, data.type);
    } else {
      console.warn(`⚠️  无法广播消息（没有连接的客户端）: ${data.type}, 总客户端数: ${totalClients}`);
    }
  }

  // 发送生成进度更新
  sendGenerationProgress(videoId, progress) {
    this.broadcast({
      type: 'generation_progress',
      videoId,
      data: progress
    });
  }

  // 发送通知
  sendNotification(notification) {
    this.broadcast({
      type: 'notification',
      data: notification
    });
  }

  // 发送错误消息
  sendError(error) {
    this.broadcast({
      type: 'error',
      data: {
        message: error.message || error,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }

  // 获取连接客户端数量
  getClientCount() {
    return this.clients.size;
  }

  // 关闭服务器
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.close();
    });

    this.wss.close(() => {
      console.log('WebSocket服务器已关闭');
    });
  }
}

module.exports = WebSocketServer;
