// YouTube Video Downloader - Frontend Application

// ==================== Configuration ====================
const API_BASE = window.location.origin;
const WS_URL = `ws://${window.location.host}`;

// ==================== State ====================
let ws = null;
let currentPage = 1;
let pageSize = 50;
let currentFilters = {};
let addedVideoIds = [];
let downloadTimer = null;
let downloadStartTime = null;

// ==================== WebSocket Connection ====================
function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('✅ WebSocket连接成功');
    updateWSStatus(true);
    showToast('WebSocket连接成功', 'success');
  };

  ws.onclose = () => {
    console.log('❌ WebSocket连接断开');
    updateWSStatus(false);
    showToast('WebSocket连接断开，尝试重连...', 'error');
    
    // 5秒后尝试重连
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket错误:', error);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  };
}

function updateWSStatus(connected) {
  const statusEl = document.getElementById('wsStatus');
  if (connected) {
    statusEl.textContent = '✅ 已连接';
    statusEl.style.color = '#28a745';
  } else {
    statusEl.textContent = '❌ 断开';
    statusEl.style.color = '#dc3545';
  }
}

function handleWebSocketMessage(message) {
  console.log('📨 收到消息:', message);

  switch (message.type) {
    case 'download_progress':
      updateVideoProgress(message.videoId, message.data);
      break;
    case 'batch_progress':
      updateBatchProgress(message.data);
      break;
    case 'batch_complete':
      handleBatchComplete(message);
      break;
    case 'notification':
      handleNotification(message.data);
      break;
    case 'error':
      showToast(`错误: ${message.data.message}`, 'error');
      break;
  }
}

// ==================== UI Updates ====================
function updateVideoProgress(videoId, data) {
  const progressSection = document.getElementById('progressSection');
  const currentDownloads = document.getElementById('currentDownloads');
  
  progressSection.style.display = 'block';

  let itemEl = document.getElementById(`download-${videoId}`);
  if (!itemEl) {
    itemEl = document.createElement('div');
    itemEl.id = `download-${videoId}`;
    itemEl.className = 'download-item';
    currentDownloads.appendChild(itemEl);
  }

  const statusText = data.status === 'downloading' ? '⏬ 下载中' :
                    data.status === 'completed' ? '✅ 完成' :
                    data.status === 'failed' ? '❌ 失败' : '⏳ 准备中';

  itemEl.innerHTML = `
    <div class="download-item-title">视频 #${videoId} - ${statusText}</div>
    <div class="download-item-progress">
      <span>进度: ${data.progress || 0}%</span>
      <span>速度: ${data.speed || 'N/A'}</span>
      <span>剩余: ${data.eta || 'N/A'}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${data.progress || 0}%"></div>
    </div>
  `;

  if (data.status === 'completed' || data.status === 'failed') {
    setTimeout(() => {
      itemEl.style.opacity = '0.5';
    }, 2000);
  }
}

function updateBatchProgress(data) {
  const progressText = document.getElementById('batchProgressText');
  const progressPercent = document.getElementById('batchProgressPercent');
  const progressBar = document.getElementById('batchProgressBar');

  progressText.textContent = `已完成 ${data.completed} / ${data.total} (失败 ${data.failed})`;
  progressPercent.textContent = `${data.progress}%`;
  progressBar.style.width = `${data.progress}%`;
}

function handleBatchComplete(message) {
  clearInterval(downloadTimer);
  
  const { result, totalTime } = message;
  
  // 显示下载报告
  showDownloadReport(result, totalTime);
  
  // 刷新视频列表
  loadVideos();
  
  showToast('批量下载完成！', 'success');
}

function handleNotification(data) {
  if (data.type === 'batch_complete') {
    showToast('下载任务已完成，通知已发送', 'success');
  }
}

function showDownloadReport(result, totalTime) {
  const reportSection = document.getElementById('reportSection');
  const progressSection = document.getElementById('progressSection');
  
  progressSection.style.display = 'none';
  reportSection.style.display = 'block';

  document.getElementById('reportTotal').textContent = result.total;
  document.getElementById('reportSuccess').textContent = result.completed;
  document.getElementById('reportFailed').textContent = result.failed;
  
  // 计算总大小（稍后从API获取详细信息）
  fetchBatchDetails(result.batchId);
}

