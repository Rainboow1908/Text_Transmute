# 🐱 喵语转换器

输入人话，转换成 `喵喵喵？喵喵！喵喵喵喵喵！` 这种喵语；也能反向把喵语还原回人话。
纯静态、零构建，可直接部署到 **GitHub Pages**。

## 特性

- **双向转换**：人话 ⇄ 喵语（要求内核提供 `encode` 与 `decode` 两个函数）。
- **可上传内核**：自己写一个 JSON 内核上传，立刻替换转换逻辑。
- **内置 3 个示例内核**：喵数编码、摩斯喵语、二进制喵语。
- **下载内核**：把当前内核导出为 JSON 文件，方便分享/备份。
- **零依赖**：无构建链、无 npm，直接用浏览器打开即可运行。

## 目录结构

```
miaomiaomiao2/
├── index.html            # 页面
├── css/style.css         # 样式
├── js/
│   ├── kernels.js        # 内置内核 + 内核编译/序列化逻辑（浏览器 & Node 通用）
│   └── app.js            # 页面交互
├── kernels/              # 示例内核文件（JSON，可直接上传）
│   ├── meow-number.json
│   ├── meow-morse.json
│   └── meow-binary.json
├── docs/kernel-spec.md   # 内核格式规范（必读）
├── scripts/
│   ├── generate-kernels.js  # 重新生成 kernels/*.json
│   └── test-kernels.js      # 内核可逆性回归测试
└── README.md
```

## 本地运行

直接用浏览器打开 `index.html` 即可（所有示例内核内嵌，不依赖服务器）。
也可以用任意静态服务器，例如：

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，把本目录内容推送上去。
2. 仓库 **Settings → Pages**，把 `Source` 设为 `Deploy from a branch`，
   分支选 `main`，目录选 `/ (root)`。
3. 保存后稍等片刻，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可。

> 如果想用 `/docs` 目录作为发布源，把 `index.html`、`css/`、`js/`、`docs/`
> 一并放到 `docs/` 下并调整相对路径即可（本项目默认用根目录）。

## 编写自己的内核

内核是一个 **JSON 文件**，含元数据 + 两个 JS 函数源码字符串：

```json
{
  "name": "我的内核",
  "version": "1.0.0",
  "description": "一句话说明",
  "author": "我",
  "encode": "function(input){ /* 人话 -> 喵语 */ }",
  "decode": "function(input){ /* 喵语 -> 人话 */ }"
}
```

- `encode`：`(input: string) => string`，人话转喵语。
- `decode`：`(input: string) => string`，喵语还原人话。
- 二者应互逆：`decode(encode(x)) === x`。
- 出错用 `throw new Error('...')`。

完整规范见 **[docs/kernel-spec.md](docs/kernel-spec.md)**。

## 开发

```bash
# 回归测试（验证各内核 encode/decode 可逆）
node scripts/test-kernels.js

# 重新生成 kernels/*.json（改动内置内核后）
node scripts/generate-kernels.js
```
