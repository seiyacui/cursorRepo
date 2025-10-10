#!/bin/bash

# YouTube视频批量下载管理器启动脚本

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📹 YouTube视频批量下载管理器"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请先安装 Node.js 16+ 版本"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查 PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  警告: 未检测到 PostgreSQL 命令行工具"
    echo "请确保 PostgreSQL 已安装并运行"
else
    echo "✅ PostgreSQL 已安装"
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装成功"
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  未找到 .env 文件"
    echo "正在从 .env.example 复制..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 创建必要的目录
echo ""
echo "📁 创建必要的目录..."
mkdir -p downloads/videos
mkdir -p downloads/audios
mkdir -p exports
echo "✅ 目录创建完成"

# 检查数据库表是否存在
echo ""
echo "🔍 检查数据库..."
read -p "是否需要初始化数据库表？(y/n): " init_db
if [ "$init_db" = "y" ] || [ "$init_db" = "Y" ]; then
    npm run init-db
    if [ $? -ne 0 ]; then
        echo "❌ 数据库初始化失败，请检查数据库配置"
        exit 1
    fi
fi

# 启动服务器
echo ""
echo "🚀 正在启动服务器..."
echo ""
npm start
