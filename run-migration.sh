#!/bin/bash
# 运行数据库迁移脚本

echo "=== 开始数据库迁移 ==="
echo ""

# 从.env文件读取数据库配置
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 设置默认值
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-slideshow_generator}
DB_USER=${DB_USER:-postgres}

echo "数据库配置："
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

# 执行迁移
echo "执行迁移脚本..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/migrate-add-animation-duration.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "=== ✅ 迁移完成！==="
else
    echo ""
    echo "=== ❌ 迁移失败！==="
    exit 1
fi
