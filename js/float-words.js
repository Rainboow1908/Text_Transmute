// 背景浮动字（按权重随机词）——供所有页面共用
// 用法：window.FloatWords.start('zh' | 'en')
(function (root) {
  'use strict';

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

  var floatGeneration = 0;

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

  function spawnFloat(delay, gen, lang) {
    var el = document.createElement('span');
    el.className = 'float-meow';
    el.style.left = (5 + Math.random() * 85) + '%';
    el.style.top = (5 + Math.random() * 85) + '%';
    if (delay) el.style.animationDelay = delay + 's';
    el.textContent = pickFloatWord(FLOAT_WORDS[lang] || FLOAT_WORDS.zh);
    document.body.appendChild(el);
    el.addEventListener('animationend', function () {
      el.remove();
      setTimeout(function () {
        if (gen === floatGeneration) spawnFloat(0, gen, lang);
      }, 6000);
    });
  }

  function start(lang) {
    floatGeneration++;
    var gen = floatGeneration;
    document.querySelectorAll('.float-meow').forEach(function (el) { el.remove(); });
    var delays = [0, 1.7, 3.3];
    for (var i = 0; i < delays.length; i++) {
      spawnFloat(delays[i], gen, lang);
    }
  }

  root.FloatWords = { start: start };
})(window);
