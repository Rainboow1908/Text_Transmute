// 从 js/kernels.js 生成 kernels/*.json 示例内核文件
// 运行：node scripts/generate-kernels.js
const path = require('path');
const fs = require('fs');
const { builtinKernels, kernelToJSON } = require('../js/kernels.js');

const FILES = {
  '喵话编码': 'meow-sentence.json'
};

const outDir = path.join(__dirname, '..', 'kernels');
fs.mkdirSync(outDir, { recursive: true });

for (const k of builtinKernels) {
  const file = FILES[k.name];
  if (!file) {
    console.error('未为内核「' + k.name + '」配置文件名');
    process.exit(1);
  }
  fs.writeFileSync(path.join(outDir, file), kernelToJSON(k) + '\n', 'utf-8');
  console.log('已生成 kernels/' + file);
}
