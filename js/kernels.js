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
   * 内置内核：喵话编码（Meow Sentence）
   *
   * 把每个 UTF-16 码元转成 16 位二进制，整串拼成 bit 流后按每 5 bit
   * 一组编码成「若干个“喵” + 一个中文标点」：
   *   - 喵的数量 n ∈ 1..4，来自该组 5 bit 的低 2 位（d % 4 + 1）
   *   - 标点来自 8 种中文标点，索引为高 3 位（d >> 2）
   * 即 8 标点 × 4 喵数 = 32 进制，每个单元携带 5 bit。
   * 输出自带逗号/句号/感叹号等句读，像一句“喵话”，且比逐位二进制短得多。
   * ------------------------------------------------------------------ */
  function sentenceEncode(input) {
    // 8 种标点：逗号、句号、感叹号、问号、冒号、分号、顿号、省略号
    var P = ['，', '。', '！', '？', '：', '；', '、', '…'];
    var bits = '';
    for (var i = 0; i < input.length; i++) {
      bits += input.charCodeAt(i).toString(2).padStart(16, '0');
    }
    if (bits === '') return '';
    var pad = (5 - (bits.length % 5)) % 5;
    bits += '0'.repeat(pad);
    var out = '';
    for (var j = 0; j < bits.length; j += 5) {
      var d = parseInt(bits.substr(j, 5), 2);
      out += '喵'.repeat((d % 4) + 1) + P[d >> 2];
    }
    return out;
  }

  function sentenceDecode(input) {
    var P = ['，', '。', '！', '？', '：', '；', '、', '…'];
    var bits = '';
    var count = 0;
    for (var i = 0; i < input.length; i++) {
      var ch = input[i];
      if (ch === '喵') { count++; continue; }
      var idx = P.indexOf(ch);
      if (idx >= 0) {
        var n = count;
        count = 0;
        if (n < 1 || n > 4) throw new Error('喵话编码：喵的数量「' + n + '」超出 1~4');
        bits += (idx * 4 + (n - 1)).toString(2).padStart(5, '0');
        continue;
      }
      if (/\s/.test(ch)) continue; // 忽略粘贴时带入的空白
      throw new Error('喵话编码：无法识别的字符「' + ch + '」');
    }
    if (count > 0) throw new Error('喵话编码：结尾缺少标点');
    var out = '';
    for (var j = 0; j + 16 <= bits.length; j += 16) {
      out += String.fromCharCode(parseInt(bits.substr(j, 16), 2));
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 内置内核列表
   * ------------------------------------------------------------------ */
  var builtinKernels = [
    {
      name: '喵话编码',
      version: '1.0.0',
      description: '把文本按每 5 个比特编码成「若干个“喵” + 一个中文标点」，8 种标点 × 4 种喵数 = 32 进制，输出像一句有句读的喵话，可逆且更短。',
      author: '内置示例',
      encode: sentenceEncode,
      decode: sentenceDecode
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
