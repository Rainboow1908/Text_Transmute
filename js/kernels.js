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
 *     params:      array,    // 可选，自定义参数定义（见 kernel-spec）
 *     encode:      (input: string, params: object) => string,  // 人话 → 喵语
 *     decode:      (input: string, params: object) => string,  // 喵语 → 人话
 *   }
 *
 * 注意：内置内核的 encode/decode 必须“自包含”——它们会被 toString() 序列化
 * 成 JSON（下载/上传后重新编译），所以内部用到的所有辅助定义（语言表、哈希、
 * 伪随机数）都要写进函数体里，不能引用模块级变量。
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 内置内核：喵话编码（Meow Sentence）
   *
   * 把每个 UTF-16 码元转成 16 位二进制，整串拼成 bit 流后按每 5 bit
   * 一组编码成「若干个“词” + 一个标点」：
   *   - 词的数量 n ∈ 1..4，来自该组 5 bit 的低 2 位（d % 4 + 1）
   *   - 标点来自 8 种标点，索引为高 3 位（d >> 2）
   * 即 8 标点 × 4 词数 = 32 进制，每个单元携带 5 bit。
   *
   * 参数（params）：
   *   - key  密钥：非空时用密钥流对码元做 XOR 加密，解码需相同密钥
   *   - lang 输出语言：决定「词」与标点集合，如 喵 / Meow
   * ------------------------------------------------------------------ */

  function sentenceEncode(input, params) {
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
    if (bits === '') return '';
    var pad = (5 - (bits.length % 5)) % 5;
    bits += '0'.repeat(pad);
    var out = '';
    for (var j = 0; j < bits.length; j += 5) {
      var d = parseInt(bits.substr(j, 5), 2);
      out += word.repeat((d % 4) + 1) + P[d >> 2];
    }
    return out;
  }

  function sentenceDecode(input, params) {
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
    var i = 0;
    while (i < input.length) {
      var ch = input[i];
      if (/\s/.test(ch)) { i++; continue; }
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
  }

  /* ------------------------------------------------------------------ *
   * 内置内核列表
   * ------------------------------------------------------------------ */
  var builtinKernels = [
    {
      name: '喵话编码',
      version: '1.1.0',
      description: '把文本按每 5 个比特编码成「若干个“词” + 一个标点」，可选密钥加密、可选输出语言（喵 / Meow），可逆且更短。',
      author: '内置示例',
      params: [
        { name: 'key', type: 'string', label: '密钥', default: '', placeholder: '留空则不加密', description: '非空时用密钥对内容加密，解码需要相同的密钥。' },
        { name: 'lang', type: 'select', label: '输出语言', options: ['喵', 'Meow'], default: '喵', description: '决定喵语使用的“词”与标点。' }
      ],
      encode: sentenceEncode,
      decode: sentenceDecode
    }
  ];

  /* ------------------------------------------------------------------ *
   * 工具：params 定义数组 → 默认值对象
   * ------------------------------------------------------------------ */
  function paramsToDefaults(schema) {
    var obj = {};
    (schema || []).forEach(function (s) {
      if (s && s.name) obj[s.name] = s.default;
    });
    return obj;
  }

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

    var params = Array.isArray(data.params) ? data.params : [];

    return {
      name: data.name,
      version: typeof data.version === 'string' ? data.version : '',
      description: typeof data.description === 'string' ? data.description : '',
      author: typeof data.author === 'string' ? data.author : '',
      params: params,
      encode: encode,
      decode: decode
    };
  }

  /* ------------------------------------------------------------------ *
   * 内核对象 → 可下载/可分享的 JSON 文本（函数序列化为源码字符串）
   * ------------------------------------------------------------------ */
  function kernelToJSON(kernel) {
    var obj = {
      name: kernel.name,
      version: kernel.version,
      description: kernel.description,
      author: kernel.author,
      encode: kernel.encode.toString(),
      decode: kernel.decode.toString()
    };
    if (kernel.params && kernel.params.length) obj.params = kernel.params;
    return JSON.stringify(obj, null, 2);
  }

  var api = {
    builtinKernels: builtinKernels,
    compileKernel: compileKernel,
    kernelToJSON: kernelToJSON,
    paramsToDefaults: paramsToDefaults
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MiaoKernels = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
