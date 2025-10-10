#!/bin/bash

# YouTube Video Downloader - Installation Verification Script
# 安装验证脚本

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🔍 YouTube 视频批量下载器 - 安装验证                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "  ${GREEN}✅${NC} $1: $(command -v $1)"
        if [ ! -z "$2" ]; then
            echo "     版本: $($1 $2 2>&1 | head -1)"
        fi
        return 0
    else
        echo -e "  ${RED}❌${NC} $1: 未安装"
        ((ERRORS++))
        return 1
    fi
}

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo -e "  ${GREEN}✅${NC} $1"
        return 0
    else
        echo -e "  ${RED}❌${NC} $1: 文件不存在"
        ((ERRORS++))
        return 1
    fi
}

# Function to check directory
check_dir() {
    if [ -d "$1" ]; then
        echo -e "  ${GREEN}✅${NC} $1/"
        return 0
    else
        echo -e "  ${YELLOW}⚠️${NC}  $1/: 目录不存在"
        ((WARNINGS++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  检查系统依赖"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_command "node" "--version"
check_command "npm" "--version"
check_command "psql" "--version"
check_command "yt-dlp" "--version"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  检查项目文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "核心文件:"
check_file "server.js"
check_file "package.json"
check_file ".env"
check_file ".gitignore"

echo ""
echo "数据库模块:"
check_file "db/init.js"
check_file "db/database.js"

echo ""
echo "服务模块:"
check_file "services/downloader.js"
check_file "services/export.js"
check_file "services/notificationAdapter.js"

echo ""
echo "前端文件:"
check_file "public/index.html"
check_file "public/styles.css"
check_file "public/app.js"

echo ""
echo "文档文件:"
check_file "README.md"
check_file "QUICKSTART.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  检查目录结构"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_dir "db"
check_dir "services"
check_dir "public"
check_dir "downloads" || echo "     (将在首次运行时自动创建)"
check_dir "node_modules" || echo "     (运行 'npm install' 安装依赖)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  检查 Node.js 依赖"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "node_modules" ]; then
    echo -e "  ${GREEN}✅${NC} Node.js 依赖已安装"
    
    # Check key packages
    if [ -d "node_modules/express" ]; then
        echo -e "  ${GREEN}✅${NC} express"
    else
        echo -e "  ${RED}❌${NC} express"
        ((ERRORS++))
    fi
    
    if [ -d "node_modules/pg" ]; then
        echo -e "  ${GREEN}✅${NC} pg (PostgreSQL)"
    else
        echo -e "  ${RED}❌${NC} pg (PostgreSQL)"
        ((ERRORS++))
    fi
    
    if [ -d "node_modules/ws" ]; then
        echo -e "  ${GREEN}✅${NC} ws (WebSocket)"
    else
        echo -e "  ${RED}❌${NC} ws (WebSocket)"
        ((ERRORS++))
    fi
else
    echo -e "  ${YELLOW}⚠️${NC}  node_modules 不存在，请运行: npm install"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  检查环境配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".env" ]; then
    echo -e "  ${GREEN}✅${NC} .env 配置文件存在"
    
    # Check key configurations
    if grep -q "DB_NAME" .env; then
        DB_NAME=$(grep "DB_NAME" .env | cut -d'=' -f2)
        echo "     数据库名称: $DB_NAME"
    fi
    
    if grep -q "PORT" .env; then
        PORT=$(grep "PORT" .env | cut -d'=' -f2)
        echo "     服务器端口: $PORT"
    fi
    
    if grep -q "MAX_CONCURRENT_DOWNLOADS" .env; then
        MAX_CONCURRENT=$(grep "MAX_CONCURRENT_DOWNLOADS" .env | cut -d'=' -f2)
        echo "     最大并发数: $MAX_CONCURRENT"
    fi
else
    echo -e "  ${RED}❌${NC} .env 配置文件不存在"
    echo "     请复制 .env.example 到 .env 并修改配置"
    ((ERRORS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  检查数据库连接"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v psql &> /dev/null; then
    if pg_isready &> /dev/null; then
        echo -e "  ${GREEN}✅${NC} PostgreSQL 服务运行中"
        
        # Try to connect to database
        if [ -f ".env" ] && grep -q "DB_NAME" .env; then
            DB_NAME=$(grep "DB_NAME" .env | cut -d'=' -f2)
            DB_USER=$(grep "DB_USER" .env | cut -d'=' -f2)
            
            if psql -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
                echo -e "  ${GREEN}✅${NC} 数据库 '$DB_NAME' 存在"
            else
                echo -e "  ${YELLOW}⚠️${NC}  数据库 '$DB_NAME' 不存在"
                echo "     请运行: npm run init-db"
                ((WARNINGS++))
            fi
        fi
    else
        echo -e "  ${RED}❌${NC} PostgreSQL 服务未运行"
        echo "     macOS: brew services start postgresql"
        echo "     Linux: sudo systemctl start postgresql"
        ((ERRORS++))
    fi
else
    echo -e "  ${RED}❌${NC} PostgreSQL 未安装"
    ((ERRORS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  检查网络连接"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s --connect-timeout 5 https://www.youtube.com > /dev/null; then
    echo -e "  ${GREEN}✅${NC} 可以访问 YouTube"
else
    echo -e "  ${YELLOW}⚠️${NC}  无法访问 YouTube（可能需要代理）"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 验证结果总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ 完美！所有检查都通过了！                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "🚀 可以启动服务器了："
    echo "   npm start"
    echo ""
    echo "📖 访问文档："
    echo "   README.md        - 完整文档"
    echo "   QUICKSTART.md    - 快速开始"
    echo ""
elif [ $ERRORS -eq 0 ] && [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  有 $WARNINGS 个警告，但可以继续                  ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "💡 建议："
    echo "   1. 查看上面的警告信息"
    echo "   2. 解决警告后体验会更好"
    echo "   3. 如果急用，可以先启动：npm start"
    echo ""
else
    echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ 发现 $ERRORS 个错误，$WARNINGS 个警告                 ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "🔧 请先修复以下问题："
    
    if ! command -v node &> /dev/null; then
        echo "   • 安装 Node.js: https://nodejs.org/"
    fi
    
    if ! command -v psql &> /dev/null; then
        echo "   • 安装 PostgreSQL"
        echo "     macOS: brew install postgresql"
    fi
    
    if ! command -v yt-dlp &> /dev/null; then
        echo "   • 安装 yt-dlp"
        echo "     macOS: brew install yt-dlp"
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "   • 安装 Node.js 依赖: npm install"
    fi
    
    if [ ! -f ".env" ]; then
        echo "   • 创建配置文件: cp .env.example .env"
    fi
    
    echo ""
    echo "📖 详细说明请查看: README.md"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $ERRORS
