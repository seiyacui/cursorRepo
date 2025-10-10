// Slideshow Video Generator - Frontend Application

// ==================== Configuration ====================
const API_BASE = window.location.origin;
const WS_URL = `ws://${window.location.host}`;

// ==================== State ====================
let ws = null;
let currentPage = 1;
let pageSize = 50;
let currentFilters = {};
let currentVideoId = null;
let generationTimer = null;
let generationStartTime = null;

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
    case 'generation_progress':
      updateGenerationProgress(message.videoId, message.data);
      break;
    case 'notification':
      showToast(message.data.message || '通知', 'info');
      break;
    case 'error':
      showToast(`错误: ${message.data.message}`, 'error');
      break;
  }
}

// ==================== UI Updates ====================
function updateGenerationProgress(videoId, data) {
  if (videoId !== currentVideoId) return;

  const progressSection = document.getElementById('progressSection');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');
  const progressBar = document.getElementById('progressBar');

  progressSection.style.display = 'block';

  if (data.status === 'generating') {
    progressText.textContent = data.message || '正在生成...';
    progressPercent.textContent = `${data.progress || 0}%`;
    progressBar.style.width = `${data.progress || 0}%`;
  } else if (data.status === 'completed') {
    clearInterval(generationTimer);
    progressText.textContent = '生成完成！';
    progressPercent.textContent = '100%';
    progressBar.style.width = '100%';

    setTimeout(() => {
      loadVideoDetails(videoId);
    }, 1000);
  } else if (data.status === 'failed') {
    clearInterval(generationTimer);
    progressText.textContent = '生成失败：' + (data.error || '未知错误');
    progressBar.style.backgroundColor = '#dc3545';
    showToast('视频生成失败', 'error');
  }
}

async function loadVideoDetails(videoId) {
  try {
    const response = await fetch(`${API_BASE}/api/videos/${videoId}`);
    const data = await response.json();

    if (data.success && data.data.generation_status === 'completed') {
      showGenerationReport(data.data);
    }
  } catch (error) {
    console.error('加载视频详情失败:', error);
  }
}

function showGenerationReport(video) {
  // 立即停止所有计时器和轮询
  if (generationTimer) {
    clearInterval(generationTimer);
    generationTimer = null;
  }
  if (progressPollingInterval) {
    clearInterval(progressPollingInterval);
    progressPollingInterval = null;
  }

  const progressSection = document.getElementById('progressSection');
  const reportSection = document.getElementById('reportSection');

  progressSection.style.display = 'none';
  reportSection.style.display = 'block';

  // 计算总耗时
  const totalTime = generationStartTime ? Math.floor((Date.now() - generationStartTime) / 1000) : 0;
  
  // 显示详细的生成报告
  document.getElementById('reportDuration').textContent = formatDuration(video.video_duration);
  document.getElementById('reportSize').textContent = formatFileSize(video.video_file_size);
  document.getElementById('reportFormat').textContent = (video.video_format || 'mp4').toUpperCase();

  // 设置下载链接
  const downloadLink = document.getElementById('downloadLink');
  if (video.video_filename) {
    downloadLink.href = `/outputs/${video.video_filename}`;
    downloadLink.download = video.video_filename;
    downloadLink.style.display = 'inline-flex';
  } else {
    downloadLink.style.display = 'none';
  }

  console.log('✅ 生成报告显示完成:', {
    duration: video.video_duration,
    size: video.video_file_size,
    filename: video.video_filename,
    totalTime: `${totalTime}秒`
  });

  showToast(`视频生成完成！耗时${totalTime}秒`, 'success');
  loadStats();
}

// ==================== API Calls ====================
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
      document.getElementById('generatingVideos').textContent = stats.generating || 0;
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

