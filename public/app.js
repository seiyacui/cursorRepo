// Global state
let ws = null;
let currentFilters = {};
let batchStartTime = null;
let timerInterval = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initializeWebSocket();
  loadVideos();
  loadStatistics();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Download button
  document.getElementById('downloadBtn').addEventListener('click', handleDownload);
  
  // Audio checkbox
  document.getElementById('downloadAudio').addEventListener('change', (e) => {
    document.getElementById('audioOptions').style.display = e.target.checked ? 'block' : 'none';
  });
  
  // Search and filter
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('resetBtn').addEventListener('click', handleReset);
  
  // Export buttons
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const format = e.currentTarget.dataset.format;
      handleExport(format);
    });
  });
  
  // Enter key in search
  document.getElementById('searchKeyword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
}

// Initialize WebSocket connection
function initializeWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ WebSocket 连接成功');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error);
  };
  
  ws.onclose = () => {
    console.log('❌ WebSocket 连接关闭，5秒后重连...');
    setTimeout(initializeWebSocket, 5000);
  };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'batch_start':
      handleBatchStart(data);
      break;
    case 'download_start':
      handleDownloadStart(data);
      break;
    case 'progress':
      handleProgress(data);
      break;
    case 'download_complete':
      handleDownloadComplete(data);
      break;
    case 'download_error':
      handleDownloadError(data);
      break;
    case 'batch_complete':
      handleBatchComplete(data);
      break;
  }
}

// Handle download button click
async function handleDownload() {
  const urlInput = document.getElementById('urlInput').value.trim();
  const videoFormat = document.getElementById('videoFormat').value;
  const audioFormat = document.getElementById('audioFormat').value;
  const downloadAudio = document.getElementById('downloadAudio').checked;
  const quality = document.getElementById('quality').value;
  
  if (!urlInput) {
    showToast('请输入至少一个YouTube视频地址', 'warning');
    return;
  }
  
  // Parse URLs
  const urls = urlInput.split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0);
  
  if (urls.length === 0) {
    showToast('请输入有效的YouTube视频地址', 'warning');
    return;
  }
  
  // Disable download button
  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<span class="loading"></span> 准备下载...';
  
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urls,
        videoFormat,
        audioFormat,
        downloadAudio,
        quality
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast(`成功添加 ${urls.length} 个视频到下载队列`, 'success');
      document.getElementById('urlInput').value = '';
    } else {
      showToast('下载请求失败: ' + result.error, 'error');
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<span class="btn-icon">⬇️</span> 开始下载';
    }
  } catch (error) {
    console.error('下载失败:', error);
    showToast('下载请求失败: ' + error.message, 'error');
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span class="btn-icon">⬇️</span> 开始下载';
  }
}

// Handle batch start
function handleBatchStart(data) {
  const progressSection = document.getElementById('progressSection');
  const progressList = document.getElementById('progressList');
  const downloadReport = document.getElementById('downloadReport');
  
  progressSection.style.display = 'block';
  progressList.innerHTML = '';
  downloadReport.style.display = 'none';
  
  document.getElementById('batchProgress').textContent = `0/${data.total}`;
  document.getElementById('queueCount').textContent = data.total;
  
  batchStartTime = Date.now();
  startTimer();
  
  // Scroll to progress section
  progressSection.scrollIntoView({ behavior: 'smooth' });
}

// Handle download start
function handleDownloadStart(data) {
  const progressList = document.getElementById('progressList');
  
  const itemHTML = `
    <div class="progress-item" id="progress-${data.videoId}">
      <div class="progress-item-header">
        <div class="progress-item-title">${data.url}</div>
        <span class="progress-item-status status-downloading">下载中</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: 0%"></div>
      </div>
      <div class="progress-details">
        <span class="progress-percent">0%</span>
        <span class="progress-speed">-</span>
        <span class="progress-eta">-</span>
      </div>
    </div>
  `;
  
  progressList.insertAdjacentHTML('beforeend', itemHTML);
}

