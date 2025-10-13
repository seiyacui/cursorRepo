# 🎨 文本转图片生成器

基于 **Qwen-Image** 模型的文本转图片生成工具，使用 Gradio + PostgreSQL + Python 构建。

## ✨ 功能特性

### 核心功能
- ✅ **文本转图片**: 基于 Qwen-Image 大模型生成高质量图片
- ✅ **数据管理**: PostgreSQL 存储所有生成记录
- ✅ **实时进度**: 显示生成进度条和累计耗时
- ✅ **自定义输出**: 可指定图片输出目录
- ✅ **搜索筛选**: 支持关键字和时间范围搜索
- ✅ **多格式导出**: Excel, HTML, TXT, Markdown
- ✅ **一键下载**: 方便的图片下载功能

### 界面特性
- 🎨 美观的 Gradio 界面
- 📊 数据表格展示
- 🔍 强大的搜索功能
- 📤 多格式导出
- ⚡ 实时进度反馈

## 🚀 快速开始

### 环境要求

- **Python**: 3.8+
- **PostgreSQL**: 12+
- **系统**: macOS / Linux (已在 macOS Tahoe 26 测试)
- **硬件**: 建议 16GB+ 内存

### 安装步骤

#### 方式一：一键安装（推荐）

```bash
# 运行安装脚本
./setup.sh
```

#### 方式二：手动安装

```bash
# 1. 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 4. 创建数据库
psql -U postgres -c "CREATE DATABASE text2image_db;"
psql -U postgres -d text2image_db -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# 5. 初始化数据库表
python3 database/init_db.py

# 6. 创建输出目录
mkdir -p outputs exports
```

### 配置说明

编辑 `.env` 文件：

```env
# 数据库配置（必须）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=text2image_db
DB_USER=postgres
DB_PASSWORD=your_password

# HuggingFace 缓存目录（重要！）
HF_HOME=/Volumes/Mont125 - Données/Users/seigneur/.cache/tahoe26/huggingface

# 图片输出目录
DEFAULT_OUTPUT_DIR=./outputs

# 模型配置
MODEL_NAME=Qwen/Qwen-Image
TORCH_DTYPE=bfloat16
DEVICE=cpu

# 生成参数
DEFAULT_NUM_INFERENCE_STEPS=28
DEFAULT_GUIDANCE_SCALE=7.5
```

### 启动应用

```bash
# 激活虚拟环境（如果使用）
source venv/bin/activate

# 启动应用
python3 app.py
```

访问: **http://localhost:7860**

## 📖 使用指南

### 1. 生成图片

1. **输入文本描述**
   ```
   例如：一个穿着'QWEN' T恤的中国美女，手持黑马克笔微笑，
   身后玻璃板上手写：'Qwen-Image 的未来：赋能内容创作'
   ```

2. **调整参数**（可选）
   - **推理步数**: 20-35 推荐（默认 28）
   - **引导比例**: 5-10 推荐（默认 7.5）
   - **输出目录**: 自定义或使用默认

3. **点击"生成图片"**
   - 观察实时进度
   - 等待生成完成

4. **下载图片**
   - 点击下载按钮保存图片

### 2. 搜索和管理

**关键字搜索**
```
输入关键字 → 点击"搜索"
```

**日期范围搜索**
```
开始日期: 2024-01-01
结束日期: 2024-12-31
点击"搜索"
```

**刷新列表**
```
点击"刷新"按钮
```

### 3. 导出数据

1. 选择导出格式：Excel / HTML / TXT / Markdown
2. （可选）设置搜索条件筛选数据
3. 点击"导出"按钮
4. 下载生成的文件

## 📁 项目结构

```
text2image-generator/
├── app.py                      # Gradio 主应用
├── text2image_generator.py     # 图片生成器
├── export_manager.py           # 导出管理器
├── requirements.txt            # Python 依赖
├── .env                        # 环境配置
├── .env.example                # 配置模板
├── setup.sh                    # 安装脚本
├── README.md                   # 使用文档
│
├── database/                   # 数据库模块
│   ├── init_db.py             # 数据库初始化
│   └── db_manager.py          # 数据库管理
│
├── outputs/                    # 生成的图片
└── exports/                    # 导出的文件
```

## 🎯 核心代码说明

### 基于原始 text2image.py

