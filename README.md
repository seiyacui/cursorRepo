# 🎥 YouTube Batch Downloader & Manager

A powerful YouTube video batch downloader and management system built with Node.js + PostgreSQL + Pure HTML/CSS.

[中文文档](README_ZH.md) | English

## ✨ Features

### 📥 Batch Download
- **Batch Input**: Support multiple YouTube video URLs at once
- **Format Selection**: Support multiple video formats (MP4, MKV, WebM, Best Quality)
- **Audio Download**: Optional audio download (MP3, AAC, WAV, Best Quality)
- **Real-time Progress**: Display download progress, speed, and ETA for each video
- **Download Report**: Detailed statistics after download completion

### 📊 Data Management
- **Data Storage**: Store all video information in PostgreSQL database
- **List Display**: Show filename, format, duration, size, creation date, etc.
- **Search & Filter**: Search by keywords, time range, and status
- **Batch Operations**: Support batch selection and export

### 📄 Multi-format Export
Export to the following formats:
- **HTML**: Web format with complete styling
- **PDF**: PDF document for printing and sharing
- **Markdown**: Markdown format for easy editing
- **PNG**: Image format for visual presentation

### 📢 Notification System
Automatically send notifications through 4 channels after download:
1. **WxPusher**: WeChat push notification
2. **PushPlus**: PushPlus notification
3. **Resend Email**: Email notification
4. **Telegram**: Telegram bot notification

### 🌐 Real-time Interaction
- **WebSocket Connection**: Real-time download progress updates
- **Progress Bars**: Visual display of download progress
- **Time Statistics**: Real-time cumulative download time
- **Status Indicators**: Real-time connection and download status

### 🎨 Modern UI
- **Responsive Design**: Perfect for desktop and mobile devices
- **Gradient Colors**: Beautiful purple gradient theme
- **Smooth Animations**: Silky transition effects and animations
- **Chinese Support**: Full Chinese interface with no encoding issues

## 🚀 Quick Start

### Requirements

- **Node.js**: >= 14.x
- **PostgreSQL**: >= 12.x
- **yt-dlp**: Installed and configured in system PATH

### Install yt-dlp (MacOS)

```bash
# Install via Homebrew
brew install yt-dlp

# Or install via pip
pip install yt-dlp

# Verify installation
yt-dlp --version
```

### Install Dependencies

```bash
# Install Node.js dependencies
npm install
```

### Configure Database

1. Create PostgreSQL database:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE youtube_downloader;

# Exit
\q
```

2. Configure environment variables:

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

3. Initialize database:

```bash
npm run init-db
```

### Start Server

```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

Server will start at `http://localhost:3000`.

## 📖 Usage Guide

### 1. Batch Download Videos

1. Enter YouTube video URLs in the text area (one per line)
2. Select video format (MP4, MKV, WebM, or Best Quality)
3. Check "Download Audio" if needed and select audio format
4. Click "Start Download" button
5. Watch real-time download progress

### 2. Search and Filter

1. Enter keywords in search area
2. Select date range (optional)
3. Select status filter (completed, downloading, failed, etc.)
4. Click "Search" button

### 3. Export List

1. Select videos to export (or export all)
2. Click corresponding export button (HTML, PDF, Markdown, PNG)
3. Browser will automatically download the generated file

### 4. Download Video/Audio Files

In the "Actions" column of video list:
- Click "Video" button to download video file
- Click "Audio" button to download audio file
- Click "Delete" button to remove record and files

## 🏗️ Project Structure

```
youtube-batch-downloader/
├── db/                      # Database related
│   ├── database.js         # Database connection
│   ├── schema.sql          # Database schema
│   └── init.js             # Initialization script
├── services/                # Service modules
│   ├── downloader.js       # Download service
│   ├── notification.js     # Notification service
│   ├── exporter.js         # Export service
│   └── websocket.js        # WebSocket service
├── public/                  # Frontend files
│   ├── index.html          # Main page
│   ├── styles.css          # Stylesheet
│   └── app.js              # Frontend logic
├── downloads/               # Download directory
├── exports/                 # Export files directory
├── server.js                # Main server
├── package.json             # Project configuration
├── .env.example             # Environment template
└── README.md                # Documentation
```

## 📝 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

**Note**: This tool is for educational and research purposes only. Please comply with YouTube's Terms of Service and relevant laws.
cursorRepo
