// Setup Test Script - Verify installation
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 YouTube视频下载器 - 环境检查\n');
console.log('='.repeat(50) + '\n');

let hasErrors = false;

// 检查 Node.js 版本
console.log('1️⃣  检查 Node.js 版本...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 14) {
  console.log(`   ✅ Node.js ${nodeVersion} (满足要求 >= 14.x)\n`);
} else {
  console.log(`   ❌ Node.js ${nodeVersion} (需要 >= 14.x)\n`);
  hasErrors = true;
}

// 检查 yt-dlp
console.log('2️⃣  检查 yt-dlp...');
try {
  const ytDlpVersion = execSync('yt-dlp --version', { encoding: 'utf8' }).trim();
  console.log(`   ✅ yt-dlp ${ytDlpVersion}\n`);
} catch (error) {
  console.log('   ❌ yt-dlp 未安装');
  console.log('   💡 安装方法:');
  console.log('      macOS: brew install yt-dlp');
  console.log('      Linux: sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp\n');
  hasErrors = true;
}

// 检查 PostgreSQL
console.log('3️⃣  检查 PostgreSQL...');
try {
  const pgVersion = execSync('psql --version', { encoding: 'utf8' }).trim();
  console.log(`   ✅ ${pgVersion}\n`);
} catch (error) {
  console.log('   ⚠️  无法检测 PostgreSQL (可能未在 PATH 中)');
  console.log('   💡 请确保 PostgreSQL 已安装并正在运行\n');
}

// 检查环境变量文件
console.log('4️⃣  检查环境变量配置...');
if (fs.existsSync('.env')) {
  console.log('   ✅ .env 文件存在\n');
  
  // 读取并验证必需的配置
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('   ⚠️  缺少以下配置项:');
    missingVars.forEach(v => console.log(`      - ${v}`));
    console.log('');
  }
} else {
  console.log('   ❌ .env 文件不存在');
  console.log('   💡 请运行: cp .env.example .env\n');
  hasErrors = true;
}

// 检查必需的目录
console.log('5️⃣  检查目录结构...');
const requiredDirs = ['db', 'services', 'public', 'downloads', 'exports'];
let allDirsExist = true;

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`   ✅ ${dir}/`);
  } else {
    console.log(`   ❌ ${dir}/ (不存在)`);
    allDirsExist = false;
  }
});
console.log('');

// 检查必需的文件
console.log('6️⃣  检查关键文件...');
const requiredFiles = [
  'server.js',
  'init.sql',
  'package.json',
  'db/database.js',
  'services/downloader.js',
  'services/websocket.js',
  'public/index.html'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} (不存在)`);
    allFilesExist = false;
  }
});
console.log('');

// 检查依赖是否安装
console.log('7️⃣  检查 npm 依赖...');
if (fs.existsSync('node_modules')) {
  console.log('   ✅ node_modules/ 存在');
  
  // 检查关键依赖
  const keyDeps = ['express', 'pg', 'ws', 'puppeteer'];
  keyDeps.forEach(dep => {
    if (fs.existsSync(`node_modules/${dep}`)) {
      console.log(`   ✅ ${dep}`);
    } else {
      console.log(`   ❌ ${dep} (未安装)`);
    }
  });
} else {
  console.log('   ❌ node_modules/ 不存在');
  console.log('   💡 请运行: npm install');
  hasErrors = true;
}
console.log('');

// 总结
console.log('='.repeat(50));
if (hasErrors) {
  console.log('❌ 发现错误，请根据上述提示修复\n');
  console.log('📖 查看快速启动指南: QUICKSTART.md');
  process.exit(1);
} else {
  console.log('✅ 所有检查通过！\n');
  console.log('🚀 下一步操作:');
  console.log('   1. 配置 .env 文件（特别是数据库密码）');
  console.log('   2. 创建数据库: psql -U postgres -c "CREATE DATABASE youtube_downloader WITH ENCODING \'UTF8\'"');
  console.log('   3. 初始化表结构: npm run init-db');
  console.log('   4. 启动服务: npm start');
  console.log('   5. 访问: http://localhost:3000\n');
  console.log('📖 详细文档: README.md');
}
