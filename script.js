(function () {
  var FILES = [
    { id: 'setup',        nav: 'Guide', title: '1. Laravel & Nginx setup (bare metal)', path: 'nginx-laravel-setup/laravel-nginx-setup.md', type: 'md'   },
    { id: 'env',          nav: 'Guide', title: 'Environment file',                 path: 'support/envsample.md',         type: 'code', lang: '.env', secret: true },

    { id: 'docker-readme',      nav: 'Docker', title: 'README (local dev)',            path: 'docker-setup/README.md',              type: 'md'   },
    { id: 'docker-ec2',         nav: 'Docker', title: 'EC2 + RDS deploy guide',        path: 'docker-setup/ec2-deploy.md',          type: 'md'   },
    { id: 'docker-dockerfile',  nav: 'Docker', title: 'Dockerfile',                    path: 'docker-setup/Dockerfile',             type: 'code', lang: 'dockerfile' },
    { id: 'docker-compose-dev', nav: 'Docker', title: 'docker-compose.yml (dev)',       path: 'docker-setup/docker-compose.yml',     type: 'code', lang: 'yaml' },
    { id: 'docker-compose-prod',nav: 'Docker', title: 'docker-compose.prod.yml (EC2)',  path: 'docker-setup/docker-compose.prod.yml',type: 'code', lang: 'yaml' },
    { id: 'docker-nginx',       nav: 'Docker', title: 'Nginx (container)',             path: 'docker-setup/nginx/default.conf',     type: 'code', lang: 'nginx' },
    { id: 'docker-php-ini',     nav: 'Docker', title: 'PHP overrides',                 path: 'docker-setup/php/local.ini',          type: 'code', lang: 'ini' },
    { id: 'docker-env-dev',     nav: 'Docker', title: '.env.docker.example',           path: 'docker-setup/.env.docker.example',    type: 'code', lang: '.env' },
    { id: 'docker-env-ec2',     nav: 'Docker', title: '.env.ec2.example',              path: 'docker-setup/.env.ec2.example',       type: 'code', lang: '.env' },

    { id: 'mysql',        nav: 'Reference', title: '3. MySQL command reference',   path: 'phpscript.md',                 type: 'md'   },
    { id: 'commands',     nav: 'Reference', title: '4. Ubuntu & Git command reference', path: 'ubontoscirpt.md',        type: 'md'   },
    { id: 'terraform',    nav: 'Reference', title: '5. Terraform remote state backend (S3 + DynamoDB)', path: 'terraform.md', type: 'md' }
  ];
  var POLL_MS = 1500;
  var cache = {};

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inline(s) {
    var t = escapeHtml(s);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t;
  }

  function renderCodeBlock(lang, code) {
    var safe = escapeHtml(code).split('\n').map(function (line) {
      return /^\s*(#|--)/.test(line) ? '<span class="c-comment">' + line + '</span>' : line;
    }).join('\n');
    return '<div class="code-block"><div class="code-block-head"><span>' + (lang || 'text') +
      '</span><button class="copy-btn" type="button">Copy</button></div><pre><code>' + safe + '</code></pre></div>';
  }

  function renderTable(rows) {
    function parseRow(r) { return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); }
    var header = parseRow(rows[0]);
    var body = rows.slice(2).map(parseRow);
    var h = '<div class="table-wrap"><table><thead><tr>' + header.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    body.forEach(function (r) { h += '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; });
    h += '</tbody></table></div>';
    return h;
  }

  function slugify(s, idPrefix, used) {
    var base = idPrefix + '-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    var id = base, n = 2;
    while (used[id]) { id = base + '-' + n; n++; }
    used[id] = true;
    return id;
  }

  function parseMarkdown(md, idPrefix, headings) {
    var usedIds = {};
    var blocks = [];
    var text = md.replace(/```(\w*)\n([\s\S]*?)```/g, function (m, lang, code) {
      blocks.push({ lang: lang, code: code.replace(/\n$/, '') });
      return ' CB' + (blocks.length - 1) + ' ';
    });

    var lines = text.split('\n');
    var html = '', i = 0, list = null, table = null;

    function flushList() {
      if (list) {
        var tag = list.type;
        html += '<' + tag + '>' + list.items.map(function (it) { return '<li>' + inline(it) + '</li>'; }).join('') + '</' + tag + '>';
        list = null;
      }
    }
    function flushTable() { if (table) { html += renderTable(table); table = null; } }

    while (i < lines.length) {
      var line = lines[i];
      var cbMatch = line.trim().match(/^CB(\d+)$/);

      if (cbMatch) {
        flushList(); flushTable();
        var b = blocks[parseInt(cbMatch[1], 10)];
        html += renderCodeBlock(b.lang, b.code);
        i++; continue;
      }
      if (line.trim() === '') { flushList(); flushTable(); i++; continue; }

      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushList(); flushTable();
        var level = h[1].length;
        if (level === 2 && headings) {
          var hid = slugify(h[2], idPrefix, usedIds);
          headings.push({ id: hid, text: h[2] });
          html += '<h2 id="' + hid + '">' + inline(h[2]) + '</h2>';
        } else {
          html += '<h' + level + '>' + inline(h[2]) + '</h' + level + '>';
        }
        i++; continue;
      }
      if (/^>\s?/.test(line)) {
        flushList(); flushTable();
        var bq = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { bq.push(lines[i].replace(/^>\s?/, '')); i++; }
        html += '<blockquote>' + bq.map(inline).join('<br>') + '</blockquote>';
        continue;
      }
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) { flushList(); flushTable(); html += '<hr>'; i++; continue; }
      if (/^\s*[-*]\s+/.test(line)) {
        flushTable();
        if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
        list.items.push(line.replace(/^\s*[-*]\s+/, ''));
        i++; continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        flushTable();
        if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
        list.items.push(line.replace(/^\s*\d+\.\s+/, ''));
        i++; continue;
      }
      if (/^\|.*\|\s*$/.test(line.trim())) {
        flushList();
        if (!table) table = [];
        table.push(line.trim());
        i++; continue;
      }

      flushList(); flushTable();
      var para = [line]; i++;
      while (i < lines.length && lines[i].trim() !== '' &&
             !/^#{1,6}\s/.test(lines[i]) && !/^CB\d+$/.test(lines[i].trim()) &&
             !/^>\s?/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) &&
             !/^\s*\d+\.\s+/.test(lines[i]) && !/^\|.*\|\s*$/.test(lines[i].trim())) {
        para.push(lines[i]); i++;
      }
      html += '<p>' + para.map(inline).join(' ') + '</p>';
    }
    flushList(); flushTable();
    return html;
  }

  function buildShell() {
    var navContainers = {};
    document.querySelectorAll('.nav-group ul[data-nav]').forEach(function (ul) {
      navContainers[ul.dataset.nav] = ul;
    });
    var sections = document.getElementById('sections');

    FILES.forEach(function (f) {
      var li = document.createElement('li');
      li.innerHTML = '<a href="#' + f.id + '">' + f.title + '</a>' +
        (f.type === 'md' ? '<ul class="nav-sub" id="navsub-' + f.id + '"></ul>' : '');
      navContainers[f.nav].appendChild(li);

      var sec = document.createElement('section');
      sec.className = 'doc-section wide';
      sec.id = f.id;
      sec.innerHTML =
        '<h2 class="section-title">' + f.title + '<span class="source-path">' + f.path + '</span></h2>' +
        '<p class="section-updated" id="updated-' + f.id + '">waiting for first read…</p>' +
        (f.secret ? '<div class="secret-banner">⚠ Contains real credentials — treat this file as a secret, not a template.</div>' : '') +
        '<div class="md-body" id="body-' + f.id + '"><p class="placeholder">Loading…</p></div>';
      sections.appendChild(sec);
    });
  }

  function renderInto(f, raw) {
    var body = document.getElementById('body-' + f.id);
    if (f.type === 'md') {
      var headings = [];
      body.innerHTML = parseMarkdown(raw, f.id, headings);
      var subUl = document.getElementById('navsub-' + f.id);
      if (subUl) {
        subUl.innerHTML = headings.map(function (h) {
          return '<li><a href="#' + h.id + '">' + h.text + '</a></li>';
        }).join('');
      }
    } else {
      body.innerHTML = renderCodeBlock(f.lang, raw);
    }
    document.getElementById('updated-' + f.id).textContent = 'synced ' + new Date().toLocaleTimeString();

    var sec = document.getElementById(f.id);
    sec.classList.add('flash');
    setTimeout(function () { sec.classList.remove('flash'); }, 700);
  }

  function setBadge(state) {
    var badge = document.getElementById('syncBadge');
    var text = document.getElementById('syncText');
    badge.className = 'sync-badge ' + state;
    text.textContent = state === 'live' ? 'live — checked ' + new Date().toLocaleTimeString()
      : state === 'offline' ? 'offline' : 'connecting…';
    document.getElementById('staleBanner').classList.toggle('show', state === 'offline');
  }

  var didInitialScroll = false;

  function poll() {
    var results = FILES.map(function (f) {
      return fetch(encodeURI(f.path) + '?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (text) {
          if (cache[f.id] !== text) {
            cache[f.id] = text;
            renderInto(f, text);
          }
          return true;
        });
    });
    Promise.all(results).then(function () {
      setBadge('live');
      if (!didInitialScroll && location.hash) {
        didInitialScroll = true;
        var target = document.querySelector(location.hash);
        if (target) target.scrollIntoView();
      }
    }).catch(function () { setBadge('offline'); });
  }

  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('copy-btn')) {
      var pre = e.target.closest('.code-block').querySelector('pre');
      navigator.clipboard.writeText(pre.textContent).then(function () {
        var orig = e.target.textContent;
        e.target.textContent = 'Copied';
        setTimeout(function () { e.target.textContent = orig; }, 1400);
      });
    }
  });

  buildShell();
  poll();
  setInterval(poll, POLL_MS);

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-group a'));
  var obsSections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && obsSections.length) {
    var map = new Map();
    navLinks.forEach(function (a, idx) { map.set(obsSections[idx], a); });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map.get(entry.target);
        if (link && entry.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.remove('active'); });
          link.classList.add('active');
          var details = link.closest('details');
          if (details) details.open = true;
        }
      });
    }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 });
    obsSections.forEach(function (s) { spy.observe(s); });
  }
})();
