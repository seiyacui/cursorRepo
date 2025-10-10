#!/bin/bash

# YouTube Video Downloader - Setup Script
echo "🎬 YouTube 视频批量下载器 - 安装脚本"
echo "=========================================="
echo ""

# Check Node.js
echo "检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js (https://nodejs.org/)"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"

# Check PostgreSQL
echo "检查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  未检测到 PostgreSQL，请确保已安装并运行 PostgreSQL"
    echo "   macOS: brew install postgresql"
    echo "   启动: brew services start postgresql"
fi

# Check yt-dlp
echo "检查 yt-dlp..."
if ! command -v yt-dlp &> /dev/null; then
    echo "❌ 未检测到 yt-dlp，正在安装..."
    if command -v brew &> /dev/null; then
        brew install yt-dlp
    else
        echo "请手动安装 yt-dlp: pip3 install yt-dlp"
        exit 1
    fi
fi
echo "✅ yt-dlp 版本: $(yt-dlp --version)"

# Install npm dependencies
echo ""
echo "安装 Node.js 依赖..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "创建 .env 配置文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请编辑配置数据库连接信息"
fi

# Create download directories
echo ""
echo "创建下载目录..."
mkdir -p downloads/videos
mkdir -p downloads/audio
echo "✅ 下载目录已创建"

# Database setup
echo ""
echo "数据库设置"
echo "=========================================="
read -p "是否需要创建数据库? (y/n): " create_db

if [ "$create_db" = "y" ]; then
    read -p "PostgreSQL 用户名 (默认: postgres): " db_user
    db_user=${db_user:-postgres}
    
    read -p "数据库名称 (默认: youtube_downloader): " db_name
    db_name=${db_name:-youtube_downloader}
    
    echo "创建数据库..."
    psql -U "$db_user" -c "CREATE DATABASE $db_name;" 2>/dev/null
    
    echo "初始化数据库表..."
    npm run init-db
fi

echo ""
echo "=========================================="
echo "✅ 安装完成！"
echo ""
echo "下一步:"
echo "1. 编辑 .env 文件配置数据库连接"
echo "2. 运行 'npm start' 启动服务器"
echo "3. 访问 http://localhost:3000"
echo ""
echo "开发模式: npm run dev"
echo "=========================================="
