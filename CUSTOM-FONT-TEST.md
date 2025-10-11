# 🔤 自定义字体功能测试指南

## ✨ 功能说明

自定义字体功能现已完全修复，支持：
1. ✅ **实时预览** - 在浏览器中加载并预览自定义字体
2. ✅ **视频生成** - 在生成的视频中正确渲染自定义字体

---

## 🐛 已修复的问题

### 问题1: 预览无效果
**原因**: 浏览器无法直接使用上传的字体文件，需要通过 FontFace API 加载

**修复**: 
- 使用 `FileReader` 读取字体文件为 ArrayBuffer
- 使用 `FontFace` API 动态加载字体
- 将加载的字体添加到 `document.fonts`
- 在预览时使用加载的字体名称

### 问题2: 视频中字体无效果
**原因**: 
- 后端没有正确检查用户是否选择了 'custom' 字体
- 字体注册时机和逻辑有问题

**修复**:
- 只在 `font_family === 'custom'` 时注册字体
- 生成唯一字体名称避免冲突
- 正确传递 `customFontFamily` 到文本图像生成
- 添加详细日志用于调试

---

## 🚀 完整测试流程

### 步骤1: 准备字体文件

下载一个测试字体文件：

**推荐中文字体**:
- **思源黑体**: https://github.com/adobe-fonts/source-han-sans/releases
- **思源宋体**: https://github.com/adobe-fonts/source-han-serif/releases
- **站酷高端黑**: https://www.zcool.com.cn/special/zcoolfonts/

**推荐英文字体**:
- **Roboto**: https://fonts.google.com/specimen/Roboto
- **Montserrat**: https://fonts.google.com/specimen/Montserrat
- **Pacifico** (手写体): https://fonts.google.com/specimen/Pacifico

**支持格式**: `.ttf`, `.otf`, `.woff`, `.woff2`

---

### 步骤2: 重启服务器并刷新浏览器

```bash
# 重启服务器
npm start
```

浏览器中访问并硬刷新：
```
http://localhost:3000/
```

- Windows/Linux: `Ctrl + Shift + R`
- macOS: `Cmd + Shift + R`

---

### 步骤3: 上传自定义字体

1. **找到"自定义字体"上传框**
   ```
   自定义字体（可选）
   [选择文件...]
   未选择文件
   💡 上传后会自动添加到字体类型列表中
   ```

2. **点击"选择文件"**
   - 选择你下载的字体文件（如 `SourceHanSans-Bold.ttf`）
   - 点击"打开"

3. **确认文件已上传**
   - ✅ 文件名显示：`SourceHanSans-Bold.ttf`
   - ✅ 红色"🗑️ 删除"按钮出现
   - ✅ Toast提示：`自定义字体已添加: SourceHanSans-Bold.ttf`
   - ✅ Toast提示：`预览字体已加载: SourceHanSans-Bold.ttf`

4. **查看控制台日志**
   - 按 `F12` 打开控制台
   - 应该看到：
     ```
     ✅ 已添加自定义字体到列表: SourceHanSans-Bold.ttf
     ✅ 预览字体已加载: CustomFont_1728567890123
     ```

---

### 步骤4: 检查字体已添加到列表

1. **滚动到"🔤 字体设置"区域**

2. **打开"字体类型"下拉列表**
   ```
   字体类型
   ┌─────────────────────────────────────┐
   │ Arial                               │
   │ Helvetica                           │
   │ Times New Roman                     │
   │ ...                                 │
   │ 宋体                                │
   │ 黑体                                │
   │ 微软雅黑                            │
   │ 楷体                                │
   │ 自定义字体 (SourceHanSans-Bold.ttf)│ ✓ ← 已选中
   └─────────────────────────────────────┘
   ```

3. **确认**
   - ✅ 看到"自定义字体 (文件名.ttf)"选项
   - ✅ 该选项已被自动选中

---

### 步骤5: 测试实时预览

1. **填写文本内容**
   ```
   文本内容 *
   ┌─────────────────────────────────────┐
   │ 测试自定义字体效果                   │
   │ Test Custom Font                    │
   └─────────────────────────────────────┘
   ```

