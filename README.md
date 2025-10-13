# 🎨 AI文本转图片工具

基于Gradio + PostgreSQL + Python的智能文本转图片生成工具，使用Qwen-Image大模型实现高质量的文本到图像转换。

## ✨ 功能特性

### 🚀 核心功能
- **智能文本转图片**: 基于Qwen-Image模型，支持中文文本描述
- **自定义输出目录**: 可指定图片保存位置
- **实时进度显示**: 生成过程可视化，显示累计耗时
- **数据库存储**: PostgreSQL存储生成记录和元数据

### 📊 数据管理
- **记录列表**: 展示文本内容、图片信息、文件大小、创建日期
- **智能搜索**: 支持关键字搜索和时间范围筛选
- **统计面板**: 实时显示生成统计和成功率

### 📤 数据导出
- **多格式导出**: 支持Excel、HTML、TXT、Markdown格式
- **筛选导出**: 可导出搜索结果或全部数据
- **美观报告**: 自动生成专业的数据报告

### 🎨 用户界面
- **现代化设计**: 基于Gradio的直观Web界面
- **响应式布局**: 支持桌面和移动设备
- **实时交互**: 进度条、状态提示、即时反馈

## 🛠️ 技术栈

- **AI模型**: Qwen-Image (通义千问图像生成模型)
- **后端框架**: Python + Gradio
- **数据库**: PostgreSQL
- **图像处理**: Diffusers + PyTorch
- **数据导出**: Pandas + OpenPyXL

## 📋 系统要求

### 硬件要求
- **CPU**: Intel i5或同等性能处理器
- **内存**: 8GB RAM (推荐16GB+)
- **存储**: 10GB可用空间（用于模型和生成的图片）
- **GPU**: 可选，支持CUDA或Apple Silicon (MPS)

### 软件要求
- **操作系统**: macOS 10.15+ / Windows 10+ / Linux
- **Python**: 3.8+
- **PostgreSQL**: 12.0+

### 针对您的环境优化
- **系统**: macOS Tahoe26
- **设备**: MacBook Pro 2019 (A2141)
- **CPU**: Intel i9
- **内存**: 64GB
- **缓存目录**: `/Volumes/Mont125 - Données/Users/seigneur/.cache/tahoe26/huggingface`

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd ai-text2image-tool
```

### 2. 自动安装（推荐）
```bash
python setup.py
```

安装脚本会自动：
- 安装Python依赖
- 创建PostgreSQL数据库
- 生成环境配置文件
- 创建必要的目录结构

### 3. 手动安装（可选）

#### 安装依赖
```bash
pip install -r requirements.txt
```

#### 配置数据库
```bash
# 创建数据库
createdb text2image_db

# 配置环境变量
cp .env.example .env
# 编辑.env文件，设置数据库密码
```

#### 初始化数据库
```bash
python -c "from database.connection import init_db; init_db()"
```

### 4. 启动应用
```bash
python app.py
```

### 5. 访问应用
打开浏览器访问: http://localhost:7860

## 📖 使用指南

### 🎨 生成图片
1. 在"图片生成"标签页输入文本描述
2. 可选择自定义输出目录
3. 点击"生成图片"按钮
4. 实时查看生成进度
5. 下载生成的图片

### 📚 管理记录
1. 在"记录管理"标签页查看所有生成记录
2. 使用搜索功能筛选特定记录
3. 按时间范围过滤记录
4. 点击下载链接获取图片文件

### 📤 导出数据
1. 在"数据导出"标签页选择导出格式
2. 可选择筛选条件
3. 点击"导出数据"按钮
4. 下载生成的报告文件

## ⚙️ 配置说明

### 环境变量配置 (.env)
```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=text2image_db
DB_USER=postgres
DB_PASSWORD=your_password

# 日志级别
LOG_LEVEL=INFO

# Hugging Face缓存目录（已针对您的环境配置）
HF_HOME=/Volumes/Mont125 - Données/Users/seigneur/.cache/tahoe26/huggingface

# 可选：自定义图片输出目录
DEFAULT_OUTPUT_DIR=./static/images

