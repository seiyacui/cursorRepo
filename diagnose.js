// 诊断脚本 - 检查系统依赖
const ffmpeg = require('fluent-ffmpeg');
const { createCanvas } = require('canvas');
const fs = require('fs');

console.log('🔍 开始系统诊断...\n');

// 1. 检查 FFmpeg
console.log('1️⃣  检查 FFmpeg...');
ffmpeg.getAvailableFormats((err, formats) => {
  if (err) {
    console.error('❌ FFmpeg 未安装或配置错误:', err.message);
  } else {
    console.log('✅ FFmpeg 正常');
    
    // 检查 FFprobe
    ffmpeg.ffprobe('./package.json', (err, metadata) => {
      if (err) {
        console.error('❌ FFprobe 错误（这是正常的，因为package.json不是媒体文件）');
        console.log('✅ 但FFprobe可执行\n');
      }
    });
  }
});

// 2. 检查 Canvas
console.log('2️⃣  检查 Canvas...');
try {
  const canvas = createCanvas(100, 100);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(0, 0, 100, 100);
  console.log('✅ Canvas 正常\n');
} catch (error) {
  console.error('❌ Canvas 错误:', error.message);
  console.log('');
}

// 3. 检查目录权限
console.log('3️⃣  检查目录权限...');
const dirs = ['./uploads', './outputs', './temp'];
dirs.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 创建目录: ${dir}`);
    }
    fs.accessSync(dir, fs.constants.W_OK);
    console.log(`✅ ${dir} 可写`);
  } catch (error) {
    console.error(`❌ ${dir} 不可写:`, error.message);
  }
});

console.log('\n4️⃣  测试 Canvas 生成图片...');
try {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(1920, 1080);
  const ctx = canvas.getContext('2d');
  
  // 绘制背景
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1920, 1080);
  
  // 绘制文字
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('测试文本', 960, 540);
  
  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('./temp/test-canvas.png', buffer);
  console.log('✅ Canvas图片生成成功: ./temp/test-canvas.png\n');
} catch (error) {
  console.error('❌ Canvas图片生成失败:', error.message);
  console.log('');
}

console.log('5️⃣  测试 FFmpeg 命令...');
// 测试简单的FFmpeg命令
if (fs.existsSync('./temp/test-canvas.png')) {
  const testCommand = ffmpeg()
    .input('./temp/test-canvas.png')
    .inputOptions(['-loop 1', '-t 1'])
    .outputOptions([
      '-c:v libx264',
      '-preset ultrafast',
      '-pix_fmt yuv420p',
      '-y'
    ])
    .output('./temp/test-video.mp4');
  
  testCommand.on('start', (cmd) => {
    console.log('▶️  FFmpeg命令:', cmd);
  });
  
  testCommand.on('end', () => {
    console.log('✅ FFmpeg测试视频生成成功: ./temp/test-video.mp4');
    console.log('\n✅ 所有测试通过！系统正常。\n');
  });
  
  testCommand.on('error', (err) => {
    console.error('❌ FFmpeg测试失败:', err.message);
    console.log('\n⚠️  FFmpeg可能有问题，请检查安装。\n');
  });
  
  testCommand.run();
} else {
  console.log('⚠️  跳过FFmpeg测试（Canvas图片未生成）\n');
}

setTimeout(() => {
  console.log('📊 诊断完成！如果上面有❌，请先解决对应问题。\n');
}, 3000);
