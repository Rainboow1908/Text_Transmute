# TextTransmuter

一个**可插拔内核**的文本转换器：上传自定义内核，把文本转换成任意形式（内置「喵话编码」示例，如 `喵喵喵，喵喵：“喵喵”。喵喵喵！`），可逆、可加密。
纯静态、零构建，可直接部署到 **GitHub Pages**。

[English](README.en.md)

## 特性

- **可插拔内核**：上传一个 JSON 内核立刻替换转换逻辑，内置多个示例。
- **双向转换**：`encode` / `decode` 双向可逆（要求内核提供两个函数）。
- **内置示例内核**：喵话编码、摩斯密码、佛曰编码。
- **零宽隐写**：喵话编码可把数据藏在不可见字符里，肉眼只看到一句随输入变化的短喵话。
- **自定义参数**：内核可声明参数，页面自动渲染「内核设置」面板。
- **密钥加密**：可设密钥加密输出，无密钥无法还原。
- **内核市场**：独立页签，浏览并加载更多内核。
- **元数据多语言**：内核名称 / 描述 / 参数支持中英双语。
- **多语言界面**：中文 / English 切换，记住你的选择。
- **下载内核**：导出当前内核为 JSON，方便分享 / 备份。
- **零依赖**：无构建链、无 npm，只需一个静态服务器。

## 目录结构

```
TextTransmuter/
├── index.html            # 页面（中/英切换）
├── css/style.css         # 样式
├── js/
│   ├── kernels.js        # 内核加载/编译/序列化逻辑（浏览器 & Node 通用）
│   └── app.js            # 页面交互 + 多语言
├── kernels/              # 内置内核文件（JSON，唯一真相）
│   ├── meow-sentence.json
│   ├── morse.json
│   └── buddha.json
├── market/               # 内核市场（内核 JSON + index.json 清单）
│   ├── index.json
│   └── reverse.json
├── docs/
│   ├── kernel-spec.md    # 内核格式规范（中文）
│   ├── kernel-spec.en.md # 内核格式规范（英文）
│   └── kernel-spec.html  # 渲染页面：fetch .md 用自写渲染器显示 + 下载按钮
├── scripts/
│   ├── test-kernels.js     # 内核可逆性回归测试
│   ├── generate-meow.js    # 重新生成喵话编码内核
│   └── generate-buddha.js  # 重新生成佛曰内核
├── README.md             # 本文件（中文）
├── README.en.md          # English
└── favicon.svg
```

## 本地运行

内置内核通过 fetch 从 `kernels/*.json` 加载，需要本地 HTTP 服务器（不能直接双击 file:// 打开）：

```bash
python server.py
# 打开 http://localhost:8000
```

> `server.py` 会给所有响应加 `Cache-Control: no-store`，避免浏览器缓存旧的内核文件。若用 `python -m http.server`，改完内核后需强制刷新（Ctrl+Shift+R）才能看到新版本。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，把本目录内容推送上去。
2. 仓库 **Settings → Pages**，`Source` 设为 `Deploy from a branch`，
   分支选 `main`，目录选 `/ (root)`。
3. 保存后稍等片刻，访问 `https://<用户名>.github.io/<仓库名>/` 即可。

> 页面所有资源都是相对路径，部署在子路径（如 `/TextTransmuter/`）下也能正常加载。

## 编写自己的内核

内核是一个 **JSON 文件**，含元数据（多语言）+ 可选参数定义 + 两个 JS 函数源码字符串：

```json
{
  "name": { "zh": "我的内核", "en": "My Kernel" },
  "version": "1.0.0",
  "description": { "zh": "一句话说明", "en": "One-line description" },
  "author": "我",
  "params": [
    { "name": "key", "type": "string", "label": { "zh": "密钥", "en": "Key" }, "default": "" }
  ],
  "encode": "function(input, params){ /* 文本 -> 转换结果，可用 params.key */ }",
  "decode": "function(input, params){ /* 转换结果 -> 文本 */ }"
}
```

- `encode`：`(input: string, params: object) => string`，文本转目标形式。
- `decode`：`(input: string, params: object) => string`，目标形式还原文本。
- `params`：可选，声明可自定义参数，页面会据此渲染「内核设置」面板。
- 元数据 `name`/`description`/`author` 及参数 `label` 等**须支持多语言**（`{zh, en}`）。
- 二者应互逆：`decode(encode(x, p), p) === x`。
- 出错用 `throw new Error('...')`。

完整规范见 **[docs/kernel-spec.html](docs/kernel-spec.html)**（浏览器打开，内置自写 markdown 渲染器 + 「下载 Markdown」按钮）；
文档源为 `docs/kernel-spec.md`（唯一源文件）。

## 开发

```bash
# 回归测试（读取 kernels/*.json + market/*.json，验证各内核 encode/decode 可逆）
node scripts/test-kernels.js

# 重新生成内核（改动生成脚本后）
node scripts/generate-meow.js
node scripts/generate-buddha.js
```

> 新增/修改内置内核：直接编辑或新增 `kernels/*.json`，并在 `js/kernels.js` 顶部的
> `BUILTIN_FILES` 清单里登记文件路径。新增市场内核：加入 `market/` 并在
> `market/index.json` 里登记文件名。
