# TextTransmuter

A **pluggable-kernel** text transmuter: upload a custom kernel to transform text into any form (a "Meow sentence" kernel ships built in, e.g. `MeowMeow, MeowMeow!`), reversible and encryptable.
Static and zero-build, deployable straight to **GitHub Pages**.

[中文](README.md)

## Features

- **Pluggable kernels**: upload a JSON kernel to swap the transform logic instantly; several examples ship built in.
- **Reversible**: `encode` / `decode` round-trip (kernels provide both functions).
- **Built-in examples**: Meow Sentence, Morse Code, Buddha.
- **Zero-width steganography**: Meow Sentence can hide data in invisible characters; only a short input-dependent sentence is visible.
- **Custom parameters**: kernels declare params, and the page auto-renders a "Kernel settings" panel.
- **Key encryption**: encrypt the output with a key; it can't be restored without the same key.
- **Kernel market**: a separate tab to browse and load more kernels.
- **Multilingual metadata**: kernel name / description / params support 中文 & English.
- **Multilingual UI**: 中文 / English, remembered across visits.
- **Download kernel**: export the current kernel as JSON to share or back up.
- **Zero dependencies**: no build step, no npm — just a static server.

## Structure

```
TextTransmuter/
├── index.html            # page (中文 / English)
├── css/style.css         # styles
├── js/
│   ├── kernels.js        # kernel load / compile / serialize (browser & Node)
│   └── app.js            # UI logic + i18n
├── kernels/              # built-in kernel files (JSON — the single source of truth)
│   ├── meow-sentence.json
│   ├── morse.json
│   └── buddha.json
├── market/               # kernel market (kernel JSON + index.json manifest)
│   ├── index.json
│   └── reverse.json
├── docs/
│   ├── kernel-spec.md    # kernel format spec (中文)
│   ├── kernel-spec.en.md # kernel format spec (English)
│   └── kernel-spec.html  # renderer page: fetches the .md, renders + download button
├── scripts/
│   ├── test-kernels.js     # kernel round-trip tests
│   ├── generate-meow.js    # regenerate the Meow Sentence kernel
│   └── generate-buddha.js  # regenerate the Buddha kernel
├── README.md             # 中文
├── README.en.md          # this file (English)
└── favicon.svg
```

## Run locally

Built-in kernels are fetched from `kernels/*.json`, so you need a local HTTP server (opening `index.html` via `file://` won't work):

```bash
python server.py
# open http://localhost:8000
```

> `server.py` adds `Cache-Control: no-store` to every response so the browser won't cache stale kernel files. With `python -m http.server`, force-refresh (Ctrl+Shift+R) after editing kernels to see the new version.

## Deploy to GitHub Pages

1. Create a repo on GitHub and push this directory to it.
2. In **Settings → Pages**, set `Source` to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
3. Save, wait a minute or two, then visit `https://<user>.github.io/<repo>/`.

> All assets use relative paths, so it works under a sub-path like `/TextTransmuter/` too.

## Write your own kernel

A kernel is a **JSON file** with multilingual metadata + optional parameter definitions + two JS function source strings:

```json
{
  "name": { "zh": "我的内核", "en": "My Kernel" },
  "version": "1.0.0",
  "description": { "zh": "一句话说明", "en": "One-line description" },
  "author": "me",
  "params": [
    { "name": "key", "type": "string", "label": { "zh": "密钥", "en": "Key" }, "default": "" }
  ],
  "encode": "function(input, params){ /* text -> transformed, use params.key */ }",
  "decode": "function(input, params){ /* transformed -> text */ }"
}
```

- `encode`: `(input: string, params: object) => string` — text to target form.
- `decode`: `(input: string, params: object) => string` — target form back to text.
- `params`: optional; declares customizable parameters rendered into the "Kernel settings" panel.
- Metadata `name`/`description`/`author` and param `label` **must support multilingual** (`{zh, en}`).
- They must be inverse: `decode(encode(x, p), p) === x`.
- Throw `new Error('...')` on failure.

See the full spec at **[docs/kernel-spec.html](docs/kernel-spec.html)** (opens in the browser, with a built-in markdown renderer and a "Download Markdown" button);
the single source is `docs/kernel-spec.md`.

## Development

```bash
# round-trip tests (reads kernels/*.json + market/*.json, verifies encode/decode)
node scripts/test-kernels.js

# regenerate kernels (after editing the generator scripts)
node scripts/generate-meow.js
node scripts/generate-buddha.js
```

> To add/change a built-in kernel: edit or add a `kernels/*.json` file and register
> its path in the `BUILTIN_FILES` list at the top of `js/kernels.js`. To add a market
> kernel: drop it in `market/` and register the filename in `market/index.json`.
