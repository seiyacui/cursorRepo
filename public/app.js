// YouTube Batch Downloader - Client Side JavaScript

class YouTubeDownloader {
  constructor() {
    this.ws = null;
    this.videos = [];
    this.filteredVideos = [];
    this.selectedVideoIds = new Set();
    this.downloadStartTime = 0;
    this.downloadTimer = null;
    
    // Pagination
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalPages = 0;
    
    // Sorting
    this.sortColumn = null;
    this.sortDirection = 'asc';
    
    this.init();
  }

  // Initialize application
  init() {
    this.setupWebSocket();
    this.setupEventListeners();
    this.loadVideos();
    this.loadStats();
    
    // Auto-refresh every 10 seconds
    setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.loadVideos();
        this.loadStats();
      }
    }, 10000);
  }

  // Setup WebSocket connection
  setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.updateConnectionStatus(true);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.updateConnectionStatus(false);
      
      // Reconnect after 3 seconds
      setTimeout(() => this.setupWebSocket(), 3000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus(false);
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  // Handle WebSocket messages
  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'connected':
        console.log('WebSocket connection established:', data.message);
        break;
        
      case 'download_start':
        this.addProgressItem(data.videoId, data.url);
        break;
        
      case 'download_progress':
        this.updateProgressItem(data.videoId, data.progress, data.speed, data.eta, data.downloadType);
        break;
        
      case 'download_complete':
        this.completeProgressItem(data.videoId, data.title, data.videoSize, data.audioSize, 
                                   data.videoPath, data.audioPath, data.elapsedTime);
        this.loadVideos();
        this.loadStats();
        break;
        
      case 'download_error':
        this.failProgressItem(data.videoId, data.error);
        this.loadVideos();
        this.loadStats();
        break;
        
      case 'batch_complete':
        this.showBatchComplete(data.totalTime, data.successCount, data.failedCount);
        break;
    }
  }

  // Update connection status
  updateConnectionStatus(connected) {
    const statusEl = document.getElementById('wsStatus');
    if (connected) {
      statusEl.textContent = '已连接';
      statusEl.className = 'status-connected';
    } else {
      statusEl.textContent = '未连接';
      statusEl.className = 'status-disconnected';
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Download audio checkbox
    document.getElementById('downloadAudio').addEventListener('change', (e) => {
      const audioFormatGroup = document.getElementById('audioFormatGroup');
      audioFormatGroup.style.display = e.target.checked ? 'block' : 'none';
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => {
      this.startBatchDownload();
    });

    // Search button
    document.getElementById('searchBtn').addEventListener('click', () => {
      this.loadVideos();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('dateFrom').value = '';
      document.getElementById('dateTo').value = '';
      document.getElementById('statusFilter').value = '';
      this.loadVideos();
    });

    // Export buttons
    document.getElementById('exportHtmlBtn').addEventListener('click', () => {
      this.exportVideos('html');
    });

    document.getElementById('exportPdfBtn').addEventListener('click', () => {
      this.exportVideos('pdf');
    });

    document.getElementById('exportMarkdownBtn').addEventListener('click', () => {
      this.exportVideos('markdown');
    });

    document.getElementById('exportPngBtn').addEventListener('click', () => {
      this.exportVideos('png');
    });

    document.getElementById('exportExcelBtn').addEventListener('click', () => {
      this.exportVideos('excel');
    });

    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('input[name="videoSelect"]');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        if (e.target.checked) {
          this.selectedVideoIds.add(parseInt(cb.value));
        } else {
          this.selectedVideoIds.delete(parseInt(cb.value));
        }
      });
    });

    // Pagination controls
    document.getElementById('pageSize').addEventListener('change', (e) => {
      const value = e.target.value;
      this.pageSize = value === 'all' ? Number.MAX_SAFE_INTEGER : parseInt(value);
      this.currentPage = 1;
      this.renderVideoTable();
    });

    document.getElementById('firstPageBtn').addEventListener('click', () => {
      this.currentPage = 1;
      this.renderVideoTable();
    });

    document.getElementById('prevPageBtn').addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderVideoTable();
      }
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.renderVideoTable();
      }
    });

    document.getElementById('lastPageBtn').addEventListener('click', () => {
      this.currentPage = this.totalPages;
      this.renderVideoTable();
    });

    // Sortable column headers
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const sortColumn = th.getAttribute('data-sort');
        this.sortVideos(sortColumn);
      });
    });
  }

  // Start batch download
  async startBatchDownload() {
    const urlInput = document.getElementById('urlInput').value.trim();
    const videoFormat = document.getElementById('videoFormat').value;
    const audioFormat = document.getElementById('audioFormat').value;
    const downloadAudio = document.getElementById('downloadAudio').checked;

    if (!urlInput) {
      this.showToast('请输入至少一个YouTube视频地址', 'error');
      return;
    }

    const urls = urlInput.split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      this.showToast('请输入有效的YouTube视频地址', 'error');
      return;
    }

    // Validate URLs
    const invalidUrls = urls.filter(url => {
      try {
        const urlObj = new URL(url);
        return !(urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be'));
      } catch {
        return true;
      }
    });

    if (invalidUrls.length > 0) {
      this.showToast(`发现 ${invalidUrls.length} 个无效的YouTube地址`, 'warning');
    }

    // Disable download button
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<span class="loading"></span> 下载中...';

    // Show progress section
    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = 'block';
    document.getElementById('progressContainer').innerHTML = '';
    document.getElementById('downloadReport').style.display = 'none';

    // Reset stats
    document.getElementById('totalTime').textContent = '0s';
    document.getElementById('successCount').textContent = '0';
    document.getElementById('failedCount').textContent = '0';

    // Start timer
    this.downloadStartTime = Date.now();
    this.downloadTimer = setInterval(() => {
      const elapsed = ((Date.now() - this.downloadStartTime) / 1000).toFixed(1);
      document.getElementById('totalTime').textContent = `${elapsed}s`;
    }, 100);

    try {
      const response = await fetch('/api/download/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          urls: urls,
          videoFormat: videoFormat,
          audioFormat: downloadAudio ? audioFormat : null,
          downloadAudio: downloadAudio
        })
      });

      const result = await response.json();

      if (response.ok) {
        this.showToast(`开始下载 ${result.totalVideos} 个视频`, 'success');
      } else {
        throw new Error(result.error || '下载失败');
      }
    } catch (error) {
      console.error('Download error:', error);
      this.showToast('下载失败: ' + error.message, 'error');
      
      // Re-enable download button
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<span class="btn-icon">⬇️</span> 开始下载';
      
      clearInterval(this.downloadTimer);
    }
  }

  // Add progress item
  addProgressItem(videoId, url) {
    const container = document.getElementById('progressContainer');
    
    const item = document.createElement('div');
    item.className = 'progress-item';
    item.id = `progress-${videoId}`;
    item.innerHTML = `
      <div class="progress-header">
        <div class="progress-title">${this.escapeHtml(url)}</div>
        <div class="progress-status downloading">下载中</div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: 0%"></div>
      </div>
      <div class="progress-info">
        <span class="progress-percent">0%</span>
        <span class="progress-speed">-</span>
        <span class="progress-eta">-</span>
      </div>
    `;
    
    container.appendChild(item);
  }

  // Update progress item
  updateProgressItem(videoId, progress, speed, eta, downloadType) {
    const item = document.getElementById(`progress-${videoId}`);
    if (!item) return;

    const progressBar = item.querySelector('.progress-bar');
    const progressPercent = item.querySelector('.progress-percent');
    const progressSpeed = item.querySelector('.progress-speed');
    const progressEta = item.querySelector('.progress-eta');

    progressBar.style.width = `${progress}%`;
    progressPercent.textContent = `${progress}%`;
    progressSpeed.textContent = speed || '-';
    progressEta.textContent = eta ? `剩余 ${eta}` : '-';

    // Update title to show what's downloading
    const title = item.querySelector('.progress-title');
    const currentTitle = title.textContent;
    if (!currentTitle.includes('视频') && !currentTitle.includes('音频')) {
      if (downloadType === 'video') {
        title.textContent = `${currentTitle} (下载视频)`;
      } else if (downloadType === 'audio') {
        title.textContent = `${currentTitle.replace(' (下载视频)', '')} (下载音频)`;
      }
    }
  }

  // Complete progress item
  completeProgressItem(videoId, title, videoSize, audioSize, videoPath, audioPath, elapsedTime) {
    const item = document.getElementById(`progress-${videoId}`);
    if (!item) return;

    item.className = 'progress-item completed';
    
    const progressBar = item.querySelector('.progress-bar');
    const progressStatus = item.querySelector('.progress-status');
    const progressTitle = item.querySelector('.progress-title');
    const progressInfo = item.querySelector('.progress-info');

    progressBar.style.width = '100%';
    progressStatus.textContent = '完成';
    progressStatus.className = 'progress-status completed';
    progressTitle.textContent = title || '未知标题';

    progressInfo.innerHTML = `
      <span>视频: ${this.formatFileSize(videoSize)}</span>
      ${audioSize ? `<span>音频: ${this.formatFileSize(audioSize)}</span>` : ''}
      <span>耗时: ${elapsedTime}s</span>
    `;

    // Update success count
    const successCount = document.getElementById('successCount');
    successCount.textContent = parseInt(successCount.textContent) + 1;
  }

  // Fail progress item
  failProgressItem(videoId, error) {
    const item = document.getElementById(`progress-${videoId}`);
    if (!item) return;

    item.className = 'progress-item failed';
    
    const progressStatus = item.querySelector('.progress-status');
    const progressInfo = item.querySelector('.progress-info');

    progressStatus.textContent = '失败';
    progressStatus.className = 'progress-status failed';
    
    progressInfo.innerHTML = `<span style="color: var(--danger-color);">错误: ${this.escapeHtml(error)}</span>`;

    // Update failed count
    const failedCount = document.getElementById('failedCount');
    failedCount.textContent = parseInt(failedCount.textContent) + 1;
  }

  // Show batch complete
  showBatchComplete(totalTime, successCount, failedCount) {
    clearInterval(this.downloadTimer);
    
    document.getElementById('totalTime').textContent = `${totalTime}s`;
    
    // Re-enable download button
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span class="btn-icon">⬇️</span> 开始下载';

    // Show download report
    const report = document.getElementById('downloadReport');
    report.style.display = 'block';
    report.innerHTML = `
      <h4>📊 下载报告</h4>
      <div class="download-stats" style="margin-bottom: 15px;">
        <div class="stat-item">
          <span class="stat-label">总耗时</span>
          <span class="stat-value">${totalTime}s</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">成功</span>
          <span class="stat-value" style="color: var(--success-color);">${successCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">失败</span>
          <span class="stat-value" style="color: var(--danger-color);">${failedCount}</span>
        </div>
      </div>
      <p>所有下载已完成！查看下方列表获取下载链接。</p>
    `;

    this.showToast(`批量下载完成！成功: ${successCount}, 失败: ${failedCount}`, 
                    successCount > 0 ? 'success' : 'error');
  }

  // Load videos from API
  async loadVideos() {
    try {
      const search = document.getElementById('searchInput').value.trim();
      const dateFrom = document.getElementById('dateFrom').value;
      const dateTo = document.getElementById('dateTo').value;
      const status = document.getElementById('statusFilter').value;

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (status) params.append('status', status);

      const response = await fetch(`/api/videos?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        this.videos = result.videos;
        this.filteredVideos = result.videos;
        this.currentPage = 1;
        // Apply current sorting if any
        if (this.sortColumn) {
          this.applySorting();
        }
        this.renderVideoTable();
      } else {
        throw new Error(result.error || '加载视频列表失败');
      }
    } catch (error) {
      console.error('Load videos error:', error);
      this.showToast('加载视频列表失败: ' + error.message, 'error');
    }
  }

  // Sort videos by column
  sortVideos(column) {
    // Toggle direction if same column, otherwise set to ascending
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applySorting();
    this.currentPage = 1; // Reset to first page after sorting
    this.renderVideoTable();
  }

  // Apply sorting to filtered videos
  applySorting() {
    if (!this.sortColumn) return;

    this.filteredVideos.sort((a, b) => {
      let aVal = a[this.sortColumn];
      let bVal = b[this.sortColumn];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Special handling for different data types
      if (this.sortColumn === 'duration' || this.sortColumn === 'video_size' || this.sortColumn === 'audio_size') {
        // Numeric comparison
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (this.sortColumn === 'created_at') {
        // Date comparison
        aVal = new Date(aVal).getTime() || 0;
        bVal = new Date(bVal).getTime() || 0;
      } else if (this.sortColumn === 'id') {
        // ID comparison
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        // String comparison (case insensitive)
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Update sort indicators in table headers
  updateSortIndicators() {
    // Remove all sort classes
    document.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('asc', 'desc');
    });

    // Add sort class to current column
    if (this.sortColumn) {
      const th = document.querySelector(`th[data-sort="${this.sortColumn}"]`);
      if (th) {
        th.classList.add(this.sortDirection);
      }
    }
  }

  // Render video table
  renderVideoTable() {
    const tbody = document.getElementById('videoTableBody');
    const recordCount = document.getElementById('recordCount');
    const pageInfo = document.getElementById('pageInfo');

    // Update sort indicators
    this.updateSortIndicators();

    if (this.filteredVideos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" class="no-data">暂无数据</td></tr>';
      recordCount.textContent = '共 0 条记录';
      pageInfo.textContent = '第 0 页 / 共 0 页';
      return;
    }

    // Calculate pagination
    this.totalPages = Math.ceil(this.filteredVideos.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredVideos.length);
    const pageVideos = this.filteredVideos.slice(startIndex, endIndex);

    tbody.innerHTML = pageVideos.map((video, index) => {
      const globalIndex = startIndex + index + 1;
      const shortUrl = video.url ? this.truncate(video.url, 30) : 'N/A';
      return `
      <tr>
        <td><input type="checkbox" name="videoSelect" value="${video.id}"></td>
        <td>${globalIndex}</td>
        <td title="${this.escapeHtml(video.title || video.filename || 'N/A')}">
          ${this.truncate(this.escapeHtml(video.title || video.filename || 'N/A'), 40)}
        </td>
        <td title="${this.escapeHtml(video.url || '')}">
          <a href="${this.escapeHtml(video.url || '#')}" target="_blank" class="url-link">
            ${this.escapeHtml(shortUrl)}
          </a>
        </td>
        <td>${this.escapeHtml(video.video_format || 'N/A')}</td>
        <td>${this.escapeHtml(video.audio_format || 'N/A')}</td>
        <td>${this.formatDuration(video.duration)}</td>
        <td>${this.formatFileSize(video.video_size)}</td>
        <td>${this.formatFileSize(video.audio_size)}</td>
        <td>${this.formatDate(video.created_at)}</td>
        <td><span class="status-badge status-${video.status}">${this.escapeHtml(video.status)}</span></td>
        <td>
          ${video.url ? `<a href="${this.escapeHtml(video.url)}" target="_blank" class="btn btn-small btn-secondary action-btn" title="打开YouTube">🔗</a>` : ''}
          ${video.video_path ? `<a href="/downloads/${this.escapeHtml(video.video_path.split('/').pop())}" class="btn btn-small btn-success action-btn" download>视频</a>` : ''}
          ${video.audio_path ? `<a href="/downloads/${this.escapeHtml(video.audio_path.split('/').pop())}" class="btn btn-small btn-success action-btn" download>音频</a>` : ''}
          <button class="btn btn-small btn-danger action-btn" onclick="app.deleteVideo(${video.id})">删除</button>
        </td>
      </tr>
    `;
    }).join('');

    recordCount.textContent = `共 ${this.filteredVideos.length} 条记录`;
    pageInfo.textContent = `第 ${this.currentPage} 页 / 共 ${this.totalPages} 页`;

    // Update pagination buttons
    document.getElementById('firstPageBtn').disabled = this.currentPage === 1;
    document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
    document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
    document.getElementById('lastPageBtn').disabled = this.currentPage === this.totalPages;

    // Setup checkbox listeners
    document.querySelectorAll('input[name="videoSelect"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const videoId = parseInt(e.target.value);
        if (e.target.checked) {
          this.selectedVideoIds.add(videoId);
        } else {
          this.selectedVideoIds.delete(videoId);
        }
      });
    });
  }

  // Delete video
  async deleteVideo(videoId) {
    if (!confirm('确定要删除这个视频吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        this.showToast('视频删除成功', 'success');
        this.loadVideos();
        this.loadStats();
      } else {
        throw new Error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete video error:', error);
      this.showToast('删除失败: ' + error.message, 'error');
    }
  }

  // Export videos
  async exportVideos(format) {
    try {
      const videoIds = Array.from(this.selectedVideoIds);

      if (videoIds.length === 0 && this.videos.length > 0) {
        if (!confirm(`未选择视频，将导出所有 ${this.videos.length} 个视频，是否继续？`)) {
          return;
        }
      }

      this.showToast(`正在生成 ${format.toUpperCase()} 文件...`, 'info');

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: format,
          videoIds: videoIds.length > 0 ? videoIds : null
        })
      });

      const result = await response.json();

      if (response.ok) {
        this.showToast(`导出成功！`, 'success');
        
        // Download the file
        window.open(result.url, '_blank');
      } else {
        throw new Error(result.error || '导出失败');
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showToast('导出失败: ' + error.message, 'error');
    }
  }

  // Load statistics
  async loadStats() {
    try {
      const response = await fetch('/api/stats');
      const result = await response.json();

      if (response.ok) {
        const stats = result.stats;
        document.getElementById('statTotal').textContent = stats.total;
        document.getElementById('statCompleted').textContent = stats.completed;
        document.getElementById('statFailed').textContent = stats.failed;
        document.getElementById('statVideoSize').textContent = this.formatFileSize(stats.totalVideoSize);
        document.getElementById('statAudioSize').textContent = this.formatFileSize(stats.totalAudioSize);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  }

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.className = 'toast';
    }, 5000);
  }

  // Helper: Format file size
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Helper: Format duration
  formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Helper: Format date
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Helper: Escape HTML
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  // Helper: Truncate text
  truncate(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }
}

// Initialize app
const app = new YouTubeDownloader();
