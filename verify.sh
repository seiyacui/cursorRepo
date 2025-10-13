#!/bin/bash

# 文本转图片生成器 - 环境验证脚本

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🔍 文本转图片生成器 - 环境验证                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

check_command "python3" "--version"
check_command "pip3" "--version"
check_command "psql" "--version"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  检查项目文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "核心文件:"
check_file "app.py"
check_file "text2image_generator.py"
check_file "export_manager.py"
check_file "requirements.txt"
check_file ".env"

echo ""
echo "数据库模块:"
check_file "database/init_db.py"
check_file "database/db_manager.py"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  检查目录结构"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_dir "database"
check_dir "outputs" || echo "     (将在首次运行时自动创建)"
check_dir "exports" || echo "     (将在首次运行时自动创建)"
check_dir "venv" || echo "     (可选，未使用虚拟环境)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  检查 Python 依赖"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if python3 -c "import gradio" &> /dev/null; then
    echo -e "  ${GREEN}✅${NC} gradio"
else
    echo -e "  ${RED}❌${NC} gradio"
    ((ERRORS++))
fi

if python3 -c "import diffusers" &> /dev/null; then
    echo -e "  ${GREEN}✅${NC} diffusers"
else
    echo -e "  ${RED}❌${NC} diffusers"
    ((ERRORS++))
fi

if python3 -c "import torch" &> /dev/null; then
    echo -e "  ${GREEN}✅${NC} torch"
else
    echo -e "  ${RED}❌${NC} torch"
    ((ERRORS++))
fi

if python3 -c "import psycopg2" &> /dev/null; then
    echo -e "  ${GREEN}✅${NC} psycopg2"
else
    echo -e "  ${RED}❌${NC} psycopg2"
    ((ERRORS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  检查环境配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".env" ]; then
    echo -e "  ${GREEN}✅${NC} .env 配置文件存在"
    
    if grep -q "DB_NAME" .env; then
        DB_NAME=$(grep "DB_NAME" .env | cut -d'=' -f2)
        echo "     数据库名称: $DB_NAME"
    fi
    
    if grep -q "HF_HOME" .env; then
        HF_HOME=$(grep "HF_HOME" .env | cut -d'=' -f2)
        echo "     HF 缓存目录: $HF_HOME"
        
        if [ -d "$HF_HOME" ]; then
            echo -e "     ${GREEN}✅${NC} 缓存目录存在"
        else
            echo -e "     ${YELLOW}⚠️${NC}  缓存目录不存在，将自动创建"
            ((WARNINGS++))
        fi
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
        
        if [ -f ".env" ] && grep -q "DB_NAME" .env; then
            DB_NAME=$(grep "DB_NAME" .env | cut -d'=' -f2)
            DB_USER=$(grep "DB_USER" .env | cut -d'=' -f2)
            
            if psql -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
                echo -e "  ${GREEN}✅${NC} 数据库 '$DB_NAME' 存在"
            else
                echo -e "  ${YELLOW}⚠️${NC}  数据库 '$DB_NAME' 不存在"
                echo "     请运行: python3 database/init_db.py"
                ((WARNINGS++))
            fi
        fi
    else
        echo -e "  ${RED}❌${NC} PostgreSQL 服务未运行"
        echo "     macOS: brew services start postgresql"
        ((ERRORS++))
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  检查系统资源"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查内存
if command -v sysctl &> /dev/null; then
    TOTAL_MEM=$(sysctl -n hw.memsize 2>/dev/null)
    if [ ! -z "$TOTAL_MEM" ]; then
        TOTAL_MEM_GB=$((TOTAL_MEM / 1024 / 1024 / 1024))
        echo "  总内存: ${TOTAL_MEM_GB}GB"
        
        if [ $TOTAL_MEM_GB -ge 16 ]; then
            echo -e "  ${GREEN}✅${NC} 内存充足"
        else
            echo -e "  ${YELLOW}⚠️${NC}  内存较少，建议 16GB+"
            ((WARNINGS++))
        fi
    fi
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
    echo "🚀 可以启动应用了："
    echo "   python3 app.py"
    echo ""
elif [ $ERRORS -eq 0 ] && [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  有 $WARNINGS 个警告，但可以继续                  ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "💡 建议查看上面的警告信息"
    echo "🚀 可以启动: python3 app.py"
    echo ""
else
    echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ 发现 $ERRORS 个错误，$WARNINGS 个警告                 ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "🔧 请先修复错误："
    
    if ! command -v python3 &> /dev/null; then
        echo "   • 安装 Python 3.8+"
    fi
    
    if ! command -v psql &> /dev/null; then
        echo "   • 安装 PostgreSQL: brew install postgresql"
    fi
    
    if [ ! -f ".env" ]; then
        echo "   • 创建配置: cp .env.example .env"
    fi
    
    echo ""
    echo "📖 详细说明请查看: README.md"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $ERRORS
