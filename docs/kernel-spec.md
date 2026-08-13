# 喵语转换内核规范（Kernel Spec）

一个「转换内核」（下称内核）定义了 **人话 ⇄ 喵语** 的转换规则。
内核是一个 **UTF-8 编码的 JSON 文件**，上传到页面即可替换当前转换逻辑。

## 1. 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 内核名称，展示用（如 `喵话编码`） |
| `version` | string | 否 | 版本号，如 `1.0.0` |
| `description` | string | 否 | 一句话描述转换原理 |
| `author` | string | 否 | 作者名 |
| `encode` | string | 是 | JS 函数源码，人话 → 喵语 |
| `decode` | string | 是 | JS 函数源码，喵语 → 人话 |

> `encode` / `decode` 的值是一段 **JavaScript 函数源码字符串**（可以是
> `function(x){...}` 或箭头函数 `(x)=>{...}`）。

## 2. 函数签名与约束

```
encode: (input: string) => string
decode: (input: string) => string
```

- **纯函数**：只依赖传入的参数，不访问 `window` / `document` / 网络 / 文件 / 时间，不修改外部状态。
- **可用内置对象**：`String`、`Array`、`Object`、`Number`、`Math`、`JSON`、`RegExp`。
- **禁止**：`require` / `import` / `eval` / `Function` 构造器（避免递归逃逸）、任何 DOM 或 IO 操作。
- **互逆**：对内核声称支持的输入范围，应满足 `decode(encode(x)) === x`。
- **报错**：遇到无法处理的输入，用 `throw new Error('...')` 抛出，页面会捕获并以红色提示显示。

## 3. 完整示例（内置「喵话编码」内核）

```json
{
  "name": "喵话编码",
  "version": "1.0.0",
  "description": "把文本按每 5 个比特编码成「若干个“喵” + 一个中文标点」，8 种标点 × 4 种喵数 = 32 进制，输出像一句有句读的喵话，可逆且更短。",
  "author": "内置示例",
  "encode": "function sentenceEncode(input) {\n    var P = ['，', '。', '！', '？', '：', '；', '、', '…'];\n    var bits = '';\n    for (var i = 0; i < input.length; i++) {\n      bits += input.charCodeAt(i).toString(2).padStart(16, '0');\n    }\n    if (bits === '') return '';\n    var pad = (5 - (bits.length % 5)) % 5;\n    bits += '0'.repeat(pad);\n    var out = '';\n    for (var j = 0; j < bits.length; j += 5) {\n      var d = parseInt(bits.substr(j, 5), 2);\n      out += '喵'.repeat((d % 4) + 1) + P[d >> 2];\n    }\n    return out;\n  }",
  "decode": "function sentenceDecode(input) {\n    var P = ['，', '。', '！', '？', '：', '；', '、', '…'];\n    var bits = '';\n    var count = 0;\n    for (var i = 0; i < input.length; i++) {\n      var ch = input[i];\n      if (ch === '喵') { count++; continue; }\n      var idx = P.indexOf(ch);\n      if (idx >= 0) {\n        var n = count;\n        count = 0;\n        if (n < 1 || n > 4) throw new Error('喵话编码：喵的数量「' + n + '」超出 1~4');\n        bits += (idx * 4 + (n - 1)).toString(2).padStart(5, '0');\n        continue;\n      }\n      if (/\\s/.test(ch)) continue;\n      throw new Error('喵话编码：无法识别的字符「' + ch + '」');\n    }\n    if (count > 0) throw new Error('喵话编码：结尾缺少标点');\n    var out = '';\n    for (var j = 0; j + 16 <= bits.length; j += 16) {\n      out += String.fromCharCode(parseInt(bits.substr(j, 16), 2));\n    }\n    return out;\n  }"
}
```

## 4. 内置示例内核

| 内核 | 规则简述 | 可逆 |
|------|----------|------|
| 喵话编码 | 每个 UTF-16 码元转 16 bit，整串按每 5 bit 一组编码成「`喵`×1~4 + 8 种中文标点之一」，即 32 进制。输出自带句读、更短 | 是 |

## 5. 安全说明

页面在**你的浏览器本地**运行上传的内核。`encode`/`decode` 会被当作函数执行，
因此**只上传你信任的内核文件**。规范第 2 节列出的限制只是约定，无法在纯前端
100% 强制——加载内核前请确认其来源。
