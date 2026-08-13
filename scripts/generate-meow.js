// 生成喵话编码内核 kernels/meow-sentence.json（含零宽隐写模式）
// 运行：node scripts/generate-meow.js
const fs = require('fs');
const path = require('path');

// 零宽字符（在模板字符串里写 \\u200B，得到字面 "\u200B"，JSON.stringify 后为可读的 \u200B 转义）
const Z0 = '\\u200B'; // ZERO WIDTH SPACE  -> bit 0
const Z1 = '\\u200C'; // ZERO WIDTH NON-JOINER -> bit 1

const encodeSrc = `function(input, params) {
  var p = params || {};
  var key = p.key || '';
  var LANGS = {
    '喵':   { word: '喵',   punct: ['，', '。', '！', '？', '：', '；', '、', '…'] },
    'Meow': { word: 'Meow', punct: [',', '.', '!', '?', ':', ';', '-', '~'] }
  };
  var cfg = LANGS[p.lang] || LANGS['喵'];
  var word = cfg.word, P = cfg.punct;
  function hashSeed(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t; return ((t ^ (t >>> 14)) >>> 0); }; }
  var rng = key ? mulberry32(hashSeed(key)) : null;
  var bits = '';
  for (var i = 0; i < input.length; i++) {
    var c = input.charCodeAt(i);
    if (rng) c = c ^ (rng() & 0xFFFF);
    bits += c.toString(2).padStart(16, '0');
  }
  if (p.zeroWidth) {
    var h = 2166136261 >>> 0;
    for (var k = 0; k < input.length; k++) { h ^= input.charCodeAt(k); h = Math.imul(h, 16777619); }
    h = h >>> 0;
    var vis = '喵'.repeat((h % 4) + 1) + '，、'[(h >>> 7) % 2] + '喵'.repeat(((h >>> 3) % 4) + 1) + '。！？…'[(h >>> 11) % 4];
    var zw = '';
    for (var b = 0; b < bits.length; b++) zw += (bits[b] === '0' ? '${Z0}' : '${Z1}');
    var out = '';
    var per = Math.ceil(zw.length / vis.length);
    var zi = 0;
    for (var i = 0; i < vis.length; i++) {
      out += vis[i];
      for (var g = 0; g < per && zi < zw.length; g++, zi++) out += zw[zi];
    }
    while (zi < zw.length) out += zw[zi++];
    return out;
  }
  if (bits === '') return '';
  var pad = (5 - (bits.length % 5)) % 5;
  bits += '0'.repeat(pad);
  var out = '';
  for (var j = 0; j < bits.length; j += 5) {
    var d = parseInt(bits.substr(j, 5), 2);
    out += word.repeat((d % 4) + 1) + P[d >> 2];
  }
  return out;
}`;

const decodeSrc = `function(input, params) {
  var p = params || {};
  var key = p.key || '';
  var LANGS = {
    '喵':   { word: '喵',   punct: ['，', '。', '！', '？', '：', '；', '、', '…'] },
    'Meow': { word: 'Meow', punct: [',', '.', '!', '?', ':', ';', '-', '~'] }
  };
  var cfg = LANGS[p.lang] || LANGS['喵'];
  var word = cfg.word, P = cfg.punct;
  function hashSeed(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t; return ((t ^ (t >>> 14)) >>> 0); }; }
  var rng = key ? mulberry32(hashSeed(key)) : null;
  if (p.zeroWidth) {
    var bits = '';
    for (var i = 0; i < input.length; i++) {
      var ch = input[i];
      if (ch === '${Z0}') bits += '0';
      else if (ch === '${Z1}') bits += '1';
    }
    var out = '';
    for (var j = 0; j + 16 <= bits.length; j += 16) {
      var c = parseInt(bits.substr(j, 16), 2);
      if (rng) c = c ^ (rng() & 0xFFFF);
      out += String.fromCharCode(c);
    }
    return out;
  }
  var bits = '';
  var i = 0;
  while (i < input.length) {
    var ch = input[i];
    if (/\\s/.test(ch)) { i++; continue; }
    var count = 0;
    while (input.slice(i, i + word.length) === word) { count++; i += word.length; }
    if (count > 0) {
      if (count > 4) throw new Error('喵话编码：词数「' + count + '」超出 1~4');
      var pidx = -1;
      for (var k = 0; k < P.length; k++) {
        if (input.slice(i, i + P[k].length) === P[k]) { pidx = k; i += P[k].length; break; }
      }
      if (pidx < 0) throw new Error('喵话编码：缺少标点「' + input.slice(i, i + 8) + '」');
      bits += (pidx * 4 + (count - 1)).toString(2).padStart(5, '0');
      continue;
    }
    throw new Error('喵话编码：无法识别的字符「' + ch + '」');
  }
  var out = '';
  for (var j = 0; j + 16 <= bits.length; j += 16) {
    var c = parseInt(bits.substr(j, 16), 2);
    if (rng) c = c ^ (rng() & 0xFFFF);
    out += String.fromCharCode(c);
  }
  return out;
}`;

const kernel = {
  name: { zh: '喵话编码', en: 'Meow Sentence' },
  version: '1.2.0',
  description: {
    zh: '把文本按每 5 个比特编码成「若干个“词” + 一个标点」，可选密钥加密、输出语言（喵 / Meow）、零宽隐写。',
    en: 'Encodes text in 5-bit groups as "N words + a punctuation mark", with optional key encryption, output language (喵 / Meow) and zero-width steganography.'
  },
  author: '内置示例',
  params: [
    { name: 'key', type: 'string', label: { zh: '密钥', en: 'Key' }, default: '', placeholder: { zh: '留空则不加密', en: 'Leave empty for no encryption' }, description: { zh: '非空时用密钥对内容加密，解码需要相同的密钥。', en: 'When non-empty, encrypts with the key; decoding needs the same key.' } },
    { name: 'lang', type: 'select', label: { zh: '输出语言', en: 'Output language' }, options: ['喵', 'Meow'], default: '喵', description: { zh: '决定喵语使用的“词”与标点。', en: 'The word and punctuation set used.' } },
    { name: 'zeroWidth', type: 'boolean', label: { zh: '零宽隐写', en: 'Zero-width' }, default: false, description: { zh: '开启后数据藏在不可见字符里，肉眼只看到一句随输入变化的短喵话。注意：部分平台（聊天软件、表单等）可能会过滤或丢失零宽字符。', en: 'Hides data in invisible characters; only a short input-dependent sentence is visible. Note: some platforms may strip zero-width characters.' } }
  ],
  encode: encodeSrc,
  decode: decodeSrc
};

const outDir = path.join(__dirname, '..', 'kernels');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'meow-sentence.json'), JSON.stringify(kernel, null, 2) + '\n', 'utf-8');
console.log('已生成 kernels/meow-sentence.json');
