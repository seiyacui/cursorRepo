// API 基础路径
const API_BASE = window.location.origin + '/api';

// 全局变量
let currentPage = 1;
let currentFilters = {};
let refreshInterval = null;
let startTime = null;
let timerInterval = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadVideoList();
  loadStatistics();
});

// 初始化事件监听器
function initEventListeners() {
  // 音频下载复选框
  document.getElementById('downloadAudio').addEventListener('change', (e) => {
    document.getElementById('audioFormat').disabled = !e.target.checked;
  });

  // 下载按钮
  document.getElementById('downloadBtn').addEventListener('click', startDownload);

  // 搜索按钮
  document.getElementById('searchBtn').addEventListener('click', searchVideos);
  
  // 重置按钮
  document.getElementById('resetBtn').addEventListener('click', resetSearch);

  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadVideoList();
    loadStatistics();
  });

  // 导出按钮
  document.getElementById('exportBtn').addEventListener('click', exportList);

  // 分页按钮
  document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
  document.getElementById('nextPage').addEventListener('click', () => changePage(1));

  // 回车搜索
  document.getElementById('searchKeyword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchVideos();
    }
  });
}

// 开始下载
async function startDownload() {
  const urlInput = document.getElementById('urlInput').value.trim();
  
  if (!urlInput) {
    showToast('请输入视频地址', 'error');
    return;
  }

  // 解析 URL 列表
  const urls = urlInput
    .split('\n')
    .map(url => url.trim())
    .filter(url => url && (url.includes('youtube.com') || url.includes('youtu.be')));

  if (urls.length === 0) {
    showToast('请输入有效的YouTube视频地址', 'error');
    return;
  }

  // 获取配置
  const config = {
    urls,
    videoFormat: document.getElementById('videoFormat').value,
    videoQuality: document.getElementById('videoQuality').value,
    downloadAudio: document.getElementById('downloadAudio').checked,
    audioFormat: document.getElementById('audioFormat').value
  };

  // 禁用下载按钮
  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn.disabled = true;
  downloadBtn.textContent = '⏳ 提交中...';

  try {
    const response = await fetch(`${API_BASE}/videos/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    const result = await response.json();

    if (response.ok) {
      showToast(`已提交 ${urls.length} 个视频下载任务`, 'success');
      
      // 显示进度区域
      document.getElementById('progressSection').style.display = 'block';
      document.getElementById('downloadReport').style.display = 'none';
      
      // 开始计时
      startTime = Date.now();
      startTimer();
      
      // 开始轮询进度
      startProgressPolling();
      
      // 清空输入框
      document.getElementById('urlInput').value = '';
    } else {
      showToast(result.error || '提交失败', 'error');
    }
  } catch (error) {
    console.error('下载失败:', error);
    showToast('提交失败: ' + error.message, 'error');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = '🚀 开始下载';
  }
}

// 开始计时器
function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    if (startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      document.getElementById('elapsedTime').textContent = formatElapsedTime(elapsed);
    }
  }, 1000);
}

// 格式化耗时
function formatElapsedTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}小时${m}分${s}秒`;
  } else if (m > 0) {
    return `${m}分${s}秒`;
  } else {
    return `${s}秒`;
  }
}

// 开始轮询下载进度
function startProgressPolling() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(async () => {
    try {
      const statsResponse = await fetch(`${API_BASE}/videos/stats/summary`);
      const statsData = await statsResponse.json();

      if (statsData.success) {
        const { downloadStatus } = statsData.data;
        const active = downloadStatus.active || 0;
        const queued = downloadStatus.queued || 0;

        // 更新进度信息
        document.getElementById('progressText').textContent = 
          `下载中: ${active} 个 | 队列中: ${queued} 个`;

        // 刷新列表和统计
        await loadVideoList();
        await loadStatistics();

        // 如果没有活动下载和队列，显示完成报告
        if (active === 0 && queued === 0) {
          stopProgressPolling();
          showDownloadReport();
        }
      }
    } catch (error) {
      console.error('获取进度失败:', error);
    }
  }, 2000); // 每2秒轮询一次
}

