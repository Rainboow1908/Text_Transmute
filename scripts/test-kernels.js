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

// 喵数编码：全 Unicode 覆盖
roundtrip(builtinKernels[0], [
  '', '你好，世界', 'Hello, World!', '1234567890', '😀🚀', 'a\nb\tc', '喵喵喵'
]);

// 摩斯喵语：仅 A-Z 0-9 及标点（输出统一大写）
roundtrip(builtinKernels[1], [
  '', 'HELLO WORLD', 'SOS', 'HELLO, WORLD!', '123 456', 'A-Z 0-9'
]);

// 二进制喵语：任意字符
roundtrip(builtinKernels[2], [
  '', '你好，世界', 'Hello, World!', '123', '😀', '混合Mixed123', '喵'
]);

// compileKernel + kernelToJSON 往返（模拟“上传内核”路径）
const json = kernelToJSON(builtinKernels[0]);
const compiled = compileKernel(json);
roundtrip(compiled, ['你好', 'abc', '😀']);

console.log(failed ? 'FAILED' : 'ALL PASS');
process.exit(failed ? 1 : 0);
