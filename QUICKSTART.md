# 🚀 快速开始指南

## 3 步启动应用

### 步骤 1: 一键安装

```bash
# 运行安装脚本
./setup.sh
```

脚本会自动：
- ✅ 检查 Python 和 PostgreSQL
- ✅ 创建虚拟环境（可选）
- ✅ 安装所有依赖
- ✅ 创建配置文件
- ✅ 初始化数据库

### 步骤 2: 配置环境

编辑 `.env` 文件，**重点配置**：

```env
# 数据库密码（必须修改）
DB_PASSWORD=your_secure_password

# HuggingFace 缓存目录（重要！）
HF_HOME=/Volumes/Mont125 - Données/Users/seigneur/.cache/tahoe26/huggingface
```

### 步骤 3: 启动应用

```bash
# 激活虚拟环境（如果使用）
source venv/bin/activate

# 启动应用
python3 app.py
```

访问: **http://localhost:7860**

---

## ⚡ 快速使用

### 生成第一张图片

1. 在"文本内容"框输入：
   ```
   一个穿着'QWEN' T恤的中国美女，手持黑马克笔微笑，
   身后玻璃板上手写：'Qwen-Image 的未来：赋能内容创作'
   ```

2. 点击 **"🎨 生成图片"**

3. 等待生成完成（约 1-3 分钟）

4. 点击 **下载** 保存图片

### 查看历史记录

1. 切换到 **"📊 数据管理"** 标签
2. 查看所有生成记录
3. 使用搜索功能筛选

### 导出数据

1. 选择导出格式（Excel/HTML/TXT/Markdown）
2. 点击 **"📤 导出"**
3. 下载生成的文件

---

## 💡 快速技巧

### 提高生成质量

```python
推理步数: 30-35   # 更高质量
引导比例: 8.0-9.0  # 更贴合描述
```

### 加快生成速度

```python
推理步数: 20-25   # 更快速度
引导比例: 6.0-7.0  # 平衡质量和速度
```

### Apple Silicon 用户

如果使用 M1/M2/M3 Mac，可以尝试 MPS 加速：

```env
DEVICE=mps
```

---

## 🐛 常见问题速查

### Q: 安装失败

```bash
# 确保 Python 版本
python3 --version  # 需要 3.8+

# 手动安装依赖
pip3 install -r requirements.txt
```

### Q: 数据库错误

```bash
# 启动 PostgreSQL
brew services start postgresql

# 创建数据库
psql -U postgres -c "CREATE DATABASE text2image_db;"

# 初始化表
python3 database/init_db.py
```

### Q: 模型加载慢

```
首次使用会下载模型（约 10GB），需要耐心等待
后续使用会从缓存加载，速度较快
```

### Q: 内存不足

```
建议至少 16GB 内存
关闭其他占用内存的程序
降低推理步数到 20-25
```

---

## 📞 获取帮助

- 📖 查看完整文档: [README.md](README.md)
- 🐛 提交问题: GitHub Issues

---

**现在开始创作吧！🎨**
