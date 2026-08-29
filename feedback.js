(function () {
  'use strict';

  // Extract slug from URL: /posts/099-foo/ → "099-foo"
  function getSlug() {
    var parts = window.location.pathname.replace(/\/the-third-thing/, '').split('/').filter(Boolean);
    // expect: ["posts", "099-foo"]
    if (parts[0] === 'posts' && parts[1]) return parts[1].replace('.html', '');
    return null;
  }

  var TAGS = [
    { id: 'pesadelo',       label: '🌑 pesadelo' },
    { id: 'sonho-bom',      label: '✨ sonho bom' },
    { id: 'lucido',         label: '🔮 lúcido' },
    { id: 'terror',         label: '🕷 terror' },
    { id: 'poetico',        label: '🌊 poético' },
    { id: 'muito-criativo', label: '🎨 muito criativo' },
    { id: 'inspirador',     label: '⚡ inspirador' },
    { id: 'muito-bom',      label: '★ muito bom' },
    { id: 'quero-mais',     label: '↩ quero mais' },
    { id: 'tecnico-demais', label: '🔩 técnico demais' },
  ];

  function sparkBar(val) {
    // val: -5 to +5 integer. Renders ASCII bar.
    var clamped = Math.max(-5, Math.min(5, val));
    var label = [
      '☠ pesadelo puro', '⚫ sombrio', '🌧 pesado', '🌫 denso', '🌒 inquieto',
      '◯ neutro',
      '🌓 agitado', '🌤 esperançoso', '⚡ vivo', '✨ luminoso', '☀ sonho puro'
    ][clamped + 5];
    var neg = Math.max(0, -clamped);
    var pos = Math.max(0, clamped);
    var bar = '─'.repeat(5 - neg) + (clamped < 0 ? '●' : '') + '─'.repeat(neg === 0 && pos === 0 ? 0 : 0);
    // Build: ●────  ─────  ─────●
    var left  = (clamped < 0 ? '●' : '·') + '─'.repeat(5 + clamped);
    var right = '─'.repeat(5 - clamped) + (clamped > 0 ? '●' : '·');
    // Simpler compact version:
    var dots = [];
    for (var i = -5; i <= 5; i++) {
      dots.push(i === clamped ? '●' : '─');
    }
    return dots.join('') + '  ' + (clamped > 0 ? '+' : '') + clamped + '  ' + label;
  }

  function storageKey(slug) { return 'ttt_voted_' + slug; }

  function getVoted(slug) {
    try {
      var raw = localStorage.getItem(storageKey(slug));
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function setVoted(slug, tags) {
    try { localStorage.setItem(storageKey(slug), JSON.stringify(tags)); } catch(e) {}
  }

  function render(slug, serverData) {
    var article = document.querySelector('article') || document.querySelector('main');
    if (!article) return;

    var alreadyVoted = getVoted(slug);
    var selected = alreadyVoted ? alreadyVoted.slice() : [];

    // Brian's Spark
    var sparkVal = parseInt(article.getAttribute('data-brian-spark'), 10);
    var hasSpark = !isNaN(sparkVal);

    var wrap = document.createElement('div');
    wrap.id = 'ttt-feedback';
    wrap.style.cssText = [
      'margin-top:3rem',
      'padding-top:1.5rem',
      'border-top:1px solid #333',
      'font-family:"Courier New",monospace',
      'font-size:0.8rem',
      'color:#888',
    ].join(';');

    // Brian's Spark section
    if (hasSpark) {
      var sparkDiv = document.createElement('div');
      sparkDiv.style.cssText = 'margin-bottom:1.2rem';
      sparkDiv.innerHTML =
        '<span style="color:#555;letter-spacing:.05em">BRIAN SPARK</span><br>' +
        '<span style="color:#6eb5ff;letter-spacing:.05em">' + sparkBar(sparkVal) + '</span>';
      wrap.appendChild(sparkDiv);
    }

    // Separator
    var sep = document.createElement('div');
    sep.style.cssText = 'margin-bottom:1rem;color:#444';
    sep.textContent = '─'.repeat(40);
    wrap.appendChild(sep);

    // Tags label
    var label = document.createElement('div');
    label.style.cssText = 'margin-bottom:0.7rem;color:#555;letter-spacing:.05em';
    label.textContent = alreadyVoted ? 'SUA LEITURA' : 'COMO VOCÊ LEU?';
    wrap.appendChild(label);

    // Tag buttons
    var tagsDiv = document.createElement('div');
    tagsDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1rem';

    var buttons = {};

    TAGS.forEach(function (tag) {
      var btn = document.createElement('button');
      btn.textContent = tag.label;
      btn.dataset.tagId = tag.id;
      btn.style.cssText = [
        'background:none',
        'border:1px solid #444',
        'color:#888',
        'font-family:"Courier New",monospace',
        'font-size:0.75rem',
        'padding:0.3rem 0.6rem',
        'cursor:pointer',
        'transition:all 0.15s',
        'border-radius:0',
      ].join(';');

      var isActive = selected.indexOf(tag.id) !== -1;
      if (isActive) applyActive(btn);

      if (alreadyVoted) {
        btn.disabled = true;
        btn.style.cursor = 'default';
        btn.style.opacity = isActive ? '1' : '0.35';
      } else {
        btn.addEventListener('mouseenter', function () {
          if (selected.indexOf(tag.id) === -1) btn.style.borderColor = '#6eb5ff';
        });
        btn.addEventListener('mouseleave', function () {
          if (selected.indexOf(tag.id) === -1) btn.style.borderColor = '#444';
        });
        btn.addEventListener('click', function () {
          var idx = selected.indexOf(tag.id);
          if (idx === -1) {
            selected.push(tag.id);
            applyActive(btn);
          } else {
            selected.splice(idx, 1);
            applyInactive(btn);
          }
          updateSubmit();
        });
      }

      buttons[tag.id] = btn;
      tagsDiv.appendChild(btn);
    });

    wrap.appendChild(tagsDiv);

    // Counts (from server)
    if (serverData && serverData.tags) {
      var countsDiv = document.createElement('div');
      countsDiv.id = 'ttt-counts';
      countsDiv.style.cssText = 'margin-bottom:1rem;color:#555;font-size:0.7rem;line-height:1.9';
      renderCounts(countsDiv, serverData.tags);
      wrap.appendChild(countsDiv);
    } else {
      var countsDiv = document.createElement('div');
      countsDiv.id = 'ttt-counts';
      countsDiv.style.cssText = 'margin-bottom:1rem;color:#555;font-size:0.7rem;line-height:1.9';
      wrap.appendChild(countsDiv);
    }

    // Submit button
    var submitBtn = document.createElement('button');
    submitBtn.textContent = '→ registrar leitura';
    submitBtn.id = 'ttt-submit';
    submitBtn.style.cssText = [
      'background:none',
      'border:1px solid #555',
      'color:#555',
      'font-family:"Courier New",monospace',
      'font-size:0.75rem',
      'padding:0.3rem 0.8rem',
      'cursor:pointer',
      'opacity:0.4',
    ].join(';');
    submitBtn.disabled = true;

    if (!alreadyVoted) {
      submitBtn.addEventListener('click', function () {
        if (selected.length === 0) return;
        submitBtn.disabled = true;
        submitBtn.textContent = '...';

        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: slug, tags: selected }),
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          setVoted(slug, selected);
          submitBtn.textContent = '✓ registrado';
          label.textContent = 'SUA LEITURA';
          TAGS.forEach(function (tag) {
            var btn = buttons[tag.id];
            btn.disabled = true;
            btn.style.cursor = 'default';
            if (selected.indexOf(tag.id) === -1) btn.style.opacity = '0.35';
          });
          var cd = document.getElementById('ttt-counts');
          if (cd && data.tags) renderCounts(cd, data.tags);
        })
        .catch(function () {
          submitBtn.textContent = '→ registrar leitura';
          submitBtn.disabled = false;
        });
      });
      wrap.appendChild(submitBtn);
    }

    function updateSubmit() {
      if (selected.length > 0) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.color = '#6eb5ff';
        submitBtn.style.borderColor = '#6eb5ff';
      } else {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.4';
        submitBtn.style.color = '#555';
        submitBtn.style.borderColor = '#555';
      }
    }

    article.parentNode.insertBefore(wrap, article.nextSibling);
  }

  function applyActive(btn) {
    btn.style.borderColor = '#6eb5ff';
    btn.style.color = '#6eb5ff';
    btn.style.background = 'rgba(110,181,255,0.08)';
  }

  function applyInactive(btn) {
    btn.style.borderColor = '#444';
    btn.style.color = '#888';
    btn.style.background = 'none';
  }

  function renderCounts(el, tags) {
    var lines = [];
    var sorted = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; });
    sorted.forEach(function (id) {
      var n = tags[id];
      if (n <= 0) return;
      var tagObj = TAGS.find(function (t) { return t.id === id; });
      var lbl = tagObj ? tagObj.label : id;
      lines.push(lbl + ' <span style="color:#444">×</span> <span style="color:#6eb5ff">' + n + '</span>');
    });
    el.innerHTML = lines.length ? lines.join('<br>') : '';
  }

  function init() {
    var slug = getSlug();
    if (!slug) return;

    // Only activate on post pages
    if (window.location.pathname.indexOf('/posts/') === -1 &&
        window.location.pathname.indexOf('/the-third-thing/posts/') === -1) return;

    fetch('/api/feedback/' + encodeURIComponent(slug))
      .then(function (r) { return r.json(); })
      .then(function (data) { render(slug, data); })
      .catch(function () { render(slug, null); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