2. **点击"👁️ 实时预览"按钮**

3. **查看预览窗口**
   ```
   👁️ 实时预览
   ┌─────────────────────────────────────┐
   │                                     │
   │     测试自定义字体效果               │  ← 应该显示为自定义字体
   │     Test Custom Font                │
   │                                     │
   └─────────────────────────────────────┘
   ```

4. **确认预览效果**
   - ✅ 文本使用自定义字体显示
   - ✅ 字体样式明显不同于默认字体
   - ✅ 中文和英文都正确显示

5. **查看控制台日志**
   ```
   🎨 预览使用自定义字体: CustomFont_1728567890123
   ```

---

### 步骤6: 生成视频测试

1. **填写完整表单**
   - ✅ 文本内容：`测试自定义字体效果 Test Custom Font`
   - ✅ 背景音乐：上传任意音频文件
   - ✅ 字体类型：确保选中"自定义字体 (xxx.ttf)"
   - ✅ 其他设置：按需调整

2. **点击"🚀 生成视频"按钮**

3. **查看后台日志** - 应该看到：
   ```
   🔤 [X] 检查自定义字体...
   🔤 [X] font_family设置: custom
   🔤 [X] custom_font路径: uploads/custom_font-xxx.ttf
   🔤 [X] 注册自定义字体: uploads/custom_font-xxx.ttf
   ✅ [X] 自定义字体注册成功: CustomFont_1728567890456
   🖼️  [X] 开始生成文本图像...
   🖼️  [X] 使用字体: CustomFont_1728567890456
   🎨 使用自定义字体: CustomFont_1728567890456
   📝 Canvas字体设置: 48px "CustomFont_1728567890456"
   ```

4. **等待生成完成**
   - 进度条显示 0% → 100%
   - 状态：生成中 → 已完成
   - 显示生成报告

5. **下载并播放视频**
   - 点击"📥 下载视频"按钮
   - 使用视频播放器打开
   - ✅ 视频中的文字使用自定义字体
   - ✅ 字体清晰可见

---

## 🔍 验证要点

### ✅ 预览验证

打开浏览器控制台，运行：
```javascript
// 检查字体是否已加载
document.fonts.forEach(font => {
  console.log(`已加载字体: ${font.family}`);
});

// 应该看到类似输出：
// 已加载字体: CustomFont_1728567890123
```

### ✅ 视频验证

1. **检查生成的PNG图像** (temp目录)
   ```bash
   ls -lh temp/
   # 找到 text_image_xxx.png
   ```
   
2. **用图像查看器打开PNG**
   - 确认文字使用自定义字体
   - 字体渲染清晰

3. **播放视频**
   - 文字字体与预览一致
   - 无乱码或显示错误

---

## 🧪 边缘情况测试

### 测试1: 切换字体

1. 上传自定义字体A
2. 生成视频（使用字体A）
3. 删除字体A
4. 上传自定义字体B
5. 生成视频（使用字体B）
6. ✅ 两个视频应该使用不同的字体

### 测试2: 删除字体后生成

1. 上传自定义字体
2. 预览（应该显示自定义字体）
3. 点击"🗑️ 删除"按钮
4. 字体列表应该恢复为默认字体
5. 生成视频
6. ✅ 视频应该使用默认字体（Arial）

### 测试3: 不选择自定义字体

1. 上传自定义字体（会自动添加到列表）
2. **手动切换到其他字体**（如"黑体"）
3. 生成视频
4. ✅ 视频应该使用"黑体"，而不是自定义字体

### 测试4: 字体加载失败

1. 上传一个损坏的字体文件
2. 查看Toast提示（应该显示"字体加载失败"）
3. 生成视频
4. ✅ 后台日志显示回退到默认字体
5. ✅ 视频成功生成（使用Arial）

---

## 🎨 推荐字体组合

### 中文视频

**标题用**:
- 思源黑体 Bold
- 站酷高端黑
- 阿里巴巴普惠体 Bold

