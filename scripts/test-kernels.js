// 内核可逆性回归测试
// 运行：node scripts/test-kernels.js
const { builtinKernels, compileKernel, kernelToJSON } = require('../js/kernels.js');

let failed = false;

function roundtrip(k, samples, params) {
  for (const s of samples) {
    const enc = k.encode(s, params);
    const dec = k.decode(enc, params);
    if (dec !== s) {
      failed = true;
      console.error('FAIL [' + k.name + '] params=' + JSON.stringify(params) + ' input=' + JSON.stringify(s));
      console.error('   encode=' + JSON.stringify(enc));
      console.error('   decode=' + JSON.stringify(dec));
      return;
    }
  }
  console.log('OK   [' + k.name + '] params=' + JSON.stringify(params) + '  ' + samples.length + ' 组样本往返通过');
}

const k = builtinKernels[0];
const samples = [
  '', '你好，世界', 'Hello, World!', '1234567890', '😀🚀',
  'a\nb\tc', '喵喵喵，喵喵喵：“喵喵”。喵喵喵喵！',
  '混合 Mixed 123 中文 😀 符号 @#$%^&*()',
  '很长的一段文字：'.repeat(200)
];

// 默认（无密钥、中文）
roundtrip(k, samples, {});
// 带密钥
roundtrip(k, samples, { key: 'secret-123' });
// 英文输出
roundtrip(k, samples, { lang: 'Meow' });
// 密钥 + 英文
roundtrip(k, samples, { key: 'miao', lang: 'Meow' });

// 密钥错误时应解不出原文
const encWrong = k.encode('你好', { key: 'aaa' });
const decWrong = k.decode(encWrong, { key: 'bbb' });
if (decWrong === '你好') {
  failed = true;
  console.error('FAIL 密钥错误却还原成功');
} else {
  console.log('OK   密钥错误无法还原原文（符合预期）');
}

// compileKernel + kernelToJSON 往返（模拟“上传/下载内核”路径，含 params）
const json = kernelToJSON(k);
const compiled = compileKernel(json);
roundtrip(compiled, ['你好', 'abc', '😀', '混合Mixed123'], { key: 'k', lang: 'Meow' });

// 打印样例，便于人工观察
console.log('\n样例：');
console.log('  「你好，世界」(喵)      → ' + JSON.stringify(k.encode('你好，世界', {})));
console.log('  「你好，世界」(Meow)    → ' + JSON.stringify(k.encode('你好，世界', { lang: 'Meow' })));
console.log('  「Hello」(密钥=miao,Meow)→ ' + JSON.stringify(k.encode('Hello', { key: 'miao', lang: 'Meow' })));

console.log(failed ? 'FAILED' : 'ALL PASS');
process.exit(failed ? 1 : 0);
