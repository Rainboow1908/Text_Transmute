(function () {
  'use strict';

  var M = window.MiaoKernels;

  /* ---------------- DOM ---------------- */
  var builtinTabs = document.getElementById('builtin-tabs');
  var uploadedTabs = document.getElementById('uploaded-tabs');
  var uploadedLabel = document.getElementById('uploaded-label');
  var kernelInfo = document.getElementById('kernel-info');
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
  var uploaded = [];              // 用户上传的内核
  var current = null;             // 当前内核对象
  var currentKey = 'builtin:0';   // 标识当前内核来源与索引

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
    M.builtinKernels.forEach(function (k, i) {
      var key = 'builtin:' + i;
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'tab' + (key === currentKey ? ' active' : '');
      el.textContent = k.name;
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
      name.textContent = k.name;
      el.appendChild(name);
      var del = document.createElement('span');
      del.className = 'del';
      del.textContent = '×';
      del.title = '移除该内核';
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
    var meta = [current.version && ('v' + current.version), current.author]
      .filter(Boolean).join(' · ');
    kernelInfo.innerHTML =
      '<div><b>' + escapeHtml(current.name) + '</b>' +
      (meta ? ' <span class="meta">' + escapeHtml(meta) + '</span>' : '') + '</div>' +
      '<div class="meta">' + escapeHtml(current.description || '（无描述）') + '</div>';
    kernelInfo.classList.remove('info-swap');
    void kernelInfo.offsetWidth;
    kernelInfo.classList.add('info-swap');
  }

  /* ---------------- 选择内核 ---------------- */
  function selectBuiltin(i) {
    current = M.builtinKernels[i];
    currentKey = 'builtin:' + i;
    renderTabs();
    renderInfo();
  }
  function selectUploaded(i) {
    current = uploaded[i];
    currentKey = 'uploaded:' + i;
    renderTabs();
    renderInfo();
  }
  function removeUploaded(i) {
    uploaded.splice(i, 1);
    if (currentKey === 'uploaded:' + i) {
      selectBuiltin(0);
    } else if (currentKey.indexOf('uploaded:') === 0) {
      var idx = +currentKey.split(':')[1];
      if (idx > i) currentKey = 'uploaded:' + (idx - 1);
    }
    renderTabs();
    renderInfo();
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
        current = kernel;
        currentKey = 'uploaded:' + (uploaded.length - 1);
        clearError();
        renderTabs();
        renderInfo();
      } catch (e) {
        showError('内核加载失败：' + e.message);
      }
    };
    reader.onerror = function () {
      showError('读取文件失败。');
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
    a.download = (current.name || 'kernel') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  /* ---------------- 转换 ---------------- */
  function runConvert(fn, input, output) {
    clearError();
    try {
      output.value = fn(input.value);
      output.classList.remove('meow-flash');
      void output.offsetWidth; // 重新触发动画
      output.classList.add('meow-flash');
    } catch (e) {
      showError('转换失败：' + e.message);
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
      var old = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = old; }, 1200);
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

  /* ---------------- 初始化 ---------------- */
  selectBuiltin(0);
})();