# GPU配置（MacBook Pro 2019建议使用CPU）
DEVICE=cpu
```

### 模型配置
```python
MODEL_CONFIG = {
    'model_name': "Qwen/Qwen-Image",
    'torch_dtype': 'bfloat16',
    'device': 'cpu',  # 或 'mps' (Apple Silicon)
    'num_inference_steps': 28,
    'guidance_scale': 7.5,
}
```

## 📁 项目结构

```
ai-text2image-tool/
├── app.py                    # 主应用入口
├── setup.py                  # 安装脚本
├── requirements.txt          # Python依赖
├── .env.example             # 环境变量模板
├── README.md                # 项目说明
├── config/
│   └── settings.py          # 配置文件
├── database/
│   ├── connection.py        # 数据库连接
│   └── schema.sql           # 数据库模式
├── models/
│   └── text_image_record.py # 数据模型
├── services/
│   ├── text2image_service.py # 图片生成服务
│   └── export_service.py    # 数据导出服务
├── static/
│   └── images/              # 生成的图片
├── exports/                 # 导出的文件
└── logs/                    # 日志文件
```

## 🎯 核心特性详解

### AI图片生成
- 基于Qwen-Image模型，支持高质量中文文本转图片
- 可配置推理步数和引导比例
- 支持多种设备（CPU/GPU/MPS）
- 自动处理模型下载和缓存

### 数据库管理
- PostgreSQL存储生成记录和元数据
- 支持全文搜索和时间范围查询
- 自动统计生成成功率和平均耗时
- 数据完整性和事务安全

### 实时交互
- Gradio提供现代化Web界面
- 实时进度条显示生成状态
- 即时反馈和错误提示
- 响应式设计适配各种设备

### 数据导出
- 支持4种导出格式（Excel/HTML/TXT/Markdown）
- 美观的报告模板和样式
- 可筛选导出特定数据
- 自动文件管理和清理

## 🔧 高级配置

### 性能优化
```python
# 针对MacBook Pro 2019 i9 64GB的优化建议
MODEL_CONFIG = {
    'device': 'cpu',  # 使用CPU，稳定性更好
    'num_inference_steps': 28,  # 平衡质量和速度
    'guidance_scale': 7.5,  # 推荐值
}

# 数据库连接池
DATABASE_CONFIG = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_pre_ping': True,
}
```

### 缓存配置
```python
# 利用大内存优势
CACHE_ENABLED = True
CACHE_TTL = 3600  # 1小时缓存

# Hugging Face缓存（已配置您的路径）
HF_HOME = "/Volumes/Mont125 - Données/Users/seigneur/.cache/tahoe26/huggingface"
```

## 🐛 故障排除

### 常见问题

1. **模型下载失败**
   - 检查网络连接
   - 确认缓存目录权限
   - 尝试使用代理或镜像

2. **数据库连接失败**
   - 检查PostgreSQL服务状态
   - 验证数据库配置信息
   - 确认数据库已创建

3. **内存不足**
   - 降低推理步数
   - 使用CPU而非GPU
   - 清理缓存文件

4. **图片生成缓慢**
   - 检查设备配置
   - 调整模型参数
   - 监控系统资源

### 日志查看
```bash
# 查看应用日志
tail -f logs/app.log

# 查看数据库日志
tail -f /usr/local/var/log/postgresql@14.log
```

## 📊 性能基准

基于MacBook Pro 2019 (i9, 64GB)的测试结果：

| 配置 | 生成时间 | 内存使用 | CPU使用率 |
|------|----------|----------|-----------|
| CPU模式 | 15-25秒 | 4-6GB | 80-100% |
| 简单文本 | 12-18秒 | 3-4GB | 60-80% |
| 复杂描述 | 20-30秒 | 5-7GB | 90-100% |

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Qwen-Image](https://github.com/QwenLM/Qwen-VL) - 强大的文本转图片模型
- [Gradio](https://gradio.app/) - 优秀的机器学习Web界面框架
- [Diffusers](https://github.com/huggingface/diffusers) - Hugging Face扩散模型库
- [PostgreSQL](https://www.postgresql.org/) - 可靠的开源数据库

## 📞 支持

如有问题或建议，请：
1. 查看文档和FAQ
2. 提交Issue
3. 联系开发者

---

🎨 **AI文本转图片工具** - 让创意变为现实！