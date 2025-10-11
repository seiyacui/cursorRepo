# 数据库迁移指南 - 添加 animation_duration 字段

## 🎯 目的

为 `videos` 表添加 `animation_duration` 字段，以支持用户自定义动画效果时长（0.5-5.0秒）。

---

## 🔍 问题说明

### 症状
用户在前端设置"动画效果时长（秒）"参数后，该参数不生效。

### 原因
数据库 `videos` 表缺少 `animation_duration` 字段，导致：
1. ✅ 前端发送参数正常
2. ✅ 后端接收参数正常
3. ❌ 数据库无法存储参数
4. ❌ 视频生成时使用默认值（1.5秒）

---

## 🛠️ 迁移方法

### 方法1: 使用 Node.js 脚本（推荐）

在项目根目录执行：

```bash
node db/run-migration.js
```

**预期输出**：
```
🔧 开始数据库迁移：添加 animation_duration 字段...

➕ 添加 animation_duration 字段...
✅ 字段添加成功！

📊 字段信息:
   名称: animation_duration
   类型: numeric
   默认值: 1.5

📝 已为 68 条现有记录设置默认值 1.5秒

=== ✅ 迁移完成！===
```

---

### 方法2: 使用 SQL 脚本

**步骤1**: 连接数据库
```bash
psql -h localhost -p 5432 -U postgres -d slideshow_generator
```

**步骤2**: 执行迁移脚本
```sql
\i db/migrate-add-animation-duration.sql
```

或直接执行SQL：
```sql
ALTER TABLE videos 
ADD COLUMN animation_duration DECIMAL(3, 1) DEFAULT 1.5;

COMMENT ON COLUMN videos.animation_duration IS '动画效果时长（秒）：0.5-5.0';
```

---

### 方法3: 使用 Bash 脚本

```bash
./run-migration.sh
```

---

## 🧪 验证迁移

### 1. 检查字段是否存在

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name='videos' 
AND column_name='animation_duration';
```

**预期结果**：
```
   column_name    | data_type | column_default 
------------------+-----------+----------------
 animation_duration | numeric   | 1.5
```

### 2. 查看现有记录

```sql
SELECT id, text_animation, animation_duration 
FROM videos 
ORDER BY id DESC 
LIMIT 5;
```

**预期结果**：所有记录的 `animation_duration` 应为 `1.5`（默认值）

---

## 🚀 测试新功能

### 1. 重启服务器
```bash
# 在服务器终端
Ctrl + C
npm start
```

### 2. 访问前端界面
```
http://localhost:3000/
Ctrl + Shift + R  # 硬刷新
```

### 3. 测试动画时长

#### 测试案例1: 快速动画（0.5秒）
```
文本内容: 快速淡入测试
背景音乐: [上传音频]
幻灯片时长: 5秒
文本动画效果: 淡入淡出
动画效果时长: 0.5秒  ← 设置为0.5秒
```

**查看后台日志**：
```
⏱️  动画时长: 0.5秒 (用户设定: 0.5)  ✅
  ✅ 淡入淡出: 淡入0.5s, 淡出从4.5s开始
```

#### 测试案例2: 慢速动画（3.5秒）
```
文本内容: 慢速旋转测试
背景音乐: [上传音频]
幻灯片时长: 8秒
文本动画效果: 旋转（360度）
动画效果时长: 3.5秒  ← 设置为3.5秒
```

**查看后台日志**：
```
⏱️  动画时长: 3.5秒 (用户设定: 3.5)  ✅
  ✅ 旋转效果 (顺时针360度, 3.5秒)
```

---

## 📋 字段规格

| 属性 | 值 |
|------|-----|
| **字段名** | `animation_duration` |
| **类型** | `DECIMAL(3, 1)` |
| **默认值** | `1.5` |
| **允许NULL** | No |
| **范围** | 0.5 - 5.0 秒 |
| **增量** | 0.1 秒 |
| **描述** | 动画效果的持续时间 |

---

## ❓ 常见问题

### Q1: 迁移后现有视频的动画时长是多少？
**A**: 所有现有视频的 `animation_duration` 自动设置为 `1.5` 秒（默认值）。

### Q2: 迁移失败怎么办？
**A**: 检查以下几点：
- 数据库连接配置是否正确（`.env` 文件）
- 数据库用户是否有 `ALTER TABLE` 权限
- PostgreSQL服务是否正常运行

### Q3: 如何回滚迁移？
**A**: 如果需要删除字段（不推荐）：
```sql
ALTER TABLE videos DROP COLUMN animation_duration;
```

### Q4: 为什么不使用 INTEGER 类型？
**A**: `DECIMAL(3,1)` 支持 0.1 秒的精度（如 1.5秒），`INTEGER` 只能存储整数。

---

## 📊 迁移前后对比

| 项目 | 迁移前 | 迁移后 |
|------|--------|--------|
| **数据库字段** | ❌ 不存在 | ✅ 存在 |
| **参数传递** | ✅ 前端→后端 | ✅ 前端→后端→数据库 |
| **参数存储** | ❌ 丢失 | ✅ 持久化 |
| **后台日志** | "用户设定: 默认" | "用户设定: 2.5" |
| **动画效果** | ❌ 固定1.5秒 | ✅ 用户可控 |

---

## ✅ 迁移检查清单

- [ ] 备份数据库（可选但推荐）
- [ ] 执行迁移脚本
- [ ] 验证字段存在
- [ ] 重启服务器
- [ ] 测试快速动画（0.5秒）
- [ ] 测试慢速动画（3.5秒）
- [ ] 查看后台日志确认参数生效
- [ ] 播放视频验证动画时长正确

---

## 🎉 完成后

动画效果时长参数将完全可用：
- ✅ 用户设置 → 前端发送 → 后端接收 → 数据库存储 → 视频生成
- ✅ 支持 0.5-5.0 秒范围，0.1 秒增量
- ✅ 所有25+种动画效果都遵循用户设置

---

**需要帮助？** 查看后台日志中的错误信息，或联系开发团队。
