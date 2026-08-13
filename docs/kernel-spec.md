# TextTransmuter 内核规范（Kernel Spec）

一个「转换内核」（下称内核）定义了 **文本 ⇄ 目标形式** 的转换规则。
内核是一个 **UTF-8 编码的 JSON 文件**，上传到页面即可替换当前转换逻辑。

## 1. 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string \| `{zh, en}` | 是 | 内核名称，展示用；**必须多语言**（见第 2 节） |
| `version` | string | 否 | 版本号，如 `1.1.0` |
| `description` | string \| `{zh, en}` | 否 | 一句话描述转换原理；**建议多语言** |
| `author` | string \| `{zh, en}` | 否 | 作者名 |
| `params` | array | 否 | 自定义参数定义（见第 3 节） |
| `encode` | string | 是 | JS 函数源码，文本 → 目标形式 |
| `decode` | string | 是 | JS 函数源码，目标形式 → 文本 |

> `encode` / `decode` 的值是一段 **JavaScript 函数源码字符串**（可以是
> `function(x){...}` 或箭头函数 `(x)=>{...}`）。

## 2. 多语言要求（必须）

页面支持 **中文 / English** 切换。内核的元数据字段 `name`、`description`、
`author` 以及参数定义里的 `label` / `description` / `placeholder`，**必须提供
多语言版本**，格式为：

```json
{ "zh": "中文文本", "en": "English text" }
```

- **`name` 必须提供 `{zh, en}` 两种语言**；只有一种语言时，另一种语言会回退显示。
- 也可以写成普通字符串（如 `"喵话编码"`），此时该字符串在任何界面语言下都原样显示，
  属于**不满足多语言要求的退化写法**，仅用于兼容旧内核。
- 页面会按当前界面语言取对应版本，缺失时依次回退到 `zh` → `en` → 任意第一个值。

示例：

```json
{
  "name": { "zh": "喵话编码", "en": "Meow Sentence" },
  "description": {
    "zh": "把文本编码成喵语，可逆、更短。",
    "en": "Encodes text into Meow language, reversible and compact."
  }
}
```

## 3. 函数签名与约束

```
encode: (input: string, params: object) => string
decode: (input: string, params: object) => string
```

- `params` 是**当前参数值的对象**，键来自第 4 节 `params` 定义里每个 `name`。
  例如声明了密钥参数 `key`，则函数内用 `params.key` 读取。内核没有 `params` 定义时，第二个参数为 `{}`。
- **纯函数**：只依赖传入的参数，不访问 `window` / `document` / 网络 / 文件 / 时间，不修改外部状态。
- **可用内置对象**：`String`、`Array`、`Object`、`Number`、`Math`、`JSON`、`RegExp`。
- **禁止**：`require` / `import` / `eval` / `Function` 构造器（避免递归逃逸）、任何 DOM 或 IO 操作。
- **自包含**：函数体必须自带所有依赖（辅助函数、映射表等），不能引用函数外定义的变量——因为函数会被序列化进 JSON、上传后重新编译。
- **互逆**：对内核声称支持的输入范围，应满足 `decode(encode(x, p), p) === x`（相同 `params` 下）。
- **报错**：遇到无法处理的输入，用 `throw new Error('...')` 抛出，页面会捕获并以红色提示显示。

## 4. 参数定义（params）

`params` 是一个数组，每个元素定义一个可在页面「内核设置」里调整的参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 参数名，也是 `params` 对象的键 |
| `type` | string | 是 | 控件类型：`string` / `number` / `select` / `boolean` |
| `label` | string \| `{zh, en}` | 否 | 界面显示名（缺省用 `name`）；**建议多语言** |
| `default` | any | 否 | 默认值 |
| `options` | array | 否 | `type=select` 时的可选项列表 |
| `placeholder` | string \| `{zh, en}` | 否 | `type=string` 时的占位提示 |
| `description` | string \| `{zh, en}` | 否 | 辅助说明 |

示例：

```json
"params": [
  { "name": "key",  "type": "string", "label": { "zh": "密钥", "en": "Key" }, "default": "", "placeholder": { "zh": "留空则不加密", "en": "Leave empty" } },
  { "name": "lang", "type": "select", "label": { "zh": "输出语言", "en": "Language" }, "options": ["喵", "Meow"], "default": "喵" }
]
```

## 5. 完整示例（最小演示：位移 + 大写）

```json
{
  "name": { "zh": "位移演示", "en": "Shift Demo" },
  "version": "1.0.0",
  "description": {
    "zh": "演示 params 用法：按位移量平移字符码点。",
    "en": "Demonstrates params: shifts character code points by an offset."
  },
  "author": "示例",
  "params": [
    { "name": "shift", "type": "number", "label": { "zh": "位移", "en": "Shift" }, "default": 0 },
    { "name": "upper", "type": "boolean", "label": { "zh": "大写输出", "en": "Uppercase" }, "default": false }
  ],
  "encode": "function(input, p){ var n=(p&&p.shift)||0; var s=''; for(var i=0;i<input.length;i++){ s+=String.fromCharCode(input.charCodeAt(i)+n); } return p&&p.upper? s.toUpperCase(): s; }",
  "decode": "function(input, p){ var n=(p&&p.shift)||0; var s=''; for(var i=0;i<input.length;i++){ s+=String.fromCharCode(input.charCodeAt(i)-n); } return s; }"
}
```

## 6. 内置示例内核

| 内核 | 文件 | 说明 |
|------|------|------|
| 喵话编码 | `kernels/meow-sentence.json` | 每个 UTF-16 码元转 16 bit，整串按每 5 bit 一组编码成「若干个“词” + 一个标点」，可选密钥加密、可选输出语言（喵 / Meow）、可选零宽隐写（数据藏在不可见字符里，肉眼只看到一句短喵话；注意部分平台可能过滤零宽字符） |
| 摩斯密码 | `kernels/morse.json` | 经典摩斯码，点/划/字母间隔/词间隔四个符号均可自定义 |
| 佛曰编码 | `kernels/buddha.json` | 复刻 pi.hahaka.com 的「与佛论禅」：AES 加密后映射为佛经风格汉字，输出以「佛曰：」开头，可设密钥 |

## 7. 安全说明

页面在**你的浏览器本地**运行上传的内核。`encode`/`decode` 会被当作函数执行，
因此**只上传你信任的内核文件**。第 3 节列出的限制只是约定，无法在纯前端
100% 强制——加载内核前请确认其来源。
