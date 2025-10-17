# 📝 通知凭证配置指南

## 🎯 重要更新

**从 v1.5 版本开始，所有通知凭证都可以通过前端界面配置，无需编辑 .env 文件！**

---

## 🎨 前端配置方式（推荐）

### 步骤1：启动应用

```bash
python app.py
```

### 步骤2：访问界面

打开浏览器访问：http://localhost:7860

### 步骤3：切换到通知设置

点击顶部的 **"🔔 通知设置"** 标签

### 步骤4：配置各渠道凭证

界面采用折叠面板设计，每个渠道都有独立的配置区域：

#### 📱 WxPusher（微信推送）

展开面板后填写：
- **AppToken**: `AT_xxxxxxxxxxxx`
- **UID**: `UID_xxxxxxxxxxxx`
- 勾选 **"启用 WxPusher"**

**获取凭证**: 访问 [WxPusher官网](https://wxpusher.zjiecode.com/)

---

#### 📲 PushPlus（微信推送）

展开面板后填写：
- **Token**: `xxxxxxxxxxxxxxxxxxxx`
- 勾选 **"启用 PushPlus"**

**获取凭证**: 访问 [PushPlus官网](http://www.pushplus.plus/)

---

#### 📧 Resend Email（国际邮件）

展开面板后填写：
- **API Key**: `re_xxxxxxxxxxxx`（密码输入框，隐藏显示）
- **收件人邮箱**: `your_email@example.com`
- 勾选 **"启用 Resend Email"**

**获取凭证**: 访问 [Resend官网](https://resend.com/)

---

#### ✈️ Telegram（TG机器人）

展开面板后填写：
- **Bot Token**: `123456:ABC-DEF...`（密码输入框，隐藏显示）
- **Chat ID**: `123456789`
- 勾选 **"启用 Telegram"**

**获取凭证**: 
1. 访问 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建机器人
3. 获取 Bot Token
4. 访问 [@userinfobot](https://t.me/userinfobot) 获取 Chat ID

---

#### 📮 QQ Email（QQ邮箱，支持多收件人）

展开面板后填写：
- **QQ邮箱地址**: `2882465@qq.com`
- **授权码（不是密码！）**: `bmuvxxvqqoddhe`（密码输入框，隐藏显示）
- **发件人名称**: `文本转图片生成器`
- **收件人列表**: `user1@gmail.com,user2@qq.com,user3@163.com`
- 勾选 **"启用 QQ Email"**

**获取授权码步骤**：
1. 登录 [QQ邮箱](https://mail.qq.com)
2. 点击 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **"POP3/SMTP服务"** 或 **"IMAP/SMTP服务"**
5. 点击 **"生成授权码"**
6. 按照提示发送短信验证
7. 获得16位授权码（如：bmuvxxvqqoddhe）

⚠️ **重要提示**：
- 授权码是16位字符，不是邮箱登录密码！
- 多个收件人用英文逗号分隔
- 收件人可以是任意邮箱（Gmail, QQ, 163, Outlook等）

---

### 步骤5：保存配置

填写完所有凭证后，点击底部的 **"💾 保存所有设置"** 按钮。

成功后会显示：**✅ 配置保存成功！**

### 步骤6：测试通知

1. 切换到 **"🖼️ 生成图片"** 标签
2. 输入任意提示词
3. 点击 **"🎨 生成图片"**
4. 等待生成完成
5. 检查您的通知渠道（微信/邮箱/Telegram）

---

## 📂 配置文件存储

所有配置都保存在项目根目录的 `notification_config.json` 文件中。

### 配置文件结构

```json
{
  "enabled": true,
  "channels": {
    "wxpusher": true,
    "pushplus": false,
    "resend": false,
    "telegram": false,
    "qq_email": true
  },
  "credentials": {
    "wxpusher": {
      "token": "AT_xxxxxxxxxxxx",
      "uid": "UID_xxxxxxxxxxxx"
    },
    "pushplus": {
      "token": ""
    },
    "resend": {
      "api_key": "",
      "to_email": ""
    },
    "telegram": {
      "bot_token": "",
      "chat_id": ""
    },
    "qq_email": {
      "user": "2882465@qq.com",
      "password": "bmuvxxvqqoddhe",
      "from_name": "文本转图片生成器",
      "recipients": "user1@gmail.com,user2@qq.com"
    }
  }
}
```

---

## 🔙 .env 文件方式（仍支持）

如果您更喜欢使用 `.env` 文件配置，也可以继续使用。系统会优先使用前端配置，如果前端未配置，会自动从 `.env` 读取。

编辑 `.env` 文件：

```bash
# WxPusher 配置
WXPUSHER_TOKEN=AT_xxxxxxxxxxxx
WXPUSHER_UID=UID_xxxxxxxxxxxx

# PushPlus 配置
PUSHPLUS_TOKEN=xxxxxxxxxxxxxxxxxxxx

# Resend Email 配置
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_TO_EMAIL=your_email@example.com

# Telegram 配置
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789

# QQ Email 配置
QQ_EMAIL_USER=2882465@qq.com
QQ_EMAIL_PASSWORD=bmuvxxvqqoddhe
QQ_EMAIL_FROM_NAME=文本转图片生成器
QQ_EMAIL_RECIPIENTS=user1@gmail.com,user2@qq.com,user3@163.com
```

---

## 🎛️ 凭证管理优先级

系统按以下顺序读取凭证：

1. **前端配置（最高优先级）** - `notification_config.json`
2. **环境变量（向后兼容）** - `.env` 文件

这样既保证了新功能的易用性，也保证了老用户的兼容性。

---

## 💡 使用建议

### 推荐：使用前端配置

**优点**：
- ✅ 可视化界面，直观易用
- ✅ 密码输入框保护敏感信息
- ✅ 实时生效，无需重启
- ✅ 易于修改和测试
- ✅ 折叠面板，界面整洁

### 备选：使用 .env 文件

**适用场景**：
- 🔧 批量部署多个实例
- 🔧 使用 Docker 等容器化部署
- 🔧 自动化脚本配置
- 🔧 更熟悉命令行操作

---

## 🔐 安全提示

1. **不要分享配置文件**
   - `notification_config.json` 包含敏感信息
   - 已添加到 `.gitignore`，不会提交到 Git

2. **定期更新授权码**
   - QQ邮箱授权码建议定期更换
   - Bot Token 注意保密

3. **最小权限原则**
   - 只启用需要的渠道
   - 不使用的渠道保持禁用

---

## 🧪 测试工具

### 测试QQ邮箱

```bash
python test_qq_email.py
```

### 测试其他渠道

```bash
python test_notification.py
```

---

## 📊 配置示例对比

### 前端配置（新方式）

1. 访问 http://localhost:7860
2. 点击 "🔔 通知设置"
3. 展开 "📮 QQ Email"
4. 填写：
   - QQ邮箱: `2882465@qq.com`
   - 授权码: `bmuvxxvqqoddhe`
   - 收件人: `user1@gmail.com,user2@qq.com`
5. 勾选 "启用 QQ Email"
6. 点击 "💾 保存所有设置"

✅ 配置保存成功！

### .env 文件配置（旧方式）

编辑 `.env`：
```
QQ_EMAIL_USER=2882465@qq.com
QQ_EMAIL_PASSWORD=bmuvxxvqqoddhe
QQ_EMAIL_RECIPIENTS=user1@gmail.com,user2@qq.com
```

两种方式都可以，前端配置更直观！

---

## ⚠️ 常见问题

### Q1: 前端配置后，需要重启应用吗？
**A1**: 不需要！配置保存后立即生效。

### Q2: 可以同时使用前端配置和 .env 吗？
**A2**: 可以。前端配置优先级更高，会覆盖 .env 的设置。

### Q3: 配置文件在哪里？
**A3**: `notification_config.json`，位于项目根目录。

### Q4: 配置文件会提交到 Git 吗？
**A4**: 不会。已添加到 `.gitignore`，保护您的隐私。

### Q5: 如何导出配置到其他机器？
**A5**: 复制 `notification_config.json` 文件到新机器即可。

### Q6: 忘记了之前配置的凭证怎么办？
**A6**: 在前端界面中，输入框会显示当前配置的值（密码除外）。

---

## 🎉 总结

**新的前端配置方式让通知设置更加简单直观！**

- ✅ 无需编辑文件
- ✅ 可视化界面
- ✅ 密码保护
- ✅ 实时生效
- ✅ 易于管理

立即体验新的配置方式吧！🚀
