(function () {
  'use strict';

  var M = window.MiaoKernels;

  /* ---------------- 多语言 ---------------- */
  var I18N = {
    zh: {
      hero: '输入文本，用可插拔内核转换成任意形式（如喵语），也能反向还原。',
      navMarket: '内核市场',
      kernelTitle: '转换内核',
      upload: '上传内核',
      download: '下载当前内核',
      spec: '内核规范',
      builtin: '内置',
      uploaded: '已上传',
      settings: '内核设置',
      inputLabel: '输入',
      outputLabel: '输出',
      transform: '转换 →',
      restore: '← 还原',
      copy: '复制',
      copied: '已复制',
      inputPlaceholder: '在这里输入文本…',
      outputPlaceholder: '转换结果会出现在这里…',
      footer: '© 2026 Rainboow1908 · 本工具仅供学习与娱乐，转换/加密不保证安全性，请勿用于敏感数据。',
      transformFailed: '转换失败：',
      kernelLoadFailed: '内核加载失败：',
      readFileFailed: '读取文件失败。',
      builtinLoadFailed: '无法加载内置内核',
      noBuiltinKernels: '未找到内置内核文件。',
      builtinLoadHint: '请通过 http 服务器访问本页，例如在项目目录运行：python -m http.server 8000'
    },
    en: {
      hero: 'Transform text into any form (like Meow) with pluggable kernels — and back.',
      navMarket: 'Kernel Market',
      kernelTitle: 'Kernel',
      upload: 'Upload kernel',
      download: 'Download kernel',
      spec: 'Kernel spec',
      builtin: 'Built-in',
      uploaded: 'Uploaded',
      settings: 'Kernel settings',
      inputLabel: 'Input',
      outputLabel: 'Output',
      transform: 'Transform →',
      restore: '← Restore',
      copy: 'Copy',
      copied: 'Copied',
      inputPlaceholder: 'Type text here…',
      outputPlaceholder: 'Result appears here…',
      footer: '© 2026 Rainboow1908 · For learning and entertainment only. Transforms/encryption are not guaranteed secure — do not use for sensitive data.',
      transformFailed: 'Transform failed: ',
      kernelLoadFailed: 'Kernel load failed: ',
      readFileFailed: 'Failed to read file.',
      builtinLoadFailed: 'Failed to load built-in kernels',
      noBuiltinKernels: 'No built-in kernel files found.',
      builtinLoadHint: 'Please serve this page over HTTP, e.g. run: python -m http.server 8000'
    }
  };

  var currentLang = (localStorage.getItem('lang') === 'en') ? 'en' : 'zh';

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || key;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    try { localStorage.setItem('lang', lang); } catch (e) { /* ignore */ }
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (I18N[lang][key] != null) el.textContent = I18N[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (I18N[lang][key] != null) el.placeholder = I18N[lang][key];
    });
    var zhBtn = document.getElementById('lang-zh');
    var enBtn = document.getElementById('lang-en');
    if (zhBtn) zhBtn.classList.toggle('active', lang === 'zh');
    if (enBtn) enBtn.classList.toggle('active', lang === 'en');
    if (current) { renderTabs(); renderInfo(); renderSettings(); }
    applyFloatWords();
  }

  /* ---------------- 背景浮动词（按权重随机） ---------------- */
  var FLOAT_WORDS = {
    zh: [
      { w: '啊这个这个', weight: 1 },
      { w: '🐟', weight: 1 },
      { w: '1000万以内最好的网页', weight: 1 },
      { w: '神了', weight: 3 },
      { w: '喵', weight: 10 }
    ],
    en: [
      { w: 'Ah, this this', weight: 1 },
      { w: '🐟', weight: 1 },
      { w: 'Best webpage under 10M', weight: 1 },
      { w: 'Amazing', weight: 3 },
      { w: 'Meow', weight: 10 }
    ]
  };
  function pickFloatWord(items) {
    var total = 0;
    for (var i = 0; i < items.length; i++) total += items[i].weight;
    var r = Math.random() * total;
    for (var i = 0; i < items.length; i++) {
      r -= items[i].weight;
      if (r < 0) return items[i].w;
    }
    return items[items.length - 1].w;
  }
  function applyFloatWords() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    // 清除旧字（回收）
    hero.querySelectorAll('.float-meow').forEach(function (el) { el.remove(); });
    // 初始 3 个字，错开延迟
    var delays = [0, 2.7, 5.3];
    for (var i = 0; i < delays.length; i++) {
      spawnFloat(hero, delays[i]);
    }
  }

  function spawnFloat(hero, delay) {
    var el = document.createElement('span');
    el.className = 'float-meow';
    el.style.left = (5 + Math.random() * 85) + '%';
    el.style.top = (15 + Math.random() * 55) + '%';
    if (delay) el.style.animationDelay = delay + 's';
    el.textContent = pickFloatWord(FLOAT_WORDS[currentLang] || FLOAT_WORDS.zh);
    hero.appendChild(el);
    // 动画结束后回收，再重新生成一个
    el.addEventListener('animationend', function () {
      el.remove();
      spawnFloat(hero, 0);
    });
  }

  /* ---------------- DOM ---------------- */
  var builtinTabs = document.getElementById('builtin-tabs');
  var uploadedTabs = document.getElementById('uploaded-tabs');
  var uploadedLabel = document.getElementById('uploaded-label');
  var kernelInfo = document.getElementById('kernel-info');
  var settingsPanel = document.getElementById('settings');
  var uploadBtn = document.getElementById('upload-btn');
  var downloadBtn = document.getElementById('download-btn');
  var fileInput = document.getElementById('file-input');
  var humanInput = document.getElementById('human-input');
  var meowInput = document.getElementById('meow-input');
  var toMeow = document.getElementById('to-meow');
  var toHuman = document.getElementById('to-human');
  var copyHuman = document.getElementById('copy-human');
  var copyMeow = document.getElementById('copy-meow');
  var errorBox = document.getElementById('error-box');

  /* ---------------- 状态 ---------------- */
  var builtin = [];
  var uploaded = [];
  var current = null;
  var currentKey = '';
  var currentParams = {};

  /* ---------------- 工具 ---------------- */
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }
  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- 渲染 ---------------- */
  function renderTabs() {
    builtinTabs.innerHTML = '';
    builtin.forEach(function (k, i) {
      var key = 'builtin:' + i;
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'tab' + (key === currentKey ? ' active' : '');
      el.textContent = M.localized(k.name, currentLang);
      el.addEventListener('click', function () { selectBuiltin(i); });
      builtinTabs.appendChild(el);
    });

    uploadedTabs.innerHTML = '';
    uploadedLabel.hidden = uploaded.length === 0;
    uploaded.forEach(function (k, i) {
      var key = 'uploaded:' + i;
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'tab' + (key === currentKey ? ' active' : '');
      var name = document.createElement('span');
      name.textContent = M.localized(k.name, currentLang);
      el.appendChild(name);
      var del = document.createElement('span');
      del.className = 'del';
      del.textContent = '×';
      del.addEventListener('click', function (ev) {
        ev.stopPropagation();
        removeUploaded(i);
      });
      el.appendChild(del);
      el.addEventListener('click', function () { selectUploaded(i); });
      uploadedTabs.appendChild(el);
    });
  }

  function renderInfo() {
    if (!current) { kernelInfo.innerHTML = ''; return; }
    var author = M.localized(current.author, currentLang);
    var meta = [current.version && ('v' + current.version), author]
      .filter(Boolean).join(' · ');
    kernelInfo.innerHTML =
      '<div><b>' + escapeHtml(M.localized(current.name, currentLang)) + '</b>' +
      (meta ? ' <span class="meta">' + escapeHtml(meta) + '</span>' : '') + '</div>' +
      '<div class="meta">' + escapeHtml(M.localized(current.description, currentLang)) + '</div>';
    kernelInfo.classList.remove('info-swap');
    void kernelInfo.offsetWidth;
    kernelInfo.classList.add('info-swap');
  }

  function renderSettings() {
    settingsPanel.innerHTML = '';
    var schema = current ? current.params : [];
    if (!schema || !schema.length) {
      settingsPanel.hidden = true;
      return;
    }
    settingsPanel.hidden = false;

    var head = document.createElement('div');
    head.className = 'settings-head';
    head.textContent = t('settings');
    settingsPanel.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'settings-grid';

    schema.forEach(function (s) {
      var row = document.createElement('label');
      row.className = 'setting-item';

      var nameSpan = document.createElement('span');
      nameSpan.className = 'setting-name';
      nameSpan.textContent = M.localized(s.label, currentLang) || s.name;
      row.appendChild(nameSpan);

      var control;
      if (s.type === 'select') {
        control = document.createElement('select');
        (s.options || []).forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          control.appendChild(o);
        });
        control.value = currentParams[s.name] != null ? currentParams[s.name] : s.default;
        control.addEventListener('change', function () { currentParams[s.name] = control.value; });
      } else if (s.type === 'boolean') {
        control = document.createElement('input');
        control.type = 'checkbox';
        control.checked = !!(currentParams[s.name] != null ? currentParams[s.name] : s.default);
        control.addEventListener('change', function () { currentParams[s.name] = control.checked; });
      } else if (s.type === 'number') {
        control = document.createElement('input');
        control.type = 'number';
        control.value = currentParams[s.name] != null ? currentParams[s.name] : s.default;
        control.addEventListener('input', function () { currentParams[s.name] = Number(control.value); });
      } else {
        control = document.createElement('input');
        control.type = 'text';
        control.placeholder = M.localized(s.placeholder, currentLang);
        control.value = currentParams[s.name] != null ? currentParams[s.name] : (s.default || '');
        control.addEventListener('input', function () { currentParams[s.name] = control.value; });
      }
      control.className = 'setting-control';
      row.appendChild(control);

      var descText = M.localized(s.description, currentLang);
      if (descText) {
        var desc = document.createElement('span');
        desc.className = 'setting-desc';
        desc.textContent = descText;
        row.appendChild(desc);
      }

      grid.appendChild(row);
    });

    settingsPanel.appendChild(grid);
  }

  /* ---------------- 选择内核 ---------------- */
  function applyKernel(kernel, key) {
    current = kernel;
    currentKey = key;
    currentParams = M.paramsToDefaults(kernel.params);
    renderTabs();
    renderInfo();
    renderSettings();
  }
  function selectBuiltin(i) { applyKernel(builtin[i], 'builtin:' + i); }
  function selectUploaded(i) { applyKernel(uploaded[i], 'uploaded:' + i); }
  function removeUploaded(i) {
    uploaded.splice(i, 1);
    if (currentKey === 'uploaded:' + i) {
      applyKernel(builtin[0], 'builtin:0');
    } else if (currentKey.indexOf('uploaded:') === 0) {
      var idx = +currentKey.split(':')[1];
      if (idx > i) currentKey = 'uploaded:' + (idx - 1);
      renderTabs();
    } else {
      renderTabs();
    }
  }

  /* ---------------- 上传内核 ---------------- */
  uploadBtn.addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var kernel = M.compileKernel(String(reader.result));
        uploaded.push(kernel);
        applyKernel(kernel, 'uploaded:' + (uploaded.length - 1));
        clearError();
      } catch (e) {
        showError(t('kernelLoadFailed') + e.message);
      }
    };
    reader.onerror = function () {
      showError(t('readFileFailed'));
    };
    reader.readAsText(file, 'utf-8');
  });

  /* ---------------- 下载内核 ---------------- */
  downloadBtn.addEventListener('click', function () {
    if (!current) return;
    var json = M.kernelToJSON(current);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (M.localized(current.name, 'zh') || 'kernel') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  /* ---------------- 转换 ---------------- */
  function runConvert(fn, input, output) {
    clearError();
    try {
      output.value = fn(input.value, currentParams);
      output.classList.remove('meow-flash');
      void output.offsetWidth;
      output.classList.add('meow-flash');
    } catch (e) {
      showError(t('transformFailed') + e.message);
    }
  }

  toMeow.addEventListener('click', function () {
    if (!current) return;
    runConvert(current.encode, humanInput, meowInput);
  });
  toHuman.addEventListener('click', function () {
    if (!current) return;
    runConvert(current.decode, meowInput, humanInput);
  });

  /* ---------------- 复制 ---------------- */
  function copyText(textarea, btn) {
    var text = textarea.value;
    if (!text) return;
    function done() {
      btn.textContent = t('copied');
      setTimeout(function () { btn.textContent = t('copy'); }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else {
      fallback();
    }
    function fallback() {
      textarea.select();
      document.execCommand('copy');
      done();
    }
  }
  copyHuman.addEventListener('click', function () { copyText(humanInput, copyHuman); });
  copyMeow.addEventListener('click', function () { copyText(meowInput, copyMeow); });

  /* ---------------- 语言切换 ---------------- */
  document.getElementById('lang-zh').addEventListener('click', function () { applyLanguage('zh'); });
  document.getElementById('lang-en').addEventListener('click', function () { applyLanguage('en'); });

  /* ---------------- 初始化 ---------------- */
  applyLanguage(currentLang);

  M.loadBuiltinKernels().then(function (kernels) {
    builtin = kernels;
    if (builtin.length) {
      clearError();
      applyKernel(builtin[0], 'builtin:0');
      try {
        var pending = localStorage.getItem('pending-kernel');
        if (pending) {
          localStorage.removeItem('pending-kernel');
          var pk = M.compileKernel(pending);
          uploaded.push(pk);
          applyKernel(pk, 'uploaded:' + (uploaded.length - 1));
        }
      } catch (e) { /* ignore */ }
    } else {
      showError(t('noBuiltinKernels'));
    }
  }).catch(function (e) {
    showError(t('builtinLoadFailed') + '（' + e.message + '）。' + t('builtinLoadHint'));
  });

})();