**正文用**:
- 思源宋体 Regular
- 思源黑体 Regular

### 英文视频

**标题用**:
- Montserrat Bold
- Bebas Neue
- Oswald Bold

**正文用**:
- Roboto Regular
- Open Sans Regular
- Lato Regular

### 艺术/创意视频

- Pacifico (手写体)
- Dancing Script (优雅手写)
- Great Vibes (华丽手写)

---

## 📊 调试信息

### 浏览器控制台应该看到：

**上传字体时**:
```
✅ 已添加自定义字体到列表: MyFont.ttf
✅ 预览字体已加载: CustomFont_1728567890123
```

**预览时**:
```
🎨 预览使用自定义字体: CustomFont_1728567890123
```

### 后台日志应该看到：

**生成视频时**:
```
🔤 [1] 检查自定义字体...
🔤 [1] font_family设置: custom
🔤 [1] custom_font路径: uploads/custom_font-123.ttf
🔤 [1] 注册自定义字体: uploads/custom_font-123.ttf
✅ [1] 自定义字体注册成功: CustomFont_1728567890456
🖼️  [1] 开始生成文本图像...
🖼️  [1] 使用字体: CustomFont_1728567890456
🎨 使用自定义字体: CustomFont_1728567890456
📝 Canvas字体设置: 48px "CustomFont_1728567890456"
✅ [1] 文本图像生成成功: temp/text_image_xxx.png
```

---

## ⚠️ 常见问题

### Q1: 预览显示方块字符？

**原因**: 字体不支持该字符集（如中文字体不支持英文）

**解决**: 
- 确保字体支持你要显示的字符
- 中文视频使用中文字体
- 英文视频使用英文字体

### Q2: 视频中字体变回默认？

**检查**:
1. 后台日志是否有"注册自定义字体失败"
2. 确认选择了"自定义字体 (xxx.ttf)"而不是其他字体
3. 确认上传的文件是有效的字体文件

### Q3: 字体加载很慢？

**原因**: 中文字体文件通常 5-20 MB

**解决**: 
- 耐心等待加载完成
- 使用较小的字体文件
- 压缩字体文件（仅保留需要的字符）

### Q4: 删除字体后预览还显示自定义字体？

**原因**: 字体已加载到浏览器内存

**解决**:
- 刷新页面
- 或切换到其他字体

---

## ✅ 成功标准

### 预览成功

- [ ] Toast显示"预览字体已加载"
- [ ] 控制台显示"✅ 预览字体已加载: CustomFont_xxx"
- [ ] 预览窗口中文字明显使用自定义字体
- [ ] 字体样式与默认Arial明显不同

### 视频生成成功

- [ ] 后台日志显示"✅ 自定义字体注册成功"
- [ ] 后台日志显示"🎨 使用自定义字体: CustomFont_xxx"
- [ ] 后台日志显示"📝 Canvas字体设置: XXpx \"CustomFont_xxx\""
- [ ] 生成的PNG图像使用自定义字体
- [ ] 最终视频使用自定义字体
- [ ] 字体清晰、无乱码

---

## 🎯 快速测试命令

在浏览器控制台运行：

```javascript
// 检查自定义字体是否已添加到列表
const fontSelect = document.getElementById('fontFamily');
const customOption = Array.from(fontSelect.options).find(opt => opt.value === 'custom');
console.log('自定义字体选项:', customOption ? customOption.textContent : '未找到');

// 检查自定义字体是否已加载
console.log('预览字体名称:', window.customPreviewFont || '未加载');

// 检查字体文件是否已上传
const fontInput = document.getElementById('customFont');
console.log('字体文件:', fontInput.files[0]?.name || '未上传');

// 列出所有已加载的字体
document.fonts.forEach(font => {
  if (font.family.includes('CustomFont')) {
    console.log('已加载自定义字体:', font.family, '状态:', font.status);
  }
});
```

---

**测试愉快！** 🚀

如有问题，请查看浏览器控制台和后台日志，并参考本文档的调试部分。