async function loadVideos(filters = {}) {
  try {
    const params = new URLSearchParams({
      limit: pageSize,
      offset: (currentPage - 1) * (pageSize === 'ALL' ? 0 : pageSize),
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
    tbody.innerHTML = '<tr><td colspan="9" class="no-data">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = videos.map(v => `
    <tr>
      <td>${v.id}</td>
      <td title="${v.text_content}">${truncate(v.text_content, 50)}</td>
      <td>${v.video_filename || 'N/A'}</td>
      <td>${v.video_format ? v.video_format.toUpperCase() : 'N/A'}</td>
      <td>${formatDuration(v.video_duration)}</td>
      <td>${formatFileSize(v.video_file_size)}</td>
      <td>${formatDate(v.created_at)}</td>
      <td><span class="status-badge status-${v.generation_status}">${getStatusText(v.generation_status)}</span></td>
      <td>
        ${v.generation_status === 'completed' ? 
          `<a href="/outputs/${v.video_filename}" download class="btn btn-success" style="padding: 6px 12px; font-size: 12px;">下载</a>` : 
          ''}
        <button class="btn btn-danger" onclick="deleteVideo(${v.id})">删除</button>
      </td>
    </tr>
  `).join('');
}

function updatePagination(total) {
  if (pageSize === 'ALL') {
    document.getElementById('pageInfo').textContent = `共 ${total} 条`;
    document.getElementById('btnPrevPage').disabled = true;
    document.getElementById('btnNextPage').disabled = true;
    return;
  }

  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('pageInfo').textContent = `第 ${currentPage} / ${totalPages} 页 (共 ${total} 条)`;

  document.getElementById('btnPrevPage').disabled = currentPage === 1;
  document.getElementById('btnNextPage').disabled = currentPage >= totalPages;
}

async function deleteVideo(id) {
  if (!confirm('确定要删除这个视频吗？这将同时删除视频文件。')) {
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

async function submitVideoForm(e) {
  e.preventDefault();

  // 确保 WebSocket 已连接
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️  WebSocket 未连接，尝试重新连接...');
    connectWebSocket();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒连接
  }

  const form = document.getElementById('videoForm');
  const formData = new FormData(form);

  // 处理透明背景
  if (document.getElementById('transparentBg').checked) {
    formData.set('font_background_color', 'transparent');
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> 正在上传...';

  try {
    // 1. 创建视频记录
    const createData = await apiRequest(`${API_BASE}/api/videos/create`, {
      method: 'POST',
      body: formData
    });

    if (createData.success) {
      currentVideoId = createData.data.id;
      showToast('视频记录创建成功，开始生成...', 'success');

      // 2. 开始生成视频
      const generateData = await apiRequest(`${API_BASE}/api/videos/${currentVideoId}/generate`, {
        method: 'POST'
      });

      if (generateData.success) {
        // 显示进度区域
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('reportSection').style.display = 'none';

        // 启动计时器
        generationStartTime = Date.now();
        generationTimer = setInterval(() => {
          const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
          document.getElementById('elapsedTime').textContent = `${elapsed}秒`;
        }, 1000);

        // 启动轮询（作为WebSocket的备份）
        startProgressPolling(currentVideoId);

        showToast('视频生成任务已启动', 'success');
      }
    }
  } catch (error) {
    showToast('提交失败: ' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '🚀 生成视频';
  }
}

// 轮询进度（WebSocket备份方案）
let progressPollingInterval = null;
function startProgressPolling(videoId) {
  console.log(`🔄 启动进度轮询（videoId: ${videoId}）`);
  
  // 清除旧的轮询
  if (progressPollingInterval) {
    clearInterval(progressPollingInterval);
  }

  // 每2秒轮询一次
  progressPollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}`);
      const data = await response.json();

      if (data.success) {
        const video = data.data;
        console.log(`📊 轮询进度: ${video.generation_progress}%, 状态: ${video.generation_status}`);

        // 更新进度显示
        const progressText = document.getElementById('progressText');
        const progressPercent = document.getElementById('progressPercent');
        const progressBar = document.getElementById('progressBar');

        progressText.textContent = `生成中... ${video.generation_status}`;
        progressPercent.textContent = `${video.generation_progress}%`;
        progressBar.style.width = `${video.generation_progress}%`;

        // 如果完成或失败，停止轮询
        if (video.generation_status === 'completed') {
          // 停止所有计时器
          if (progressPollingInterval) {
            clearInterval(progressPollingInterval);
            progressPollingInterval = null;
          }
          if (generationTimer) {
            clearInterval(generationTimer);
            generationTimer = null;
          }
          
          showGenerationReport(video);
          
          // 刷新统计和列表
          loadStats();
          // 如果在列表TAB，刷新列表
          if (document.getElementById('tab-list').classList.contains('active')) {
            loadVideos();
          }
        } else if (video.generation_status === 'failed') {
          // 停止所有计时器
          if (progressPollingInterval) {
            clearInterval(progressPollingInterval);
            progressPollingInterval = null;
          }
          if (generationTimer) {
            clearInterval(generationTimer);
            generationTimer = null;
          }
          
          progressText.textContent = '生成失败：' + (video.error_message || '未知错误');
          progressBar.style.backgroundColor = '#dc3545';
          showToast('视频生成失败', 'error');
          loadStats();
        }
      }
    } catch (error) {
      console.error('轮询进度失败:', error);
    }
  }, 2000);
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