async function fetchBatchDetails(batchId) {
  try {
    const response = await fetch(`${API_BASE}/api/batches/${batchId}`);
    const data = await response.json();
    
    if (data.success) {
      const videos = data.data.videos;
      const totalSize = videos.reduce((sum, v) => 
        sum + (v.video_file_size || 0) + (v.audio_file_size || 0), 0
      );
      
      document.getElementById('reportSize').textContent = formatFileSize(totalSize);
      
      // 显示下载链接
      const reportLinks = document.getElementById('reportLinks');
      reportLinks.innerHTML = '<h3>下载链接：</h3>';
      
      videos.filter(v => v.download_status === 'completed').forEach(v => {
        const item = document.createElement('div');
        item.className = 'report-link-item';
        item.innerHTML = `
          <span>${v.title || v.filename}</span>
          <div>
            ${v.video_path ? `<a href="/downloads/${encodeURIComponent(v.video_path.split('/').pop())}" download>📹 视频</a>` : ''}
            ${v.audio_path ? `<a href="/downloads/${encodeURIComponent(v.audio_path.split('/').pop())}" download>🎵 音频</a>` : ''}
          </div>
        `;
        reportLinks.appendChild(item);
      });
    }
  } catch (error) {
    console.error('获取批次详情失败:', error);
  }
}

// ==================== API Calls ====================
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

async function loadStats() {
  try {
    const data = await apiRequest(`${API_BASE}/api/stats`);
    
    if (data.success) {
      const stats = data.data;
      document.getElementById('totalVideos').textContent = stats.total || 0;
      document.getElementById('completedVideos').textContent = stats.completed || 0;
      document.getElementById('downloadingVideos').textContent = stats.downloading || 0;
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

async function loadVideos(filters = {}) {
  try {
    const params = new URLSearchParams({
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      ...filters
    });
    
    const data = await apiRequest(`${API_BASE}/api/videos?${params}`);
    
    if (data.success) {
      renderVideoTable(data.data.videos);
      updatePagination(data.data.total);
    }
  } catch (error) {
    console.error('加载视频列表失败:', error);
    showToast('加载视频列表失败', 'error');
  }
}

function renderVideoTable(videos) {
  const tbody = document.getElementById('videoTableBody');
  
  if (videos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="no-data">暂无数据</td></tr>';
    return;
  }
  
  tbody.innerHTML = videos.map(v => `
    <tr>
      <td>${v.id}</td>
      <td title="${v.title || v.filename}">${truncate(v.title || v.filename, 30)}</td>
      <td>${v.video_format || 'N/A'}</td>
      <td>${v.audio_format || 'N/A'}</td>
      <td>${formatDuration(v.duration)}</td>
      <td>${formatFileSize(v.video_file_size)}</td>
      <td>${formatFileSize(v.audio_file_size)}</td>
      <td>${formatDate(v.created_at)}</td>
      <td><span class="status-badge status-${v.download_status}">${getStatusText(v.download_status)}</span></td>
      <td>
        <button class="btn btn-danger" onclick="deleteVideo(${v.id})">删除</button>
      </td>
    </tr>
  `).join('');
}

function updatePagination(total) {
  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('pageInfo').textContent = `第 ${currentPage} / ${totalPages} 页 (共 ${total} 条)`;
  
  document.getElementById('btnPrevPage').disabled = currentPage === 1;
  document.getElementById('btnNextPage').disabled = currentPage >= totalPages;
}

async function deleteVideo(id) {
  if (!confirm('确定要删除这个视频吗？这将同时删除下载的文件。')) {
    return;
  }
  
  try {
    await apiRequest(`${API_BASE}/api/videos/${id}`, { method: 'DELETE' });
    showToast('视频已删除', 'success');
    loadVideos(currentFilters);
    loadStats();
  } catch (error) {
    showToast('删除失败: ' + error.message, 'error');
  }
}

async function addVideos() {
  const urls = document.getElementById('videoUrls').value
    .split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0);
  
  if (urls.length === 0) {
    showToast('请输入至少一个视频URL', 'error');
    return;
  }
  
  const videoFormat = document.getElementById('videoFormat').value;
  const downloadAudio = document.getElementById('downloadAudio').checked;
  const audioFormat = document.getElementById('audioFormat').value;
  
  const btnAddVideos = document.getElementById('btnAddVideos');
  btnAddVideos.disabled = true;
  btnAddVideos.innerHTML = '<span class="spinner"></span> 添加中...';
  
  try {
    const data = await apiRequest(`${API_BASE}/api/videos/batch-add`, {
      method: 'POST',
      body: JSON.stringify({
        urls,
        videoFormat,
        audioFormat,
        downloadAudio
      })
    });
    
    if (data.success) {
      addedVideoIds = data.data.videos.map(v => v.id);
      showToast(`成功添加 ${data.data.added} 个视频`, 'success');
      
      if (data.data.failed > 0) {
        showToast(`${data.data.failed} 个视频添加失败`, 'error');
      }
      
      document.getElementById('btnStartDownload').disabled = false;
      document.getElementById('videoUrls').value = '';
      
      loadVideos();
      loadStats();
    }
  } catch (error) {
    showToast('添加视频失败: ' + error.message, 'error');
  } finally {
    btnAddVideos.disabled = false;
    btnAddVideos.innerHTML = '<span>➕ 添加到列表</span>';
  }
}

async function startDownload() {
  if (addedVideoIds.length === 0) {
    showToast('没有待下载的视频', 'error');
    return;
  }
  
  const videoFormat = document.getElementById('videoFormat').value;
  const downloadAudio = document.getElementById('downloadAudio').checked;
  const audioFormat = document.getElementById('audioFormat').value;
  
  const btnStartDownload = document.getElementById('btnStartDownload');
  btnStartDownload.disabled = true;
  btnStartDownload.innerHTML = '<span class="spinner"></span> 启动中...';
  
  try {
    await apiRequest(`${API_BASE}/api/videos/batch-download`, {
      method: 'POST',
      body: JSON.stringify({
        videoIds: addedVideoIds,
        videoFormat,
        audioFormat,
        downloadAudio,
        batchName: `批次_${new Date().toISOString()}`
      })
    });
    
    showToast('下载任务已启动', 'success');
    
    // 显示进度区域
    document.getElementById('progressSection').style.display = 'block';
    
    // 启动计时器
    downloadStartTime = Date.now();
    downloadTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - downloadStartTime) / 1000);
      document.getElementById('elapsedTime').textContent = `${elapsed}秒`;
    }, 1000);
    
    // 重置添加的视频ID
    addedVideoIds = [];
    
  } catch (error) {
    showToast('启动下载失败: ' + error.message, 'error');
    btnStartDownload.disabled = false;
    btnStartDownload.innerHTML = '<span>🚀 开始下载</span>';
  }
}

