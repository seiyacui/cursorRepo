// YouTube批量下载器前端应用
class YouTubeDownloader {
    constructor() {
        this.socket = null;
        this.currentTask = null;
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.startTime = null;
        this.timerInterval = null;
        
        this.init();
    }

    // 初始化应用
    init() {
        this.initSocket();
        this.bindEvents();
        this.loadVideoList();
        this.loadStats();
        
        // 定期刷新统计数据
        setInterval(() => {
            this.loadStats();
        }, 30000); // 30秒刷新一次
    }

    // 初始化WebSocket连接
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('WebSocket连接成功');
            this.showToast('已连接到服务器', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket连接断开');
            this.showToast('与服务器连接断开', 'warning');
        });

        this.socket.on('download-progress', (data) => {
            this.updateProgress(data);
        });

        this.socket.on('download-complete', (data) => {
            this.handleDownloadComplete(data);
        });

        this.socket.on('download-error', (data) => {
            this.handleDownloadError(data);
        });
    }

    // 绑定事件监听器
    bindEvents() {
        // 音频下载选项切换
        document.getElementById('downloadAudio').addEventListener('change', (e) => {
            const audioOptions = document.querySelector('.audio-options');
            if (e.target.checked) {
                audioOptions.style.display = 'block';
                audioOptions.classList.add('active');
            } else {
                audioOptions.style.display = 'none';
                audioOptions.classList.remove('active');
            }
        });

        // 开始下载按钮
        document.getElementById('startDownload').addEventListener('click', () => {
            this.startDownload();
        });

        // 停止下载按钮
        document.getElementById('stopDownload').addEventListener('click', () => {
            this.stopDownload();
        });

        // 搜索功能
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchVideos();
        });

        document.getElementById('searchKeyword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchVideos();
            }
        });

        // 清除筛选
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // 刷新列表
        document.getElementById('refreshList').addEventListener('click', () => {
            this.loadVideoList();
        });

        // 导出数据
        document.getElementById('exportData').addEventListener('click', () => {
            this.showExportModal();
        });

        // 分页
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadVideoList();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadVideoList();
            }
        });

        // 新建下载
        document.getElementById('newDownload').addEventListener('click', () => {
            this.resetDownloadForm();
        });

        // 模态框事件
        document.getElementById('cancelExport').addEventListener('click', () => {
            this.hideExportModal();
        });

        document.getElementById('confirmExport').addEventListener('click', () => {
            this.exportData();
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideExportModal();
        });

        // 点击模态框外部关闭
        document.getElementById('exportModal').addEventListener('click', (e) => {
            if (e.target.id === 'exportModal') {
                this.hideExportModal();
            }
        });
    }

    // 开始下载
    async startDownload() {
        const urls = this.getVideoUrls();
        if (urls.length === 0) {
            this.showToast('请输入至少一个YouTube视频地址', 'error');
            return;
        }

        const options = this.getDownloadOptions();
        
        try {
            // 显示进度面板
            this.showProgressPanel();
            
            // 更新UI状态
            document.getElementById('startDownload').style.display = 'none';
            document.getElementById('stopDownload').style.display = 'inline-flex';
            
            // 初始化进度
            this.initProgress(urls.length);
            
            // 发送下载请求
            const response = await fetch('/api/download/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    urls: urls,
                    ...options
                }),
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentTask = result.data;
                this.showToast('下载任务已启动', 'success');
            } else {
                throw new Error(result.message || '启动下载失败');
            }
            
        } catch (error) {
            console.error('下载失败:', error);
            this.showToast(`下载失败: ${error.message}`, 'error');
            this.resetDownloadUI();
        }
    }

    // 停止下载
    async stopDownload() {
        if (!this.currentTask) {
            return;
        }

        try {
            const response = await fetch(`/api/download/stop/${this.currentTask.id}`, {
                method: 'POST',
            });

            const result = await response.json();
            
            if (result.success) {
                this.showToast('下载已停止', 'warning');
                this.resetDownloadUI();
            } else {
                throw new Error(result.message || '停止下载失败');
            }
            
        } catch (error) {
            console.error('停止下载失败:', error);
            this.showToast(`停止下载失败: ${error.message}`, 'error');
        }
    }

    // 获取视频URL列表
    getVideoUrls() {
        const textarea = document.getElementById('videoUrls');
        const text = textarea.value.trim();
        
        if (!text) return [];
        
        return text.split('\n')
            .map(url => url.trim())
            .filter(url => url && this.isValidYouTubeUrl(url));
    }

    // 验证YouTube URL
    isValidYouTubeUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
            /^https?:\/\/youtu\.be\/[\w-]+/,
            /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
        ];
        
        return patterns.some(pattern => pattern.test(url));
    }

    // 获取下载选项
    getDownloadOptions() {
        return {
            video_format: document.getElementById('videoFormat').value,
            audio_format: document.getElementById('audioFormat').value,
            download_audio: document.getElementById('downloadAudio').checked,
            quality: document.getElementById('videoQuality').value,
        };
    }

    // 显示进度面板
    showProgressPanel() {
        document.querySelector('.progress-panel').style.display = 'block';
        document.querySelector('.report-panel').style.display = 'none';
    }

    // 初始化进度显示
    initProgress(total) {
        document.getElementById('totalCount').textContent = total;
        document.getElementById('completedCount').textContent = '0';
        document.getElementById('failedCount').textContent = '0';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        document.getElementById('currentVideo').textContent = '准备开始下载...';
        
        // 开始计时
        this.startTime = Date.now();
        this.startTimer();
    }

    // 开始计时器
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                document.getElementById('elapsedTime').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    // 停止计时器
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // 更新进度
    updateProgress(data) {
        const { completed, failed, total, currentVideo, progress } = data;
        
        document.getElementById('completedCount').textContent = completed || 0;
        document.getElementById('failedCount').textContent = failed || 0;
        
        const totalProgress = ((completed + failed) / total) * 100;
        document.getElementById('progressBar').style.width = `${totalProgress}%`;
        document.getElementById('progressText').textContent = `${Math.round(totalProgress)}%`;
        
        if (currentVideo) {
            document.getElementById('currentVideo').textContent = `正在下载: ${currentVideo}`;
        }
    }

    // 处理下载完成
    handleDownloadComplete(data) {
        this.stopTimer();
        this.showDownloadReport(data);
        this.resetDownloadUI();
        this.loadVideoList(); // 刷新视频列表
        this.loadStats(); // 刷新统计
    }

    // 处理下载错误
    handleDownloadError(data) {
        this.showToast(`下载出错: ${data.message}`, 'error');
        this.resetDownloadUI();
    }

    // 显示下载报告
    showDownloadReport(data) {
        document.querySelector('.progress-panel').style.display = 'none';
        document.querySelector('.report-panel').style.display = 'block';
        
        const reportDiv = document.getElementById('downloadReport');
        const { total, completed, failed, duration, videos } = data;
        
        let html = `
            <div class="report-summary">
                <h3>📊 下载统计</h3>
                <div class="report-stats">
                    <div class="report-stat">
                        <span class="stat-value">${total}</span>
                        <span class="stat-label">总数</span>
                    </div>
                    <div class="report-stat">
                        <span class="stat-value">${completed}</span>
                        <span class="stat-label">成功</span>
                    </div>
                    <div class="report-stat">
                        <span class="stat-value">${failed}</span>
                        <span class="stat-label">失败</span>
                    </div>
                    <div class="report-stat">
                        <span class="stat-value">${duration}s</span>
                        <span class="stat-label">耗时</span>
                    </div>
                </div>
            </div>
        `;
        
        if (videos && videos.length > 0) {
            html += `<div class="report-details">
                <h4>📋 详细结果</h4>
                <div class="report-list">`;
            
            videos.forEach((video, index) => {
                const status = video.error ? 'failed' : 'success';
                const statusIcon = video.error ? '❌' : '✅';
                const statusText = video.error ? video.error : '下载成功';
                
                html += `
                    <div class="report-item ${status}">
                        <span class="report-icon">${statusIcon}</span>
                        <div class="report-content">
                            <div class="report-title">${video.title || `视频 ${index + 1}`}</div>
                            <div class="report-status">${statusText}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        reportDiv.innerHTML = html;
    }

    // 重置下载UI
    resetDownloadUI() {
        document.getElementById('startDownload').style.display = 'inline-flex';
        document.getElementById('stopDownload').style.display = 'none';
        this.currentTask = null;
        this.stopTimer();
    }

    // 重置下载表单
    resetDownloadForm() {
        document.getElementById('videoUrls').value = '';
        document.querySelector('.progress-panel').style.display = 'none';
        document.querySelector('.report-panel').style.display = 'none';
        this.resetDownloadUI();
    }

    // 加载视频列表
    async loadVideoList() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                search: document.getElementById('searchKeyword').value || '',
                dateFrom: document.getElementById('dateFrom').value || '',
                dateTo: document.getElementById('dateTo').value || '',
            });

            const response = await fetch(`/api/videos?${params}`);
            const result = await response.json();

            if (result.success) {
                this.renderVideoList(result.data.videos);
                this.updatePagination(result.data.pagination);
            } else {
                throw new Error(result.message || '加载视频列表失败');
            }
        } catch (error) {
            console.error('加载视频列表失败:', error);
            document.getElementById('videoListContent').innerHTML = 
                '<div class="loading">加载失败，请重试</div>';
        }
    }

    // 渲染视频列表
    renderVideoList(videos) {
        const container = document.getElementById('videoListContent');
        
        if (videos.length === 0) {
            container.innerHTML = '<div class="loading">暂无视频数据</div>';
            return;
        }

        let html = '';
        videos.forEach(video => {
            const thumbnail = video.thumbnail_path ? 
                `/api/files/thumbnail/${encodeURIComponent(video.thumbnail_path)}` : 
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA2MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjMwIiB5PSIyMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSI+8J+OrDwvdGV4dD4KPHN2Zz4K';
            
            const duration = this.formatDuration(video.duration);
            const videoSize = this.formatFileSize(video.video_file_size);
            const audioSize = video.audio_file_size ? this.formatFileSize(video.audio_file_size) : '-';
            const totalSize = video.video_file_size && video.audio_file_size ? 
                this.formatFileSize(video.video_file_size + video.audio_file_size) : videoSize;
            
            const createdAt = new Date(video.created_at).toLocaleString('zh-CN');
            
            html += `
                <div class="video-item">
                    <div class="item-cell">
                        <img src="${thumbnail}" alt="缩略图" class="video-thumbnail" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA2MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjMwIiB5PSIyMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSI+8J+OrDwvdGV4dD4KPHN2Zz4K'">
                    </div>
                    <div class="item-cell title">
                        <div class="video-title" title="${video.title || video.filename || 'Unknown'}">${video.title || video.filename || 'Unknown'}</div>
                    </div>
                    <div class="item-cell">
                        ${video.video_format ? video.video_format.toUpperCase() : '-'}
                        ${video.audio_format ? `<br><small>${video.audio_format.toUpperCase()}</small>` : ''}
                    </div>
                    <div class="item-cell">${duration}</div>
                    <div class="item-cell">
                        <div>视频: ${videoSize}</div>
                        <div><small>音频: ${audioSize}</small></div>
                    </div>
                    <div class="item-cell">
                        <span class="status-badge status-${video.status}">${this.getStatusText(video.status)}</span>
                    </div>
                    <div class="item-cell">
                        <small>${createdAt}</small>
                    </div>
                    <div class="item-cell">
                        <div class="item-actions">
                            ${video.status === 'completed' && video.video_file_path ? 
                                `<button class="btn btn-small btn-primary" onclick="app.downloadFile('${video.id}', 'video')">📥</button>` : ''}
                            ${video.status === 'completed' && video.audio_file_path ? 
                                `<button class="btn btn-small btn-success" onclick="app.downloadFile('${video.id}', 'audio')">🎵</button>` : ''}
                            <button class="btn btn-small btn-outline" onclick="app.deleteVideo('${video.id}')">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // 更新分页信息
    updatePagination(pagination) {
        this.currentPage = pagination.currentPage;
        this.totalPages = pagination.totalPages;
        
        document.getElementById('pageInfo').textContent = 
            `第 ${pagination.currentPage} 页，共 ${pagination.totalPages} 页`;
        
        document.getElementById('prevPage').disabled = pagination.currentPage <= 1;
        document.getElementById('nextPage').disabled = pagination.currentPage >= pagination.totalPages;
    }

    // 搜索视频
    searchVideos() {
        this.currentPage = 1;
        this.loadVideoList();
    }

    // 清除筛选
    clearFilters() {
        document.getElementById('searchKeyword').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        this.currentPage = 1;
        this.loadVideoList();
    }

    // 加载统计数据
    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const result = await response.json();

            if (result.success) {
                const stats = result.data;
                document.getElementById('totalVideos').textContent = stats.totalVideos;
                document.getElementById('completedVideos').textContent = stats.completedVideos;
                document.getElementById('totalSize').textContent = this.formatFileSize(stats.totalVideoSize + stats.totalAudioSize);
                document.getElementById('avgDuration').textContent = this.formatDuration(stats.avgDuration);
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
    }

    // 下载文件
    async downloadFile(videoId, type) {
        try {
            const response = await fetch(`/api/files/download/${videoId}/${type}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || `${type}_${videoId}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showToast('文件下载已开始', 'success');
            } else {
                throw new Error('文件下载失败');
            }
        } catch (error) {
            console.error('下载文件失败:', error);
            this.showToast(`下载失败: ${error.message}`, 'error');
        }
    }

    // 删除视频
    async deleteVideo(videoId) {
        if (!confirm('确定要删除这个视频记录吗？')) {
            return;
        }

        try {
            const response = await fetch(`/api/videos/${videoId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('视频记录已删除', 'success');
                this.loadVideoList();
                this.loadStats();
            } else {
                throw new Error(result.message || '删除失败');
            }
        } catch (error) {
            console.error('删除视频失败:', error);
            this.showToast(`删除失败: ${error.message}`, 'error');
        }
    }

    // 显示导出模态框
    showExportModal() {
        document.getElementById('exportModal').style.display = 'flex';
    }

    // 隐藏导出模态框
    hideExportModal() {
        document.getElementById('exportModal').style.display = 'none';
    }

    // 导出数据
    async exportData() {
        const format = document.querySelector('input[name="exportFormat"]:checked').value;
        const exportAll = document.getElementById('exportAll').checked;
        
        try {
            const params = new URLSearchParams({
                format,
                all: exportAll,
            });

            if (!exportAll) {
                // 添加当前筛选条件
                params.append('search', document.getElementById('searchKeyword').value || '');
                params.append('dateFrom', document.getElementById('dateFrom').value || '');
                params.append('dateTo', document.getElementById('dateTo').value || '');
            }

            const response = await fetch(`/api/export?${params}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || `export.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showToast('导出成功', 'success');
                this.hideExportModal();
            } else {
                throw new Error('导出失败');
            }
        } catch (error) {
            console.error('导出失败:', error);
            this.showToast(`导出失败: ${error.message}`, 'error');
        }
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // 格式化时长
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
            return `${m}:${s.toString().padStart(2, '0')}`;
        }
    }

    // 获取状态文本
    getStatusText(status) {
        const statusMap = {
            'pending': '等待中',
            'downloading': '下载中',
            'completed': '已完成',
            'failed': '失败'
        };
        return statusMap[status] || status;
    }

    // 显示Toast通知
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 初始化应用
const app = new YouTubeDownloader();