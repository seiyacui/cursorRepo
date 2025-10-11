// 测试时长格式化
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const totalSeconds = Math.floor(parseFloat(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 测试各种值
console.log('测试时长格式化:');
console.log('1.2 秒 =>', formatDuration(1.2));
console.log('0.01 秒 =>', formatDuration(0.01));
console.log('5 秒 =>', formatDuration(5));
console.log('65 秒 =>', formatDuration(65));
console.log('3725 秒 =>', formatDuration(3725));
console.log('null =>', formatDuration(null));
console.log('undefined =>', formatDuration(undefined));