// Handle progress update
function handleProgress(data) {
  const item = document.getElementById(`progress-${data.videoId}`);
  if (!item) return;
  
  const progressBar = item.querySelector('.progress-bar');
  const progressPercent = item.querySelector('.progress-percent');
  const progressSpeed = item.querySelector('.progress-speed');
  const progressEta = item.querySelector('.progress-eta');
  
  progressBar.style.width = `${data.progress}%`;
  progressPercent.textContent = `${data.progress.toFixed(1)}%`;
  progressSpeed.textContent = data.speed || '-';
  progressEta.textContent = data.eta ? `剩余 ${data.eta}` : '-';
}

// Handle download complete
function handleDownloadComplete(data) {
  const item = document.getElementById(`progress-${data.videoId}`);
  if (!item) return;
  
  const status = item.querySelector('.progress-item-status');
  const progressBar = item.querySelector('.progress-bar');
  const title = item.querySelector('.progress-item-title');
  
  status.textContent = '完成';
  status.className = 'progress-item-status status-completed';
  progressBar.style.width = '100%';
  
  if (data.result && data.result.title) {
    title.textContent = data.result.title;
  }
  
  // Update batch progress
  updateBatchProgress();
  
  // Reload videos list
  loadVideos();
  loadStatistics();
}

// Handle download error
function handleDownloadError(data) {
  const item = document.getElementById(`progress-${data.videoId}`);
  if (!item) return;
  
  const status = item.querySelector('.progress-item-status');
  const details = item.querySelector('.progress-details');
  
  status.textContent = '失败';
  status.className = 'progress-item-status status-failed';
  
  details.innerHTML = `<span style="color: #F56C6C;">${data.error}</span>`;
  
  // Update batch progress
  updateBatchProgress();
  
  // Reload videos list
  loadVideos();
  loadStatistics();
}

// Handle batch complete
function handleBatchComplete(data) {
  stopTimer();
  
  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn.disabled = false;
  downloadBtn.innerHTML = '<span class="btn-icon">⬇️</span> 开始下载';
  
  // Show download report
  showDownloadReport(data);
  
  showToast('批量下载完成!', 'success');
}

// Show download report
function showDownloadReport(data) {
  const downloadReport = document.getElementById('downloadReport');
  const reportContent = document.getElementById('reportContent');
  
  const successCount = data.results.filter(r => r.status === 'completed').length;
  const failedCount = data.results.length - successCount;
  
  const successVideos = data.results.filter(r => r.status === 'completed');
  
  let downloadLinksHTML = '';
  if (successVideos.length > 0) {
    downloadLinksHTML = `
      <div class="report-downloads">
        <h4>📥 下载链接:</h4>
        ${successVideos.map(video => `
          <div class="report-download-item">
            <span class="report-download-title">${video.title || video.filename}</span>
            <div class="table-actions">
              ${video.video_path ? `<a href="/downloads/videos/${video.video_path.split('/').pop()}" class="btn btn-small btn-success" download>视频</a>` : ''}
              ${video.audio_path ? `<a href="/downloads/audio/${video.audio_path.split('/').pop()}" class="btn btn-small btn-success" download>音频</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  reportContent.innerHTML = `
    <div class="report-stats">
      <div class="report-stat">
        <div class="report-stat-label">总计</div>
        <div class="report-stat-value">${data.results.length}</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-label">成功</div>
        <div class="report-stat-value" style="color: #67C23A;">${successCount}</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-label">失败</div>
        <div class="report-stat-value" style="color: #F56C6C;">${failedCount}</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-label">总耗时</div>
        <div class="report-stat-value">${data.totalTime.toFixed(1)}秒</div>
      </div>
    </div>
    ${downloadLinksHTML}
  `;
  
  downloadReport.style.display = 'block';
}

// Update batch progress
function updateBatchProgress() {
  const progressItems = document.querySelectorAll('.progress-item');
  const completed = document.querySelectorAll('.status-completed, .status-failed').length;
  const total = progressItems.length;
  
  document.getElementById('batchProgress').textContent = `${completed}/${total}`;
  document.getElementById('queueCount').textContent = Math.max(0, total - completed);
}

// Start timer
function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (batchStartTime) {
      const elapsed = Math.floor((Date.now() - batchStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      document.getElementById('elapsedTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// Stop timer
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Load videos from database
async function loadVideos(filters = {}) {
  try {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/videos?${params}`);
    const result = await response.json();
    
    if (result.success) {
      displayVideos(result.data);
    }
  } catch (error) {
    console.error('加载视频列表失败:', error);
  }
}