// 停止轮询
function stopProgressPolling() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// 显示下载报告
async function showDownloadReport() {
  try {
    const response = await fetch(`${API_BASE}/videos/stats/summary`);
    const result = await response.json();

    if (result.success) {
      const stats = result.data;
      const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      const reportContent = `
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <div class="stat-value">${stats.total || 0}</div>
              <div class="stat-label">总数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-value">${stats.completed || 0}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">❌</div>
            <div class="stat-info">
              <div class="stat-value">${stats.failed || 0}</div>
              <div class="stat-label">失败</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-info">
              <div class="stat-value">${formatElapsedTime(elapsed)}</div>
              <div class="stat-label">总耗时</div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('reportContent').innerHTML = reportContent;
      document.getElementById('downloadReport').style.display = 'block';
      document.getElementById('progressFill').style.width = '100%';
      document.getElementById('progressPercent').textContent = '100%';

      showToast('下载任务已完成！', 'success');
    }
  } catch (error) {
    console.error('获取报告失败:', error);
  }
}

// 加载视频列表
async function loadVideoList(page = 1) {
  try {
    const params = new URLSearchParams({
      page,
      limit: 20,
      ...currentFilters
    });

    const response = await fetch(`${API_BASE}/videos?${params}`);
    const result = await response.json();

    if (result.success) {
      renderVideoTable(result.data);
      renderPagination(result.pagination);
      currentPage = result.pagination.page;
    }
  } catch (error) {
    console.error('加载列表失败:', error);
    showToast('加载列表失败', 'error');
  }
}

// 渲染视频表格
function renderVideoTable(videos) {
  const tbody = document.getElementById('videoTableBody');

  if (!videos || videos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="no-data">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = videos.map(video => `
    <tr>
      <td>${video.id}</td>
      <td title="${escapeHtml(video.title || video.filename || '-')}">
        ${truncate(video.title || video.filename || '-', 40)}
      </td>
      <td>${video.video_format || '-'}</td>
      <td>${video.audio_format || '-'}</td>
      <td>${formatDuration(video.duration)}</td>
      <td>${formatFileSize(video.video_size)}</td>
      <td>${formatFileSize(video.audio_size)}</td>
      <td>${formatDate(video.created_at)}</td>
      <td><span class="status ${video.download_status}">${getStatusText(video.download_status)}</span></td>
      <td>
        <div class="action-btns">
          ${video.download_status === 'completed' && video.video_path ? 
            `<button class="action-btn download" onclick="downloadFile(${video.id}, 'video')">📥 视频</button>` : ''}
          ${video.download_status === 'completed' && video.audio_path ? 
            `<button class="action-btn download" onclick="downloadFile(${video.id}, 'audio')">🎵 音频</button>` : ''}
          <button class="action-btn delete" onclick="deleteVideo(${video.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// 渲染分页
function renderPagination(pagination) {
  const paginationDiv = document.getElementById('pagination');
  
  if (pagination.totalPages <= 1) {
    paginationDiv.style.display = 'none';
    return;
  }

  paginationDiv.style.display = 'flex';
  document.getElementById('pageInfo').textContent = 
    `第 ${pagination.page} 页 / 共 ${pagination.totalPages} 页`;
  
  document.getElementById('prevPage').disabled = pagination.page <= 1;
  document.getElementById('nextPage').disabled = pagination.page >= pagination.totalPages;
}

// 加载统计信息
async function loadStatistics() {
  try {
    const response = await fetch(`${API_BASE}/videos/stats/summary`);
    const result = await response.json();

    if (result.success) {
      const stats = result.data;
      document.getElementById('totalCount').textContent = stats.total || 0;
      document.getElementById('completedStat').textContent = stats.completed || 0;
      document.getElementById('downloadingStat').textContent = stats.downloading || 0;
      
      const totalSize = (parseInt(stats.total_video_size) || 0) + (parseInt(stats.total_audio_size) || 0);
      document.getElementById('totalSize').textContent = formatFileSize(totalSize);
      
      // 更新完成和失败计数
      document.getElementById('completedCount').textContent = stats.completed || 0;
      document.getElementById('failedCount').textContent = stats.failed || 0;
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

// 搜索视频
function searchVideos() {
  const keyword = document.getElementById('searchKeyword').value.trim();
  const status = document.getElementById('statusFilter').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  currentFilters = {};
  
  if (keyword) currentFilters.keyword = keyword;
  if (status) currentFilters.status = status;
  if (startDate) currentFilters.startDate = startDate;
  if (endDate) currentFilters.endDate = endDate;

  currentPage = 1;
  loadVideoList(currentPage);
}

// 重置搜索
function resetSearch() {
  document.getElementById('searchKeyword').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  
  currentFilters = {};
  currentPage = 1;
  loadVideoList(currentPage);
}

// 换页
function changePage(delta) {
  const newPage = currentPage + delta;
  loadVideoList(newPage);
}

// 导出列表
async function exportList() {
  const format = document.getElementById('exportFormat').value;
  const exportBtn = document.getElementById('exportBtn');
  
  exportBtn.disabled = true;
  exportBtn.textContent = '⏳ 导出中...';

  try {
    const response = await fetch(`${API_BASE}/videos/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        format,
        filters: currentFilters
      })
    });

    const result = await response.json();

    if (response.ok) {
      showToast(`导出成功: ${result.data.filename}`, 'success');
      
      // 下载导出文件
      window.open(`/exports/${result.data.filename}`, '_blank');
    } else {
      showToast(result.error || '导出失败', 'error');
    }
  } catch (error) {
    console.error('导出失败:', error);
    showToast('导出失败: ' + error.message, 'error');
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = '📤 导出列表';
  }
}

// 下载文件
function downloadFile(id, type) {
  window.open(`${API_BASE}/videos/download-file/${id}/${type}`, '_blank');
}

// 删除视频
async function deleteVideo(id) {
  if (!confirm('确定要删除这个视频记录吗？文件也会被删除。')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/videos/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      showToast('删除成功', 'success');
      loadVideoList(currentPage);
      loadStatistics();
    } else {
      showToast(result.error || '删除失败', 'error');
    }
  } catch (error) {
    console.error('删除失败:', error);
    showToast('删除失败: ' + error.message, 'error');
  }
}

// 显示下载链接
async function showDownloadLinks() {
  try {
    const response = await fetch(`${API_BASE}/videos?status=completed&limit=100`);
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      const modalBody = document.getElementById('modalBody');
      
      modalBody.innerHTML = result.data.map(video => `
        <div class="download-link-item">
          <div class="download-link-info">
            <h4>${escapeHtml(video.title || video.filename)}</h4>
            <p>格式: ${video.video_format || '-'} | 大小: ${formatFileSize(video.video_size)}</p>
          </div>
          <div class="action-btns">
            ${video.video_path ? `<button class="action-btn download" onclick="downloadFile(${video.id}, 'video')">📥 视频</button>` : ''}
            ${video.audio_path ? `<button class="action-btn download" onclick="downloadFile(${video.id}, 'audio')">🎵 音频</button>` : ''}
          </div>
        </div>
      `).join('');

      document.getElementById('downloadModal').style.display = 'flex';
    } else {
      showToast('没有可下载的文件', 'warning');
    }
  } catch (error) {
    console.error('获取下载链接失败:', error);
    showToast('获取下载链接失败', 'error');
  }
}

// 关闭模态框
function closeModal() {
  document.getElementById('downloadModal').style.display = 'none';
}

// 显示 Toast 通知
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// 工具函数
function formatFileSize(bytes) {
  if (!bytes) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
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
    'completed': '已完成',
    'downloading': '下载中',
    'pending': '等待中',
    'failed': '失败'
  };
  return statusMap[status] || status;
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

// 点击模态框外部关闭
window.onclick = function(event) {
  const modal = document.getElementById('downloadModal');
  if (event.target === modal) {
    closeModal();
  }
}
