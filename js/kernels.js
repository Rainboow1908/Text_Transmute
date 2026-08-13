/**
 * 喵语转换器 —— 内核定义与编译逻辑
 *
 * 本文件同时用于浏览器与 Node.js：
 *   - 浏览器：暴露为 window.MiaoKernels
 *   - Node：   可 require('./js/kernels.js') 进行测试
 *
 * 内核结构：
 *   {
 *     name:        string,   // 名称（必填）
 *     version:     string,   // 版本
 *     description: string,   // 描述
 *     author:      string,   // 作者
 *     encode:      (input: string) => string,   // 人话 → 喵语
 *     decode:      (input: string) => string,   // 喵语 → 人话
 *   }
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 内置内核 1：喵数编码（默认）
   * 每个字符的 Unicode 码点 → 十进制 → 逐位计数：
   *   数字 N → 写 N 个「喵」；位与位之间「？」；字符结束「！」。
   * ------------------------------------------------------------------ */
  function numberEncode(input) {
    let out = '';
    for (const ch of input) {
      const ds = String(ch.codePointAt(0));
      for (let i = 0; i < ds.length; i++) {
        out += '喵'.repeat(+ds[i]) + (i === ds.length - 1 ? '！' : '？');
      }
    }
    return out;
  }

  function numberDecode(input) {
    const chars = [];
    let digits = [];
    let count = 0;
    for (const ch of input) {
      if (ch === '喵') { count++; continue; }
      if (ch === '？') { digits.push(count % 10); count = 0; continue; }
      if (ch === '！') {
        digits.push(count % 10);
        count = 0;
        chars.push(String.fromCodePoint(+digits.join('')));
        digits = [];
        continue;
      }
      if (/\s/.test(ch)) continue; // 忽略粘贴时带入的空白
      throw new Error('喵数编码：无法识别的字符「' + ch + '」');
    }
    return chars.join('');
  }

  /* ------------------------------------------------------------------ *
   * 内置内核 2：摩斯喵语
   * 点 =「喵」，划 =「喵喵」，元素间「·」，字母间「？」，词间「！」。
   * 支持 A-Z、0-9 及部分标点。
   * ------------------------------------------------------------------ */
  var MORSE_TABLE = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.',
    '-': '-....-', '(': '-.--.', ')': '-.--.-', '@': '.--.-.'
  };

  function morseEncode(input) {
    const words = input.toUpperCase().split(/\s+/).filter(Boolean);
    let out = '';
    for (let w = 0; w < words.length; w++) {
      if (w > 0) out += '！';
      const word = words[w];
      for (let i = 0; i < word.length; i++) {
        const code = MORSE_TABLE[word[i]];
        if (!code) throw new Error('摩斯喵语：不支持的字符「' + word[i] + '」');
        const parts = [];
        for (const sym of code) parts.push(sym === '.' ? '喵' : '喵喵');
        out += parts.join('·');
        if (i < word.length - 1) out += '？';
      }
    }
    return out;
  }

  function morseDecode(input) {
    let reverse = {};
    for (const k in MORSE_TABLE) reverse[MORSE_TABLE[k]] = k;
    const words = input.split('！');
    let out = '';
    for (let w = 0; w < words.length; w++) {
      if (w > 0) out += ' ';
      const letters = words[w].split('？');
      for (const letter of letters) {
        if (!letter) continue;
        let code = '';
        for (const s of letter.split('·')) {
          if (s === '喵') code += '.';
          else if (s === '喵喵') code += '-';
          else if (s === '') continue;
          else throw new Error('摩斯喵语：无法识别的元素「' + s + '」');
        }
        const ch = reverse[code];
        if (ch === undefined) throw new Error('摩斯喵语：未知的摩斯码「' + code + '」');
        out += ch;
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 内置内核 3：二进制喵语
   * 每个 UTF-16 码元 → 16 位二进制：
   *   0 =「喵」，1 =「喵喵」，位间「·」，字符间「？」，结束「！」。
   * ------------------------------------------------------------------ */
  function binaryEncode(input) {
    if (input === '') return '';
    let out = '';
    for (let i = 0; i < input.length; i++) {
      const bin = input.charCodeAt(i).toString(2).padStart(16, '0');
      const bits = [];
      for (const b of bin) bits.push(b === '0' ? '喵' : '喵喵');
      out += bits.join('·') + '？';
    }
    return out + '！';
  }

  function binaryDecode(input) {
    const body = input.endsWith('！') ? input.slice(0, -1) : input;
    let out = '';
    for (const token of body.split('？')) {
      if (!token) continue;
      let bits = '';
      for (const s of token.split('·')) {
        if (s === '喵') bits += '0';
        else if (s === '喵喵') bits += '1';
        else if (s === '') continue;
        else throw new Error('二进制喵语：无法识别的元素「' + s + '」');
      }
      if (bits.length === 0) continue;
      out += String.fromCharCode(parseInt(bits, 2));
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 内置内核列表
   * ------------------------------------------------------------------ */
  var builtinKernels = [
    {
      name: '喵数编码',
      version: '1.0.0',
      description: '默认内核：每个字符的 Unicode 码点按十进制逐位计数，数字 N 写成 N 个「喵」，位间「？」，字符结束「！」。',
      author: '内置示例',
      encode: numberEncode,
      decode: numberDecode
    },
    {
      name: '摩斯喵语',
      version: '1.0.0',
      description: '经典摩斯码：点=「喵」、划=「喵喵」，元素间「·」，字母间「？」，词间「！」。支持 A-Z、0-9 及部分标点。',
      author: '内置示例',
      encode: morseEncode,
      decode: morseDecode
    },
    {
      name: '二进制喵语',
      version: '1.0.0',
      description: '每个 UTF-16 码元转 16 位二进制：0=「喵」、1=「喵喵」，位间「·」，字符间「？」，结束「！」。',
      author: '内置示例',
      encode: binaryEncode,
      decode: binaryDecode
    }
  ];

  /* ------------------------------------------------------------------ *
   * 编译用户上传的内核（JSON 文本 → 内核对象）
   * ------------------------------------------------------------------ */
  function compileKernel(jsonText) {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      throw new Error('JSON 解析失败：' + e.message);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('内核必须是 JSON 对象');
    }
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new Error('缺少必填字段 name（字符串）');
    }
    if (typeof data.encode !== 'string' || typeof data.decode !== 'string') {
      throw new Error('encode / decode 必须是函数源码字符串');
    }
    let encode, decode;
    try {
      encode = new Function('return (' + data.encode + ')')();
    } catch (e) {
      throw new Error('encode 不是合法的函数源码：' + e.message);
    }
    try {
      decode = new Function('return (' + data.decode + ')')();
    } catch (e) {
      throw new Error('decode 不是合法的函数源码：' + e.message);
    }
    if (typeof encode !== 'function') throw new Error('encode 未解析为函数');
    if (typeof decode !== 'function') throw new Error('decode 未解析为函数');

    return {
      name: data.name,
      version: typeof data.version === 'string' ? data.version : '',
      description: typeof data.description === 'string' ? data.description : '',
      author: typeof data.author === 'string' ? data.author : '',
      encode: encode,
      decode: decode
    };
  }

  /* ------------------------------------------------------------------ *
   * 内核对象 → 可下载/可分享的 JSON 文本（函数序列化为源码字符串）
   * ------------------------------------------------------------------ */
  function kernelToJSON(kernel) {
    return JSON.stringify({
      name: kernel.name,
      version: kernel.version,
      description: kernel.description,
      author: kernel.author,
      encode: kernel.encode.toString(),
      decode: kernel.decode.toString()
    }, null, 2);
  }

  var api = {
    builtinKernels: builtinKernels,
    compileKernel: compileKernel,
    kernelToJSON: kernelToJSON
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MiaoKernels = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
