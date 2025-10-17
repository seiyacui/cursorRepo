#!/bin/bash

# 文本转图片生成器 - 安装脚本

echo "🎨 文本转图片生成器 - 安装脚本"
echo "=========================================="
echo ""

# 检查 Python
echo "检查 Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 未检测到 Python3，请先安装 Python 3.8+"
    exit 1
fi
echo "✅ Python 版本: $(python3 --version)"

# 检查 PostgreSQL
echo "检查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  未检测到 PostgreSQL"
    echo "   macOS: brew install postgresql"
    echo "   启动: brew services start postgresql"
else
    echo "✅ PostgreSQL 版本: $(psql --version)"
fi

# 创建虚拟环境（推荐）
echo ""
read -p "是否创建 Python 虚拟环境? (y/n): " create_venv

if [ "$create_venv" = "y" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    echo "✅ 虚拟环境已创建并激活"
fi

# 安装 Python 依赖
echo ""
echo "安装 Python 依赖..."
pip install -r requirements.txt

# 创建 .env 文件
if [ ! -f .env ]; then
    echo ""
    echo "创建 .env 配置文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请编辑配置"
fi

# 创建输出目录
echo ""
echo "创建输出目录..."
mkdir -p outputs
mkdir -p exports
echo "✅ 输出目录已创建"

# 数据库设置
echo ""
echo "数据库设置"
echo "=========================================="
read -p "是否需要创建数据库? (y/n): " create_db

if [ "$create_db" = "y" ]; then
    read -p "PostgreSQL 用户名 (默认: postgres): " db_user
    db_user=${db_user:-postgres}
    
    read -p "数据库名称 (默认: text2image_db): " db_name
    db_name=${db_name:-text2image_db}
    
    echo "创建数据库..."
    psql -U "$db_user" -c "CREATE DATABASE $db_name;" 2>/dev/null
    
    echo "安装 PostgreSQL 扩展..."
    psql -U "$db_user" -d "$db_name" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null
    
    echo "初始化数据库表..."
    python3 database/init_db.py
fi

echo ""
echo "=========================================="
echo "✅ 安装完成！"
echo ""
echo "下一步:"
echo "1. 编辑 .env 文件配置数据库连接"
echo "2. 运行 'python3 app.py' 启动应用"
echo "3. 访问 http://localhost:7860"
echo ""
echo "如果创建了虚拟环境，记得先激活:"
echo "   source venv/bin/activate"
echo "=========================================="
