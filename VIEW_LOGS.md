# 📋 查看后台日志指南

## 🎯 日志文件位置

```
项目根目录/
  └── logs/
      ├── generator.log    # 图片生成器日志
      └── app.log          # 主应用日志
```

## 📊 日志内容说明

### 1. 图片生成日志（logs/generator.log）

记录图片生成的完整过程：

#### 生成开始
```
2025-10-13 15:30:22 [INFO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2025-10-13 15:30:22 [INFO]   🎨 开始生成图片
2025-10-13 15:30:22 [INFO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2025-10-13 15:30:22 [INFO] 📝 提示词: A beautiful sunset over the ocean...
2025-10-13 15:30:22 [INFO] ⚙️  生成参数:
2025-10-13 15:30:22 [INFO]    • 推理步数: 28
2025-10-13 15:30:22 [INFO]    • 引导比例: 7.5
2025-10-13 15:30:22 [INFO]    • 输出目录: ./outputs
```

#### 生成成功
```
2025-10-13 15:30:45 [INFO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2025-10-13 15:30:45 [INFO]   ✅ 图片生成成功
2025-10-13 15:30:45 [INFO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2025-10-13 15:30:45 [INFO] 📁 文件路径: ./outputs/text2img_20251013_153045.png
2025-10-13 15:30:45 [INFO] 📐 图片尺寸: 1024x1024
2025-10-13 15:30:45 [INFO] 📊 文件大小: 1.25 MB
2025-10-13 15:30:45 [INFO] ⏱️  生成耗时: 23.12秒
2025-10-13 15:30:45 [INFO] 🔢 推理步数: 28
2025-10-13 15:30:45 [INFO] 📈 引导比例: 7.5
2025-10-13 15:30:45 [INFO] 🕐 完成时间: 2025-10-13 15:30:45
2025-10-13 15:30:45 [INFO] ════════════════════════════════════════════════
```

#### 生成失败
```
2025-10-13 15:35:10 [ERROR] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2025-10-13 15:35:10 [ERROR]   ❌ 图片生成失败
2025-10-13 15:35:10 [ERROR] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2025-10-13 15:35:10 [ERROR] 错误信息: CUDA out of memory
2025-10-13 15:35:10 [ERROR] 错误类型: RuntimeError
2025-10-13 15:35:10 [ERROR] ════════════════════════════════════════════════
```

### 2. 应用日志（logs/app.log）

记录数据库和通知相关操作：

#### 数据库操作
```
2025-10-13 15:30:45 [INFO] 💾 数据库操作 [保存图片记录]: ✅ 成功
2025-10-13 15:30:45 [INFO]    详情: 记录ID: 123
```

#### 通知状态
```
2025-10-13 15:30:45 [INFO] 🔔 通知已启用 - 活动渠道: WxPusher, Resend Email
2025-10-13 15:30:46 [INFO] ✅ 通知发送成功 - 渠道: WxPusher, Resend Email
```

或者

```
2025-10-13 15:40:00 [INFO] 🔕 通知已禁用
```

## 🔍 查看日志的命令

### 实时查看日志（推荐）

```bash
# 实时查看生成器日志（跟踪新内容）
tail -f logs/generator.log

# 实时查看应用日志
tail -f logs/app.log

# 同时查看两个日志文件
tail -f logs/*.log
```

### 查看历史日志

```bash
# 查看最近100行
tail -n 100 logs/generator.log

# 查看完整日志
cat logs/generator.log

# 查看前50行
head -n 50 logs/generator.log
```

### 搜索日志内容

```bash
# 搜索成功的生成记录
grep "生成成功" logs/generator.log

# 搜索失败的记录
grep "生成失败" logs/generator.log

# 搜索特定日期的记录
grep "2025-10-13" logs/generator.log

# 搜索特定提示词
grep "sunset" logs/generator.log

# 搜索数据库操作
grep "数据库操作" logs/app.log

# 搜索通知状态
grep "通知" logs/app.log
```

### 统计日志

```bash
# 统计成功次数
grep -c "生成成功" logs/generator.log

# 统计失败次数
grep -c "生成失败" logs/generator.log

# 统计今天的生成次数
grep "$(date +%Y-%m-%d)" logs/generator.log | grep -c "开始生成"
```

### 分析耗时

```bash
# 查看所有生成耗时
grep "生成耗时" logs/generator.log

# 提取耗时数值
grep "生成耗时" logs/generator.log | awk '{print $NF}'
```

## 📈 日志分析示例

### 查看最近5次生成记录

```bash
grep -A 7 "图片生成成功" logs/generator.log | tail -n 40
```

输出示例：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ 图片生成成功
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 文件路径: ./outputs/text2img_20251013_153045.png
📐 图片尺寸: 1024x1024
📊 文件大小: 1.25 MB
⏱️  生成耗时: 23.12秒
🔢 推理步数: 28
📈 引导比例: 7.5
```

### 查看失败记录

```bash
grep -A 3 "图片生成失败" logs/generator.log
```

### 查看通知发送记录

```bash
grep "通知" logs/app.log
```

## 🎨 控制台彩色输出

日志在控制台会显示不同颜色：

- **INFO** (绿色) - 正常信息
- **WARNING** (黄色) - 警告信息
- **ERROR** (红色) - 错误信息
- **DEBUG** (青色) - 调试信息

## 💡 使用技巧

### 1. 开启两个终端窗口

**终端1 - 运行应用**
```bash
python app.py
```

**终端2 - 实时查看日志**
```bash
tail -f logs/generator.log
```

### 2. 使用 less 浏览日志

```bash
# 使用 less 查看日志（可搜索、翻页）
less logs/generator.log

# 在 less 中:
# - 按 / 搜索
# - 按 n 下一个匹配
# - 按 q 退出
```

### 3. 导出特定日期的日志

```bash
# 导出今天的日志
grep "$(date +%Y-%m-%d)" logs/generator.log > today_log.txt

# 导出成功记录
grep "生成成功" logs/generator.log > success_log.txt
```

## 🔧 日志清理

### 定期清理日志文件

```bash
# 清空日志文件（保留文件）
> logs/generator.log
> logs/app.log

# 或删除日志文件
rm logs/*.log

# 归档旧日志
mkdir -p logs/archive
mv logs/*.log logs/archive/backup_$(date +%Y%m%d).log
```

## 📊 日志分析脚本示例

### 统计脚本

```bash
#!/bin/bash
# log_stats.sh - 日志统计脚本

echo "📊 日志统计报告"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "生成成功次数: $(grep -c '生成成功' logs/generator.log)"
echo "生成失败次数: $(grep -c '生成失败' logs/generator.log)"
echo "数据库保存成功: $(grep -c '数据库操作.*成功' logs/app.log)"
echo "通知发送次数: $(grep -c '通知发送成功' logs/app.log)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "平均生成耗时:"
grep "生成耗时" logs/generator.log | awk '{print $NF}' | sed 's/秒//' | \
awk '{sum+=$1; count++} END {if(count>0) print sum/count "秒"}'
```

## ✅ 日志功能清单

- ✅ 彩色控制台输出
- ✅ 持久化文件日志
- ✅ 生成开始日志
- ✅ 生成成功日志（包含所有关键信息）
- ✅ 生成失败日志
- ✅ 数据库操作日志
- ✅ 通知状态日志
- ✅ 通知发送结果日志
- ✅ UTF-8 编码支持
- ✅ 自动创建日志目录
- ✅ 按模块分离日志

---

**立即启动应用查看日志效果！**

```bash
python app.py
```

然后在另一个终端查看实时日志：

```bash
tail -f logs/generator.log
```