原始代码：
```python
import os
os.environ['HF_HOME'] = "/path/to/huggingface"

from diffusers import QwenImagePipeline
import torch

pipe = QwenImagePipeline.from_pretrained("Qwen/Qwen-Image", torch_dtype=torch.bfloat16)
pipe.to("cpu")
prompt = "一个穿着'QWEN' T恤的中国美女..."
image = pipe(prompt, num_inference_steps=28, guidance_scale=7.5).images[0]
image.save("qwen_image_output.png")
```

### 增强功能

1. **封装为类** (`text2image_generator.py`)
   - 单例模式管理 Pipeline
   - 支持进度回调
   - 自动保存和管理文件

2. **数据库集成** (`database/`)
   - 自动保存生成记录
   - 支持搜索和筛选
   - 完整的 CRUD 操作

3. **Gradio 界面** (`app.py`)
   - 直观的 Web UI
   - 实时进度显示
   - 多格式导出

## 🔧 参数说明

### 推理步数 (num_inference_steps)

- **范围**: 10-50
- **推荐**: 28
- **说明**: 步数越多，图片质量越高，但耗时越长

### 引导比例 (guidance_scale)

- **范围**: 1.0-15.0
- **推荐**: 7.5
- **说明**: 控制生成与文本描述的相关性，越高越贴合描述

### 设备选择 (DEVICE)

- **CPU**: 稳定但较慢，适合测试
- **MPS** (Apple Silicon): 推荐用于 M1/M2/M3 Mac
- **CUDA**: 需要 NVIDIA GPU

## 📊 数据库表结构

```sql
generated_images 表:
  - id: 主键
  - prompt: 文本提示词
  - image_path: 图片路径
  - image_size: 文件大小
  - num_inference_steps: 推理步数
  - guidance_scale: 引导比例
  - generation_time: 生成耗时
  - created_at: 创建时间
```

## 🐛 常见问题

### Q: 模型下载失败

**A:** 检查 HF_HOME 路径是否正确，确保有足够的磁盘空间（约 10GB）

```bash
# 检查磁盘空间
df -h /Volumes/Mont125\ -\ Données/
```

### Q: 数据库连接失败

**A:** 确保 PostgreSQL 正在运行

```bash
# macOS
brew services start postgresql

# 检查状态
brew services list | grep postgresql
```

### Q: 生成速度慢

**A:** 
1. 如果是 M1/M2/M3 Mac，可以尝试使用 MPS 设备：
   ```env
   DEVICE=mps
   ```
2. 减少推理步数（20-25）
3. 关闭其他占用内存的程序

### Q: 中文显示乱码

**A:** 确保终端和浏览器都设置为 UTF-8 编码

## 🎨 使用示例

### 示例 1: 生成人物图片

```
提示词: 一位优雅的中国女性，穿着传统旗袍，在古典园林中漫步，
        背景是精致的亭台楼阁和盛开的梅花
参数: 步数=30, 引导=8.0
```

### 示例 2: 生成风景图片

```
提示词: 壮丽的黄山日出，云海翻涌，奇松怪石，金色阳光穿透云层，
        仙境般的景象
参数: 步数=28, 引导=7.5
```

### 示例 3: 生成创意图片

```
提示词: 赛博朋克风格的未来城市，霓虹灯闪烁，飞行汽车穿梭，
        高楼大厦耸立，细雨蒙蒙的夜晚
参数: 步数=35, 引导=9.0
```

## 📝 导出格式说明

### Excel (.xlsx)
- 适合数据分析
- 可用 Excel/WPS 打开
- 包含所有字段

### HTML (.html)
- 精美的网页报告
- 可直接在浏览器查看
- 支持打印

### TXT (.txt)
- 纯文本格式
- 通用性最好
- 适合存档

### Markdown (.md)
- Markdown 文档格式
- 适合技术文档
- 可转换为其他格式

## 🔐 安全建议

1. **修改数据库密码**: 不要使用默认密码
2. **本地使用**: 不建议在公网暴露
3. **定期备份**: 备份数据库和生成的图片
4. **版权注意**: 生成的图片版权归您所有，但请合理使用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Qwen-Image](https://huggingface.co/Qwen/Qwen-Image) - 强大的文本转图片模型
- [Gradio](https://gradio.app/) - 简单易用的 ML 界面框架
- [PostgreSQL](https://www.postgresql.org/) - 可靠的数据库
- [Diffusers](https://github.com/huggingface/diffusers) - Hugging Face 扩散模型库

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- Email: your-email@example.com

---

**Enjoy creating amazing images with AI! 🎨**
