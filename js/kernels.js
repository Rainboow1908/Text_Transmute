/**
 * TextTransmuter —— 内核加载与编译逻辑
 *
 * 本文件同时用于浏览器与 Node.js：
 *   - 浏览器：暴露为 window.MiaoKernels
 *   - Node：   可 require('./js/kernels.js') 进行测试
 *
 * 内核内容以 JSON 文件形式存放，页面启动时通过 loadBuiltinKernels() /
 * loadMarketKernels() 从文件加载并编译。本文件只负责编译、序列化与加载。
 *
 * 内核结构（JSON 文件格式）：
 *   {
 *     name:        string | {zh, en},   // 名称（必填，支持多语言）
 *     version:     string,
 *     description: string | {zh, en},
 *     author:      string | {zh, en},
 *     params:      array,               // 可选，自定义参数定义
 *     encode:      "(input, params) => string",
 *     decode:      "(input, params) => string"
 *   }
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 内置内核文件清单
   * ------------------------------------------------------------------ */
  var BUILTIN_FILES = ['kernels/meow-sentence.json', 'kernels/morse.json', 'kernels/buddha.json'];

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
   * 工具：多语言字段取值（支持 string 或 {zh, en, ...} 对象）
   * ------------------------------------------------------------------ */
  function localized(value, lang) {
    if (value == null) return '';
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (value[lang] != null && value[lang] !== '') return value[lang];
      if (value.zh != null && value.zh !== '') return value.zh;
      if (value.en != null && value.en !== '') return value.en;
      for (var k in value) { if (value[k] != null && value[k] !== '') return value[k]; }
      return '';
    }
    return value;
  }

  /* ------------------------------------------------------------------ *
   * 编译内核（JSON 文本 → 内核对象）
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
    if (!localized(data.name, 'zh').trim()) {
      throw new Error('缺少必填字段 name');
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
      description: data.description || '',
      author: data.author || '',
      params: params,
      encode: encode,
      decode: decode
    };
  }

  /* ------------------------------------------------------------------ *
   * 内核对象 → 可下载/可分享的 JSON 文本
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

  /* ------------------------------------------------------------------ *
   * 从文件加载内置内核（返回 Promise<内核对象[]>）
   * ------------------------------------------------------------------ */
  function loadBuiltinKernels() {
    return Promise.all(BUILTIN_FILES.map(function (url) {
      return fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error(url + ' 加载失败（HTTP ' + r.status + '）');
        return r.text();
      }).then(compileKernel);
    }));
  }

  /* ------------------------------------------------------------------ *
   * 从内核市场加载内核：market/index.json 列出文件名，逐个 fetch 编译
   * ------------------------------------------------------------------ */
  function loadMarketKernels() {
    return fetch('market/index.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('market/index.json 加载失败（HTTP ' + r.status + '）');
        return r.json();
      })
      .then(function (files) {
        return Promise.all(files.map(function (f) {
          return fetch('market/' + f, { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('market/' + f + ' 加载失败（HTTP ' + r.status + '）');
            return r.text();
          }).then(compileKernel);
        }));
      });
  }

  var api = {
    compileKernel: compileKernel,
    kernelToJSON: kernelToJSON,
    paramsToDefaults: paramsToDefaults,
    localized: localized,
    loadBuiltinKernels: loadBuiltinKernels,
    loadMarketKernels: loadMarketKernels
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MiaoKernels = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
