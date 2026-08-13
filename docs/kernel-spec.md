# 喵语转换内核规范（Kernel Spec）

一个「转换内核」（下称内核）定义了 **人话 ⇄ 喵语** 的转换规则。
内核是一个 **UTF-8 编码的 JSON 文件**，上传到页面即可替换当前转换逻辑。

## 1. 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 内核名称，展示用（如 `喵数编码`） |
| `version` | string | 可选 | 版本号，如 `1.0.0` |
| `description` | string | 可选 | 一句话描述转换原理 |
| `author` | string | 可选 | 作者名 |
| `encode` | string | ✅ | JS 函数源码，人话 → 喵语 |
| `decode` | string | ✅ | JS 函数源码，喵语 → 人话 |

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

## 3. 完整示例

```json
{
  "name": "喵数编码",
  "version": "1.0.0",
  "description": "每个字符的 Unicode 码点按十进制逐位计数：数字 N 写成 N 个“喵”，位与位之间用“？”，字符结束用“！”。",
  "author": "示例",
  "encode": "function(input){ let out=''; for(const ch of input){ const ds=String(ch.codePointAt(0)); for(let i=0;i<ds.length;i++){ out+='喵'.repeat(+ds[i])+(i===ds.length-1?'！':'？'); } } return out; }",
  "decode": "function(input){ const chars=[]; let digits=[],count=0; for(const ch of input){ if(ch==='喵'){count++;continue;} if(ch==='？'){digits.push(count%10);count=0;continue;} if(ch==='！'){digits.push(count%10);count=0;chars.push(String.fromCodePoint(+digits.join('')));digits=[];continue;} if(/\\s/.test(ch))continue; throw new Error('无法识别的字符: '+ch); } return chars.join(''); }"
}
```

## 4. 内置示例内核

| 内核 | 规则简述 | 可逆 |
|------|----------|------|
| 喵数编码 | 码点十进制逐位计数，`喵×N` + `？/！` 分隔 | ✅ |
| 摩斯喵语 | 点=`喵`、划=`喵喵`，元素间 `·`，字母间 `？`，词间 `！`（支持 A-Z 0-9 及部分标点） | ✅ |
| 二进制喵语 | UTF-16 码元 → 16 位二进制，`0=喵`、`1=喵喵`，位间 `·`，字符间 `？`，结束 `！` | ✅ |

## 5. 安全说明

页面在**你的浏览器本地**运行上传的内核。`encode`/`decode` 会被当作函数执行，
因此**只上传你信任的内核文件**。规范第 2 节列出的限制只是约定，无法在纯前端
100% 强制——加载内核前请确认其来源。
