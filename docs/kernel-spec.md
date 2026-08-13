# TextTransmuter 内核规范（Kernel Spec）

一个「转换内核」（下称内核）定义了 **人话 ⇄ 喵语** 的转换规则。
内核是一个 **UTF-8 编码的 JSON 文件**，上传到页面即可替换当前转换逻辑。

## 1. 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 内核名称，展示用（如 `喵话编码`） |
| `version` | string | 否 | 版本号，如 `1.1.0` |
| `description` | string | 否 | 一句话描述转换原理 |
| `author` | string | 否 | 作者名 |
| `params` | array | 否 | 自定义参数定义（见第 3 节），决定页面「内核设置」面板 |
| `encode` | string | 是 | JS 函数源码，人话 → 喵语 |
| `decode` | string | 是 | JS 函数源码，喵语 → 人话 |

> `encode` / `decode` 的值是一段 **JavaScript 函数源码字符串**（可以是
> `function(x){...}` 或箭头函数 `(x)=>{...}`）。

## 2. 函数签名与约束

```
encode: (input: string, params: object) => string
decode: (input: string, params: object) => string
```

- `params` 是**当前参数值的对象**，键来自第 3 节 `params` 定义里每个 `name`。
  例如声明了密钥参数 `key`，则函数内用 `params.key` 读取。内核没有 `params` 定义时，第二个参数为 `{}`。
- **纯函数**：只依赖传入的参数，不访问 `window` / `document` / 网络 / 文件 / 时间，不修改外部状态。
- **可用内置对象**：`String`、`Array`、`Object`、`Number`、`Math`、`JSON`、`RegExp`。
- **禁止**：`require` / `import` / `eval` / `Function` 构造器（避免递归逃逸）、任何 DOM 或 IO 操作。
- **自包含**：函数体必须自带所有依赖（辅助函数、映射表等），不能引用函数外定义的变量——因为函数会被序列化进 JSON、上传后重新编译。
- **互逆**：对内核声称支持的输入范围，应满足 `decode(encode(x, p), p) === x`（相同 `params` 下）。
- **报错**：遇到无法处理的输入，用 `throw new Error('...')` 抛出，页面会捕获并以红色提示显示。

## 3. 参数定义（params）

`params` 是一个数组，每个元素定义一个可在页面「内核设置」里调整的参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 参数名，也是 `params` 对象的键 |
| `type` | string | 是 | 控件类型：`string` / `number` / `select` / `boolean` |
| `label` | string | 否 | 界面显示名（缺省用 `name`） |
| `default` | any | 否 | 默认值 |
| `options` | array | 否 | `type=select` 时的可选项列表 |
| `placeholder` | string | 否 | `type=string` 时的占位提示 |
| `description` | string | 否 | 辅助说明（悬停显示） |

示例：

```json
"params": [
  { "name": "key",  "type": "string", "label": "密钥", "default": "", "placeholder": "留空则不加密" },
  { "name": "lang", "type": "select", "label": "输出语言", "options": ["喵", "Meow"], "default": "喵" },
  { "name": "upper", "type": "boolean", "label": "大写", "default": false },
  { "name": "shift", "type": "number", "label": "位移", "default": 0 }
]
```

## 4. 完整示例（最小演示：位移 + 大写）

```json
{
  "name": "位移演示",
  "version": "1.0.0",
  "description": "演示 params 用法：按位移量平移字符码点。",
  "author": "示例",
  "params": [
    { "name": "shift", "type": "number", "label": "位移", "default": 0 },
    { "name": "upper", "type": "boolean", "label": "大写输出", "default": false }
  ],
  "encode": "function(input, p){ var n=(p&&p.shift)||0; var s=''; for(var i=0;i<input.length;i++){ s+=String.fromCharCode(input.charCodeAt(i)+n); } return p&&p.upper? s.toUpperCase(): s; }",
  "decode": "function(input, p){ var n=(p&&p.shift)||0; var s=''; for(var i=0;i<input.length;i++){ s+=String.fromCharCode(input.charCodeAt(i)-n); } return s; }"
}
```

> 完整的内置「喵话编码」内核（含密钥加密 + 输出语言）见 `kernels/meow-sentence.json`。

## 5. 内置示例内核

| 内核 | 参数 | 说明 |
|------|------|------|
| 喵话编码 | `key`(密钥)、`lang`(输出语言：喵 / Meow) | 每个 UTF-16 码元转 16 bit，整串按每 5 bit 一组编码成「若干个“词” + 一个标点」，8 标点 × 4 词数 = 32 进制。`key` 非空时用密钥流对码元 XOR 加密（解码需相同密钥）；`lang` 决定“词”与标点集合。可逆、更短 |

## 6. 安全说明

页面在**你的浏览器本地**运行上传的内核。`encode`/`decode` 会被当作函数执行，
因此**只上传你信任的内核文件**。第 2 节列出的限制只是约定，无法在纯前端
100% 强制——加载内核前请确认其来源。
