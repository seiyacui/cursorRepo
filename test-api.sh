#!/bin/bash

# API 测试脚本

BASE_URL="http://localhost:3000"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 YouTube下载管理器 API 测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试健康检查
echo "1️⃣ 测试健康检查..."
curl -s "${BASE_URL}/health" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/health"
echo ""
echo ""

# 测试获取统计信息
echo "2️⃣ 测试获取统计信息..."
curl -s "${BASE_URL}/api/videos/stats/summary" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/api/videos/stats/summary"
echo ""
echo ""

# 测试获取视频列表
echo "3️⃣ 测试获取视频列表..."
curl -s "${BASE_URL}/api/videos?page=1&limit=10" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/api/videos?page=1&limit=10"
echo ""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ API 测试完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 提示："
echo "  - 如果看到正常的 JSON 响应，说明 API 工作正常"
echo "  - 如果连接失败，请确保服务器正在运行"
echo "  - 运行服务器: npm start"
echo ""
