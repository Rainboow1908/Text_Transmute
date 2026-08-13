// 内核可逆性回归测试（读取 kernels/*.json + market/*.json）
// 运行：node scripts/test-kernels.js
const fs = require('fs');
const path = require('path');
const { compileKernel, kernelToJSON, paramsToDefaults, localized } = require('../js/kernels.js');

let failed = false;

function load(file) {
  return compileKernel(fs.readFileSync(path.join(__dirname, '..', file), 'utf-8'));
}

function roundtrip(k, samples, params, label) {
  for (const s of samples) {
    let enc, dec;
    try {
      enc = k.encode(s, params);
      dec = k.decode(enc, params);
    } catch (e) {
      failed = true;
      console.error('FAIL [' + label + '] 抛错 input=' + JSON.stringify(s) + ': ' + e.message);
      return;
    }
    if (dec !== s) {
      failed = true;
      console.error('FAIL [' + label + '] input=' + JSON.stringify(s) + ' dec=' + JSON.stringify(dec));
      return;
    }
  }
  console.log('OK   [' + label + '] ' + samples.length + ' 组样本往返通过');
}

const meow = load('kernels/meow-sentence.json');
const morse = load('kernels/morse.json');
const buddha = load('kernels/buddha.json');
const reverse = load('market/reverse.json');

const unicode = ['', '你好，世界', 'Hello, World!', '1234567890', '😀🚀', 'a\nb\tc', '混合 Mixed 123 中文 😀'];

// 喵话编码
roundtrip(meow, unicode, {}, '喵话(默认)');
roundtrip(meow, unicode, { key: 'secret-123' }, '喵话(密钥)');
roundtrip(meow, unicode, { lang: 'Meow' }, '喵话(Meow)');
roundtrip(meow, unicode, { key: 'miao', lang: 'Meow' }, '喵话(密钥+Meow)');
roundtrip(meow, unicode, { zeroWidth: true }, '喵话(零宽)');
roundtrip(meow, unicode, { key: 'k', zeroWidth: true }, '喵话(零宽+密钥)');

// 摩斯密码（仅 A-Z 0-9 标点，输出统一大写）
roundtrip(morse, ['', 'SOS', 'HELLO WORLD', 'A-Z 0-9', 'HELLO, WORLD!', '123'], {}, '摩斯(默认)');
roundtrip(morse, ['SOS', 'HELLO'], { dot: '喵', dash: '汪', letterSep: '，', wordSep: '！' }, '摩斯(自定义点划)');

// 佛曰编码
roundtrip(buddha, unicode, {}, '佛曰(默认密钥)');
roundtrip(buddha, unicode, { key: 'my-pass' }, '佛曰(自定义密钥)');

// 市场内核
roundtrip(reverse, ['', 'abc', '你好', 'hello world'], {}, '反转(市场)');

// 密钥错误应无法还原
{
  const e = buddha.encode('你好', { key: 'aaa' });
  const d = buddha.decode(e, { key: 'bbb' });
  if (d === '你好') { failed = true; console.error('FAIL 佛曰密钥错误却还原'); }
  else console.log('OK   佛曰密钥错误无法还原（符合预期）');
}

// 多语言元数据
{
  const n = localized({ zh: '喵话编码', en: 'Meow Sentence' }, 'en');
  if (n === 'Meow Sentence') console.log('OK   localized 多语言取值');
  else { failed = true; console.error('FAIL localized:', n); }
  if (localized('plain', 'en') === 'plain') console.log('OK   localized 兼容普通字符串');
  else { failed = true; console.error('FAIL localized 普通字符串'); }
}

// kernelToJSON 往返
{
  const re = compileKernel(kernelToJSON(meow));
  roundtrip(re, ['你好', 'abc', '😀'], { key: 'k', lang: 'Meow' }, '下载-再上传往返');
}

console.log('\n样例：');
console.log('  喵话「你好，世界」→ ' + JSON.stringify(meow.encode('你好，世界', {})));
console.log('  摩斯「SOS」       → ' + JSON.stringify(morse.encode('SOS', {})));
console.log('  佛曰「你好」      → ' + JSON.stringify(buddha.encode('你好', {})));

console.log(failed ? 'FAILED' : 'ALL PASS');
process.exit(failed ? 1 : 0);
