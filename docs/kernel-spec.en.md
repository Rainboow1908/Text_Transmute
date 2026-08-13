# TextTransmuter Kernel Spec

A "conversion kernel" (kernel) defines a **text ⇄ target form** transform.
A kernel is a **UTF-8 encoded JSON file**; upload it to swap the current transform logic.

## 1. Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string \| `{zh, en}` | yes | Kernel name; **must be multilingual** (see §2) |
| `version` | string | no | Version, e.g. `1.1.0` |
| `description` | string \| `{zh, en}` | no | One-line description; **multilingual recommended** |
| `author` | string \| `{zh, en}` | no | Author name |
| `params` | array | no | Custom parameter definitions (see §4) |
| `encode` | string | yes | JS function source, text → target form |
| `decode` | string | yes | JS function source, target form → text |

> `encode` / `decode` are **JavaScript function source strings** (either
> `function(x){...}` or an arrow `(x)=>{...}`).

## 2. Multilingual requirement (mandatory)

The page supports a **中文 / English** toggle. Kernel metadata — `name`,
`description`, `author`, and parameter `label` / `description` / `placeholder` —
**must provide multilingual versions** in this shape:

```json
{ "zh": "中文文本", "en": "English text" }
```

- **`name` must provide both `{zh, en}`**; if one is missing it falls back to the other.
- A plain string (e.g. `"喵话编码"`) renders as-is in every language — that's a
  **non-compliant fallback** kept only for backward compatibility with old kernels.
- The page picks the current UI language, falling back `zh` → `en` → first value.

Example:

```json
{
  "name": { "zh": "喵话编码", "en": "Meow Sentence" },
  "description": {
    "zh": "把文本编码成喵语，可逆、更短。",
    "en": "Encodes text into Meow language, reversible and compact."
  }
}
```

## 3. Function signature & constraints

```
encode: (input: string, params: object) => string
decode: (input: string, params: object) => string
```

- `params` is the **current parameter values object**, keyed by each `name` in the
  `params` definition. With no `params`, the second argument is `{}`.
- **Pure**: only depends on its arguments — no `window` / `document` / network / file / time access, no external side effects.
- **Allowed built-ins**: `String`, `Array`, `Object`, `Number`, `Math`, `JSON`, `RegExp`.
- **Forbidden**: `require` / `import` / `eval` / `Function` constructor, any DOM or IO.
- **Self-contained**: the function body must carry all its dependencies (helpers, tables) — it is serialized into JSON and recompiled on upload.
- **Inverse**: `decode(encode(x, p), p) === x` for the claimed input range.
- **Errors**: throw `new Error('...')` on unhandled input; the page shows it in red.

## 4. Parameter definitions (params)

`params` is an array; each element defines one adjustable setting:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Parameter name, also the key in `params` |
| `type` | string | yes | `string` / `number` / `select` / `boolean` |
| `label` | string \| `{zh, en}` | no | Display name; **multilingual recommended** |
| `default` | any | no | Default value |
| `options` | array | no | Options for `type=select` |
| `placeholder` | string \| `{zh, en}` | no | Placeholder for `type=string` |
| `description` | string \| `{zh, en}` | no | Help text |

Example:

```json
"params": [
  { "name": "key",  "type": "string", "label": { "zh": "密钥", "en": "Key" }, "default": "", "placeholder": { "zh": "留空则不加密", "en": "Leave empty" } },
  { "name": "lang", "type": "select", "label": { "zh": "输出语言", "en": "Language" }, "options": ["喵", "Meow"], "default": "喵" }
]
```

## 5. Full example (minimal: shift + uppercase)

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

## 6. Built-in kernels

| Kernel | File | Description |
|--------|------|-------------|
| 喵话编码 | `kernels/meow-sentence.json` | 16-bit code units → 5-bit groups → "N words + a punctuation mark"; optional key encryption, output language (喵 / Meow) and zero-width steganography (data hidden in invisible characters, only a short sentence visible; note some platforms may strip them) |
| 摩斯密码 | `kernels/morse.json` | Classic Morse; dot / dash / letter gap / word gap all customizable |
| 佛曰编码 | `kernels/buddha.json` | Port of pi.hahaka.com "Buddha" cipher: AES + sutra-style mapping, prefixed "佛曰：", optional key |

## 7. Security

Kernels run **locally in your browser**. `encode`/`decode` are executed as
functions — **only upload kernels you trust**. The §3 limits are conventions,
not enforceable in a pure frontend; verify a kernel's origin before loading it.
