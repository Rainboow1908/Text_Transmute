/**
 * 喵语转换器 —— 内核加载与编译逻辑
 *
 * 本文件同时用于浏览器与 Node.js：
 *   - 浏览器：暴露为 window.MiaoKernels
 *   - Node：   可 require('./js/kernels.js') 进行测试
 *
 * 内核内容不再写死在本文件里——内置内核全部以 JSON 文件形式存放在
 * kernels/ 目录，页面启动时通过 loadBuiltinKernels() 从文件加载并编译。
 * 本文件只负责：编译内核、序列化内核、以及“到哪里加载内核文件”的清单。
 *
 * 内核结构（JSON 文件格式）：
 *   {
 *     name:        string,   // 名称（必填）
 *     version:     string,   // 版本
 *     description: string,   // 描述
 *     author:      string,   // 作者
 *     params:      array,    // 可选，自定义参数定义（见 kernel-spec）
 *     encode:      "(input, params) => string",   // 人话 → 喵语（函数源码字符串）
 *     decode:      "(input, params) => string",   // 喵语 → 人话（函数源码字符串）
 *   }
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 内置内核文件清单：内核内容全部在这些 JSON 文件里。
   * 新增内置内核时，往 kernels/ 加一个 JSON 文件，并在此登记路径即可。
   * ------------------------------------------------------------------ */
  var BUILTIN_FILES = ['kernels/meow-sentence.json'];

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

  /* ------------------------------------------------------------------ *
   * 从文件加载内置内核（浏览器用；返回 Promise<内核对象[]>）
   * ------------------------------------------------------------------ */
  function loadBuiltinKernels() {
    return Promise.all(BUILTIN_FILES.map(function (url) {
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error(url + ' 加载失败（HTTP ' + r.status + '）');
        return r.text();
      }).then(compileKernel);
    }));
  }

  var api = {
    compileKernel: compileKernel,
    kernelToJSON: kernelToJSON,
    paramsToDefaults: paramsToDefaults,
    loadBuiltinKernels: loadBuiltinKernels
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MiaoKernels = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