// ==================== Preview Functions ====================
function updatePreview() {
  const previewCanvas = document.getElementById('previewCanvas');
  const textContent = document.getElementById('textContent').value || '预览文本';
  const backgroundColor = document.getElementById('backgroundImage').files.length > 0 ? 
    '#888' : document.getElementById('backgroundColor').value;
  const fontFamily = document.getElementById('fontFamily').value;
  const fontSize = document.getElementById('fontSize').value + 'px';
  const fontColor = document.getElementById('fontColor').value;
  const fontBackgroundColor = document.getElementById('transparentBg').checked ? 
    'transparent' : document.getElementById('fontBackgroundColor').value;

  const marginTop = document.getElementById('marginTop').value + 'px';
  const marginBottom = document.getElementById('marginBottom').value + 'px';
  const marginLeft = document.getElementById('marginLeft').value + 'px';
  const marginRight = document.getElementById('marginRight').value + 'px';

  previewCanvas.style.backgroundColor = backgroundColor;
  previewCanvas.style.fontFamily = fontFamily;
  previewCanvas.style.fontSize = fontSize;
  previewCanvas.style.color = fontColor;
  previewCanvas.style.backgroundColor = fontBackgroundColor === 'transparent' ? backgroundColor : fontBackgroundColor;
  previewCanvas.style.padding = `${marginTop} ${marginRight} ${marginBottom} ${marginLeft}`;
  previewCanvas.textContent = textContent;

  // 应用动画效果
  const animation = document.getElementById('textAnimation').value;
  applyPreviewAnimation(previewCanvas, animation);
}

function applyPreviewAnimation(element, animation) {
  element.style.animation = 'none';
  setTimeout(() => {
    switch (animation) {
      case 'fade':
        element.style.animation = 'fadeIn 1s ease-in-out';
        break;
      case 'slide_left':
        element.style.animation = 'slideInLeft 1s ease-out';
        break;
      case 'slide_right':
        element.style.animation = 'slideInRight 1s ease-out';
        break;
      case 'slide_up':
        element.style.animation = 'slideInUp 1s ease-out';
        break;
      case 'slide_down':
        element.style.animation = 'slideInDown 1s ease-out';
        break;
      case 'zoom_in':
        element.style.animation = 'zoomIn 1s ease-out';
        break;
    }
  }, 10);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideInLeft {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  @keyframes slideInUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  @keyframes slideInDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
  @keyframes zoomIn {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;
document.head.appendChild(style);

// ==================== Utility Functions ====================
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  // 确保处理小数秒数
  const totalSeconds = Math.floor(parseFloat(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
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
    'pending': '待生成',
    'generating': '生成中',
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

  // Tab切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');

      // 更新按钮状态
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 更新内容显示
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${tabName}`).classList.add('active');

      // 如果切换到列表页，加载数据
      if (tabName === 'list') {
        loadVideos();
      }
    });
  });

  // 文件选择显示
  ['backgroundMusic', 'backgroundImage', 'customFont'].forEach(id => {
    const input = document.getElementById(id);
    const fileName = document.getElementById(id.replace(/([A-Z])/g, '-$1').toLowerCase().replace('background-', '') + 'FileName');
    
    if (input && fileName) {
      fileName.addEventListener('click', () => input.click());
      
      input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          fileName.textContent = e.target.files[0].name;
        } else {
          fileName.textContent = '未选择文件';
        }
      });
    }
  });

  // 透明背景复选框
  document.getElementById('transparentBg').addEventListener('change', (e) => {
    document.getElementById('fontBackgroundColor').disabled = e.target.checked;
  });

  // 表单提交
  document.getElementById('videoForm').addEventListener('submit', submitVideoForm);

  // 预览按钮
  document.getElementById('btnPreview').addEventListener('click', updatePreview);

  // 实时预览更新
  ['textContent', 'backgroundColor', 'fontFamily', 'fontSize', 'fontColor', 
   'fontBackgroundColor', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
   'textAnimation', 'transparentBg'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', updatePreview);
      element.addEventListener('change', updatePreview);
    }
  });

  // 初始预览
  updatePreview();

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

  // 分页
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

  document.getElementById('pageSize').addEventListener('change', (e) => {
    pageSize = e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value);
    currentPage = 1;
    loadVideos(currentFilters);
  });

  // 定期刷新统计
  setInterval(loadStats, 10000); // 每10秒刷新一次
});