// Display videos in table
function displayVideos(videos) {
  const tbody = document.getElementById('videoTableBody');
  
  if (videos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">暂无数据</td></tr>';
    return;
  }
  
  tbody.innerHTML = videos.map(video => `
    <tr>
      <td title="${video.title || video.filename || 'N/A'}">
        ${truncateText(video.title || video.filename || 'N/A', 40)}
      </td>
      <td>${video.video_format || 'N/A'}</td>
      <td>${video.audio_format || 'N/A'}</td>
      <td>${formatDuration(video.duration)}</td>
      <td>${formatFileSize(video.video_size)}</td>
      <td>${formatFileSize(video.audio_size)}</td>
      <td>${formatDate(video.created_at)}</td>
      <td>
        <span class="table-status ${video.status}">${getStatusText(video.status)}</span>
      </td>
      <td>
        <div class="table-actions">
          ${video.status === 'completed' && video.video_path ? 
            `<a href="/downloads/videos/${video.video_path.split('/').pop()}" 
                class="btn btn-small btn-success" download>视频</a>` : ''}
          ${video.status === 'completed' && video.audio_path ? 
            `<a href="/downloads/audio/${video.audio_path.split('/').pop()}" 
                class="btn btn-small btn-success" download>音频</a>` : ''}
          <button class="btn btn-small btn-danger" onclick="deleteVideo(${video.id})">删除</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Load statistics
async function loadStatistics() {
  try {
    const response = await fetch('/api/statistics');
    const result = await response.json();
    
    if (result.success) {
      const stats = result.data;
      document.getElementById('totalVideos').textContent = stats.total_videos || 0;
      document.getElementById('completedVideos').textContent = stats.completed || 0;
      document.getElementById('downloadingVideos').textContent = stats.downloading || 0;
      document.getElementById('failedVideos').textContent = stats.failed || 0;
    }
  } catch (error) {
    console.error('加载统计信息失败:', error);
  }
}

// Handle search
function handleSearch() {
  const keyword = document.getElementById('searchKeyword').value.trim();
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  currentFilters = {};
  
  if (keyword) currentFilters.keyword = keyword;
  if (startDate) currentFilters.startDate = startDate;
  if (endDate) currentFilters.endDate = endDate;
  
  loadVideos(currentFilters);
}

// Handle reset
function handleReset() {
  document.getElementById('searchKeyword').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  
  currentFilters = {};
  loadVideos();
}

// Handle export
async function handleExport(format) {
  try {
    showToast(`正在导出 ${format.toUpperCase()} 格式...`, 'warning');
    
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        format,
        filters: currentFilters
      })
    });
    
    if (!response.ok) {
      throw new Error('导出失败');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `videos_export_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('导出成功!', 'success');
  } catch (error) {
    console.error('导出失败:', error);
    showToast('导出失败: ' + error.message, 'error');
  }
}

// Delete video
async function deleteVideo(id) {
  if (!confirm('确定要删除这个视频吗？这将同时删除视频和音频文件。')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/videos/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('删除成功', 'success');
      loadVideos(currentFilters);
      loadStatistics();
    } else {
      showToast('删除失败: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('删除失败:', error);
    showToast('删除失败: ' + error.message, 'error');
  }
}

// Utility functions
function formatFileSize(bytes) {
  if (!bytes) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusText(status) {
  const statusMap = {
    'pending': '等待中',
    'downloading': '下载中',
    'completed': '已完成',
    'failed': '失败'
  };
  return statusMap[status] || status;
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}
