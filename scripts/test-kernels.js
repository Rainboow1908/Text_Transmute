// 内核可逆性回归测试
// 运行：node scripts/test-kernels.js
const { builtinKernels, compileKernel, kernelToJSON } = require('../js/kernels.js');

let failed = false;

function roundtrip(k, samples) {
  for (const s of samples) {
    const enc = k.encode(s);
    const dec = k.decode(enc);
    if (dec !== s) {
      failed = true;
      console.error('FAIL [' + k.name + '] input=' + JSON.stringify(s));
      console.error('   encode=' + JSON.stringify(enc));
      console.error('   decode=' + JSON.stringify(dec));
      return;
    }
  }
  console.log('OK   [' + k.name + '] ' + samples.length + ' 组样本往返通过');
}

const k = builtinKernels[0];

// 喵话编码：全 Unicode 覆盖（含 emoji / 代理对 / 换行 / 长文本）
roundtrip(k, [
  '',
  '你好，世界',
  'Hello, World!',
  '1234567890',
  '😀🚀',
  'a\nb\tc',
  '喵喵喵，喵喵喵：“喵喵”。喵喵喵喵！',
  '混合 Mixed 123 中文 😀 符号 @#$%^&*()',
  '很长的一段文字：'.repeat(200)
]);

// compileKernel + kernelToJSON 往返（模拟“上传/下载内核”路径）
const json = kernelToJSON(k);
const compiled = compileKernel(json);
roundtrip(compiled, ['你好', 'abc', '😀', '混合Mixed123']);

// 打印一个样例，便于人工观察“像话”程度与压缩效果
console.log('\n样例「你好，世界」→ ' + JSON.stringify(k.encode('你好，世界')));

console.log(failed ? 'FAILED' : 'ALL PASS');
process.exit(failed ? 1 : 0);