async function exportVideos(format) {
  const exportStatus = document.getElementById('exportStatus');
  exportStatus.textContent = '正在导出...';
  exportStatus.className = 'export-status';
  
  try {
    const data = await apiRequest(`${API_BASE}/api/videos/export`, {
      method: 'POST',
      body: JSON.stringify({
        format,
        filters: currentFilters
      })
    });
    
    if (data.success) {
      exportStatus.textContent = `导出成功！`;
      exportStatus.className = 'export-status success';
      
      // 自动下载
      const link = document.createElement('a');
      link.href = data.data.downloadUrl;
      link.download = data.data.filename;
      link.click();
      
      setTimeout(() => {
        exportStatus.textContent = '';
      }, 3000);
    }
  } catch (error) {
    exportStatus.textContent = `导出失败: ${error.message}`;
    exportStatus.className = 'export-status error';
  }
}

// ==================== Utility Functions ====================
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncate(text, length) {
  if (!text) return 'N/A';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

function getStatusText(status) {
  const statusMap = {
    'pending': '待下载',
    'downloading': '下载中',
    'completed': '已完成',
    'failed': '失败'
  };
  return statusMap[status] || status;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ==================== Event Listeners ====================
document.addEventListener('DOMContentLoaded', () => {
  // 连接 WebSocket
  connectWebSocket();
  
  // 加载初始数据
  loadStats();
  loadVideos();
  
  // 音频下载选项切换
  document.getElementById('downloadAudio').addEventListener('change', (e) => {
    document.getElementById('audioFormatGroup').style.display = e.target.checked ? 'block' : 'none';
  });
  
  // 添加视频按钮
  document.getElementById('btnAddVideos').addEventListener('click', addVideos);
  
  // 开始下载按钮
  document.getElementById('btnStartDownload').addEventListener('click', startDownload);
  
  // 搜索按钮
  document.getElementById('btnSearch').addEventListener('click', () => {
    currentFilters = {
      keyword: document.getElementById('searchKeyword').value,
      start_date: document.getElementById('searchStartDate').value,
      end_date: document.getElementById('searchEndDate').value,
      status: document.getElementById('searchStatus').value
    };
    currentPage = 1;
    loadVideos(currentFilters);
  });
  
  // 重置按钮
  document.getElementById('btnReset').addEventListener('click', () => {
    document.getElementById('searchKeyword').value = '';
    document.getElementById('searchStartDate').value = '';
    document.getElementById('searchEndDate').value = '';
    document.getElementById('searchStatus').value = '';
    currentFilters = {};
    currentPage = 1;
    loadVideos();
  });
  
  // 导出按钮
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.getAttribute('data-format');
      exportVideos(format);
    });
  });
  
  // 分页按钮
  document.getElementById('btnPrevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadVideos(currentFilters);
    }
  });
  
  document.getElementById('btnNextPage').addEventListener('click', () => {
    currentPage++;
    loadVideos(currentFilters);
  });
  
  // 定期刷新统计
  setInterval(loadStats, 10000); // 每10秒刷新一次
});
