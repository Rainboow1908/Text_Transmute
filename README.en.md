# TextTransmuter

A **pluggable-kernel** text transmuter: upload a custom kernel to transform text into any form (a "Meow sentence" kernel ships built in, e.g. `MeowMeow, MeowMeow!`), reversible and encryptable.
Static and zero-build, deployable straight to **GitHub Pages**.

[中文](README.md)

## Features

- **Pluggable kernels**: upload a JSON kernel to swap the transform logic instantly; a "Meow sentence" example is built in.
- **Reversible**: `encode` / `decode` round-trip (kernels provide both functions).
- **Custom parameters**: kernels declare params, and the page auto-renders a "Kernel settings" panel.
- **Key encryption**: encrypt the output with a key; it can't be restored without the same key.
- **Output languages**: the built-in kernel supports "喵 / Meow" and more.
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
│   └── meow-sentence.json
├── docs/
│   ├── kernel-spec.md    # kernel format spec (single source, Markdown)
│   └── kernel-spec.html  # renderer page: fetches the .md, renders + download button
├── scripts/
│   └── test-kernels.js   # kernel round-trip tests (reads kernels/*.json)
├── README.md             # 中文
├── README.en.md          # this file (English)
└── favicon.svg
```

## Run locally

Built-in kernels are fetched from `kernels/*.json`, so you need a local HTTP server (opening `index.html` via `file://` won't work):

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a repo on GitHub and push this directory to it.
2. In **Settings → Pages**, set `Source` to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
3. Save, wait a minute or two, then visit `https://<user>.github.io/<repo>/`.

> All assets use relative paths, so it works under a sub-path like `/TextTransmuter/` too.

## Write your own kernel

A kernel is a **JSON file** with metadata + optional parameter definitions + two JS function source strings:

```json
{
  "name": "My kernel",
  "version": "1.0.0",
  "description": "One-line description",
  "author": "me",
  "params": [
    { "name": "key", "type": "string", "label": "Key", "default": "" }
  ],
  "encode": "function(input, params){ /* text -> transformed, use params.key */ }",
  "decode": "function(input, params){ /* transformed -> text */ }"
}
```

- `encode`: `(input: string, params: object) => string` — text to target form.
- `decode`: `(input: string, params: object) => string` — target form back to text.
- `params`: optional; declares customizable parameters rendered into the "Kernel settings" panel.
- They must be inverse: `decode(encode(x, p), p) === x`.
- Throw `new Error('...')` on failure.

See the full spec at **[docs/kernel-spec.html](docs/kernel-spec.html)** (opens in the browser, with a built-in markdown renderer and a "Download Markdown" button);
the single source is `docs/kernel-spec.md`.

## Development

```bash
# round-trip tests (reads kernels/*.json, verifies encode/decode)
node scripts/test-kernels.js
```

> To add/change a built-in kernel: edit or add a `kernels/*.json` file and register
> its path in the `BUILTIN_FILES` list at the top of `js/kernels.js`.
