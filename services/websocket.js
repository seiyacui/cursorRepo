// WebSocket handler for real-time updates
const WebSocket = require('ws');

class WebSocketHandler {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();
    
    this.wss.on('connection', (ws) => {
      console.log('✅ New WebSocket client connected');
      this.clients.add(ws);
      
      ws.on('close', () => {
        console.log('❌ WebSocket client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to YouTube Downloader WebSocket'
      }));
    });
  }

  // Broadcast message to all connected clients
  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Send message to specific client
  send(client, data) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }
}

module.exports = WebSocketHandler;
