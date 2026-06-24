/* 单页应用：底部 tab（问答/错题/复习/报告/我的）+ hash 路由。
   纯前端 vanilla JS，无构建步骤；改文件刷新即生效。 */
(function () {
  var TABS = [
    { id: 'home',    name: '问答', icon: '📷' },
    { id: 'book',    name: '课本', icon: '📚' },
    { id: 'mistakes',name: '错题', icon: '📕' },
    { id: 'review',  name: '复习', icon: '🔁' },
    { id: 'report',  name: '报告', icon: '📊' },
    { id: 'profile', name: '我的', icon: '👤' }
  ];

  var state = {
    tab: 'home',
    grade: 'g7',
    subjectId: 'math',
    images: [],          // {dataURL}
    analysis: null,      // 当前判题结果
    activeQ: 0,          // 作业帮式选中题号
    busy: false,
    chat: [],            // 追问对话 [{role,content}]
    chatBusy: false,
    bookSubject: null,   // 课本重点：当前科目
    bookChap: -1         // 课本重点：展开的章节（-1=全收起）
  };

  var $app = function () { return document.getElementById('app'); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function statusMark(s) { return s === 'correct' ? '✓' : s === 'wrong' ? '✗' : '?'; }

  function start() {
    state.grade = Store.getSettings().grade || 'g7';
    renderTabbar();
    go(location.hash.replace('#', '') || 'home');
    window.addEventListener('hashchange', function () {
      go(location.hash.replace('#', '') || 'home');
    });
  }

  function go(tab) {
    if (!TABS.some(function (t) { return t.id === tab; })) tab = 'home';
    state.tab = tab;
    if (location.hash !== '#' + tab) location.hash = tab;
    render();
    renderTabbar();
    window.scrollTo(0, 0);
  }

  function renderTabbar() {
    document.getElementById('tabbar').innerHTML = TABS.map(function (t) {
      return '<button class="tab' + (state.tab === t.id ? ' on' : '') + '" data-tab="' + t.id + '">' +
        '<span class="ti">' + t.icon + '</span><span class="tn">' + t.name + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#tabbar .tab'), function (b) {
      b.onclick = function () { go(b.getAttribute('data-tab')); };
    });
  }

  function render() {
    var v = { home: viewHome, book: viewBook, mistakes: viewMistakes, review: viewReview, report: viewReport, profile: viewProfile }[state.tab];
    $app().innerHTML = v();
    var bind = { home: bindHome, book: bindBook, mistakes: bindMistakes, review: bindReview, report: bindReport, profile: bindProfile }[state.tab];
    if (bind) bind();
  }

  /* ============ 课本重点速记 ============ */
  function viewBook() {
    var subjects = Data.subjectsForGrade(state.grade);
    if (!state.bookSubject || !subjects.some(function (s) { return s.id === state.bookSubject; })) {
      state.bookSubject = subjects[0] ? subjects[0].id : 'math';
    }
    var h = '<header class="hd"><h1>📚 课本重点</h1></header><div class="page">';
    // 年级
    h += '<div class="chips">' + Data.GRADES.map(function (g) {
      return '<button class="chip' + (state.grade === g.id ? ' on' : '') + '" data-bg="' + g.id + '">' + g.name + '</button>';
    }).join('') + '</div>';
    // 科目
    h += '<div class="chips">' + subjects.map(function (s) {
      var has = Digest.get(s.id, state.grade).length;
      return '<button class="chip' + (state.bookSubject === s.id ? ' on' : '') + '" data-bs="' + s.id + '">' + s.icon + ' ' + s.name + (has ? '' : '·待补') + '</button>';
    }).join('') + '</div>';
    // 内容
    var list = Digest.get(state.bookSubject, state.grade);
    if (!list.length) {
      h += empty('「' + Data.getSubject(state.bookSubject).name + '·' + Data.getGradeName(state.grade) + '」的重点速记还在整理中，稍后补上。');
      return h + '</div>';
    }
    var curVol = '';
    list.forEach(function (c, i) {
      if (c.volume && c.volume !== curVol) { curVol = c.volume; h += '<div class="vol">' + esc(curVol) + '</div>'; }
      h += '<div class="card chap"><div class="chaphd" data-ch="' + i + '"><b>' + esc(c.chapter) + '</b><span class="arrow">' + (state.bookChap === i ? '▴' : '▾') + '</span></div>';
      h += '<ul class="keys' + (state.bookChap === i ? '' : ' hidden') + '" data-keys="' + i + '">' +
        c.keys.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>';
    });
    return h + '</div>';
  }

  function bindBook() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-bg]'), function (b) {
      b.onclick = function () { state.grade = b.getAttribute('data-bg'); Store.saveSettings({ grade: state.grade }); state.bookSubject = null; state.bookChap = -1; render(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-bs]'), function (b) {
      b.onclick = function () { state.bookSubject = b.getAttribute('data-bs'); state.bookChap = -1; render(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ch]'), function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-ch');
        state.bookChap = (state.bookChap === i) ? -1 : i;
        render();
      };
    });
  }

  /* 可选 AI 模型（判题/答疑共用此选择） */
  var MODELS = [
    { id: 'claude', name: 'Claude', tip: '最强' },
    { id: 'glm', name: '智谱', tip: '视觉' },
    { id: 'deepseek', name: 'DeepSeek', tip: '仅答疑' }
  ];
  function renderModelPicker() {
    var cur = Store.getSettings().model || 'claude';
    var h = '<div class="modelrow"><span class="mlbl">模型</span><div class="chips sm">';
    h += MODELS.map(function (m) {
      return '<button class="chip' + (cur === m.id ? ' on' : '') + '" data-model="' + m.id + '">' + m.name +
        '<i>' + m.tip + '</i></button>';
    }).join('');
    h += '</div></div>';
    return h;
  }
  function bindModelPicker() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-model]'), function (b) {
      b.onclick = function () { Store.saveSettings({ model: b.getAttribute('data-model') }); render(); };
    });
  }

  /* ============ 问答（拍照判题 + 追问） ============ */
  function viewHome() {
    var html = '<header class="hd"><h1>📷 作业分析</h1><span class="grade-pill" id="gradePill">' + Data.getGradeName(state.grade) + ' ▾</span></header>';
    html += '<div class="page">';

    // 上传区（科目由 AI 自动识别，无需手选；可拍照判题，也可只输入文字分析）
    html += '<div class="card upload">';
    html += '<p class="hint" style="margin:0 0 8px">拍作业 → 自动判题；或直接输入问题/题目 → AI 分析解答（拍照可选）</p>';
    html += renderModelPicker();
    html += '<div class="thumbs">' + state.images.map(function (im, i) {
      return '<div class="thumb"><img src="' + im.dataURL + '"/><span class="del" data-del="' + i + '">×</span></div>';
    }).join('') + '<label class="addimg"><input type="file" accept="image/*" capture="environment" id="fileIn" multiple hidden/>＋拍/选（选填）</label></div>';
    html += '<textarea id="qText" class="qtext" rows="1" placeholder="输入要分析的问题或题目；拍了照可补充说明"></textarea>';
    html += '<button class="btn primary block" id="analyzeBtn"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? '分析中…' : '开始分析') + '</button>';
    if (Api.mode() === 'mock') html += '<p class="hint">当前为本地示例模式。接入 AI 后端后即真实分析（我的 → 后端地址）。</p>';
    html += '</div>';

    // 判题结果（作业帮式，仅拍照判题时有）
    if (state.analysis) html += renderResult(state.analysis);
    // 对话/解答区（拍照后可追问；纯文字分析时即问答）
    if (state.analysis || state.chat.length) html += renderChat();

    html += '</div>';
    return html;
  }

  function renderChat() {
    var title = state.analysis ? '💬 问 AI 老师<span class="sub">（针对这张卷子追问）</span>' : '💬 AI 解答<span class="sub">（可继续追问）</span>';
    var h = '<div class="card chat"><h3>' + title + '</h3>';
    h += '<div class="msgs">';
    if (!state.chat.length) h += '<p class="hint">例如：第2题为什么错？这个知识点还能怎么考？</p>';
    state.chat.forEach(function (m) {
      h += '<div class="msg ' + m.role + '">' + esc(m.content).replace(/\n/g, '<br>') + '</div>';
    });
    if (state.chatBusy) h += '<div class="msg assistant typing">老师思考中…</div>';
    h += '</div>';
    h += '<div class="askbar"><textarea id="askText" rows="1" placeholder="输入问题…"></textarea><button class="btn primary sm" id="askBtn"' + (state.chatBusy ? ' disabled' : '') + '>问</button></div>';
    h += '</div>';
    return h;
  }

  function renderResult(a) {
    var s = a.summary;
    var h = '<div class="card result">';
    h += '<div class="sumbar"><b>' + esc(a.subjectName) + '</b> · 共' + s.total + '题 · <span class="bad">错' + s.wrong + '</span> · <span class="warn">存疑' + s.warning + '</span> · 得分率' + s.scoreRate + '%</div>';
    if (s.suggestion) h += '<div class="suggest">💡 ' + esc(s.suggestion) + '</div>';
    // 题号 tab
    h += '<div class="qnums">' + a.questions.map(function (q, i) {
      return '<button class="qnum ' + q.status + (i === state.activeQ ? ' on' : '') + '" data-q="' + i + '">' + (i + 1) + ' ' + statusMark(q.status) + '</button>';
    }).join('') + '</div>';
    var q = a.questions[state.activeQ] || a.questions[0];
    if (q) {
      h += '<div class="qdetail">';
      if (a.images && a.images.length) h += '<img class="paper" src="' + a.images[0].dataURL + '" data-zoom/>';
      h += '<div class="qbody">';
      h += '<div class="qline"><span class="badge ' + q.status + '">' + statusMark(q.status) + '</span> ' + esc(q.number) + '　' + esc(q.title) + '</div>';
      if (q.studentAnswer) h += '<p><b>作答：</b>' + esc(q.studentAnswer) + '</p>';
      if (q.correctAnswer) h += '<p><b>答案：</b>' + esc(q.correctAnswer) + '</p>';
      if (q.knowledgePoint) h += '<p><b>考点：</b>' + esc(q.knowledgePoint) + '</p>';
      if (q.explanation) h += '<p class="exp">' + esc(q.explanation) + '</p>';
      if (q.status !== 'correct') h += '<button class="btn ghost sm" data-addmk="' + state.activeQ + '">＋ 加入错题本</button>';
      h += '</div></div>';
    }
    h += '</div>';
    return h;
  }

  function bindHome() {
    document.getElementById('gradePill').onclick = function () {
      state.grade = Data.nextGrade(state.grade);
      Store.saveSettings({ grade: state.grade });
      render();
    };
    bindModelPicker();
    var fileIn = document.getElementById('fileIn');
    if (fileIn) fileIn.onchange = function () { readFiles(fileIn.files); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-del]'), function (x) {
      x.onclick = function () { state.images.splice(+x.getAttribute('data-del'), 1); render(); };
    });
    var ta = document.getElementById('qText');
    if (ta) autoGrow(ta);
    document.getElementById('analyzeBtn').onclick = doAnalyze;
    Array.prototype.forEach.call(document.querySelectorAll('.qnum'), function (b) {
      b.onclick = function () { state.activeQ = +b.getAttribute('data-q'); render(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-addmk]'), function (b) {
      b.onclick = function () { addToMistakes(+b.getAttribute('data-addmk')); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-zoom]'), function (img) {
      img.onclick = function () { zoom(img.src); };
    });
    var ask = document.getElementById('askText');
    if (ask) {
      autoGrow(ask);
      var msgs = document.querySelector('.chat .msgs');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
      document.getElementById('askBtn').onclick = sendAsk;
    }
  }

  function sendAsk() {
    var ta = document.getElementById('askText');
    var q = (ta.value || '').trim();
    if (!q || state.chatBusy) return;
    state.chat.push({ role: 'user', content: q });
    state.chatBusy = true; render();
    // 每条都附上卷图，让 GLM 始终能看着这张卷子答
    var msgs = state.chat.map(function (m) { return { role: m.role, content: m.content }; });
    var last = msgs[msgs.length - 1];
    if (state.analysis && state.analysis.images && state.analysis.images.length) {
      last.images = state.analysis.images.map(function (im) { return im.dataURL; });
    }
    Api.chat(msgs, state.grade, state.analysis ? state.analysis.subjectName : '').then(function (reply) {
      state.chat.push({ role: 'assistant', content: reply });
      state.chatBusy = false; render();
    }).catch(function (e) {
      state.chatBusy = false; render(); alert('答疑失败：' + e.message);
    });
  }

  function readFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      var r = new FileReader();
      r.onload = function () { state.images.push({ dataURL: r.result }); render(); };
      r.readAsDataURL(f);
    });
  }

  function doAnalyze() {
    var text = (((document.getElementById('qText') || {}).value) || '').trim();
    if (!state.images.length && !text) {
      alert('拍一张作业照片，或输入要分析的问题'); return;
    }
    if (state.images.length) {
      // 有图：作业帮式结构化判题
      state.busy = true; render();
      Api.analyzeHomework({
        grade: state.grade, images: state.images, question: text
      }).then(function (a) {
        Store.saveAnalysis(a);
        state.analysis = a; state.activeQ = 0; state.busy = false; state.chat = []; render();
      }).catch(function (e) {
        state.busy = false; render(); alert('分析失败：' + e.message);
      });
      return;
    }
    // 纯文字：直接让 AI 分析解答（走问答，无需拍照）
    state.analysis = null;
    state.chat = [{ role: 'user', content: text }];
    state.chatBusy = true; state.busy = false; render();
    Api.chat([{ role: 'user', content: text }], state.grade, '').then(function (reply) {
      state.chat.push({ role: 'assistant', content: reply });
      state.chatBusy = false; render();
    }).catch(function (e) {
      state.chatBusy = false; render(); alert('分析失败：' + e.message);
    });
  }

  function addToMistakes(i) {
    var a = state.analysis, q = a.questions[i];
    Store.addMistake({
      subjectId: a.subjectId, subjectName: a.subjectName, grade: a.grade,
      number: q.number, title: q.title, correctAnswer: q.correctAnswer,
      knowledgePoint: q.knowledgePoint, errorType: q.errorType, explanation: q.explanation,
      image: (a.images[0] || {}).dataURL || ''
    });
    toast('已加入错题本');
  }

  /* ============ 错题本 ============ */
  function viewMistakes() {
    var list = Store.getMistakes();
    var h = '<header class="hd"><h1>📕 错题本</h1></header><div class="page">';
    if (!list.length) { h += empty('还没有错题。判完题点「加入错题本」就会出现在这里。'); return h + '</div>'; }
    h += list.map(function (m) {
      return '<div class="card mk' + (m.mastered ? ' done' : '') + '">' +
        '<div class="mkhead"><span class="tag">' + esc(m.subjectName) + '</span> ' + esc(m.number || '') + ' ' + esc(m.title || '') +
        '<span class="spacer"></span><button class="lk" data-master="' + m.id + '">' + (m.mastered ? '已掌握↺' : '掌握✓') + '</button>' +
        '<button class="lk del" data-rm="' + m.id + '">删</button></div>' +
        (m.image ? '<img class="mkimg" src="' + m.image + '" data-zoom/>' : '') +
        (m.correctAnswer ? '<p><b>答案：</b>' + esc(m.correctAnswer) + '</p>' : '') +
        (m.explanation ? '<p class="exp">' + esc(m.explanation) + '</p>' : '') +
        '</div>';
    }).join('');
    return h + '</div>';
  }
  function bindMistakes() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-master]'), function (b) {
      b.onclick = function () { var id = b.getAttribute('data-master'); var m = Store.getMistakes().filter(function (x) { return x.id === id; })[0]; Store.updateMistake(id, { mastered: !m.mastered }); render(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-rm]'), function (b) {
      b.onclick = function () { if (confirm('删除这道错题？')) { Store.removeMistake(b.getAttribute('data-rm')); render(); } };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-zoom]'), function (img) { img.onclick = function () { zoom(img.src); }; });
  }

  /* ============ 复习（翻卡） ============ */
  function viewReview() {
    var list = Store.getMistakes().filter(function (m) { return !m.mastered; });
    var h = '<header class="hd"><h1>🔁 复习</h1></header><div class="page">';
    if (!list.length) { h += empty('没有待复习的错题。把错题标「掌握」后会从这里移走。'); return h + '</div>'; }
    h += '<p class="hint">共 ' + list.length + ' 道待复习。点卡片翻看答案。</p>';
    h += list.map(function (m, i) {
      return '<div class="card flip" data-flip="' + i + '">' +
        '<div class="front"><span class="tag">' + esc(m.subjectName) + '</span> ' + esc(m.title || m.number || '题目') + (m.image ? '<img class="mkimg" src="' + m.image + '"/>' : '') + '<p class="tap">👆 点击看答案</p></div>' +
        '<div class="back hidden">' + (m.correctAnswer ? '<p><b>答案：</b>' + esc(m.correctAnswer) + '</p>' : '') + (m.explanation ? '<p class="exp">' + esc(m.explanation) + '</p>' : '') + '<button class="btn ghost sm" data-master="' + m.id + '">我会了 ✓</button></div>' +
        '</div>';
    }).join('');
    return h + '</div>';
  }
  function bindReview() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-flip]'), function (c) {
      c.onclick = function (e) {
        if (e.target.getAttribute('data-master') != null) return;
        c.querySelector('.front').classList.toggle('hidden');
        c.querySelector('.back').classList.toggle('hidden');
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-master]'), function (b) {
      b.onclick = function (e) { e.stopPropagation(); Store.updateMistake(b.getAttribute('data-master'), { mastered: true }); render(); };
    });
  }

  /* ============ 报告 ============ */
  function viewReport() {
    var mk = Store.getMistakes(), an = Store.getAnalyses();
    var bySub = {};
    mk.forEach(function (m) { bySub[m.subjectName] = (bySub[m.subjectName] || 0) + 1; });
    var h = '<header class="hd"><h1>📊 学习报告</h1></header><div class="page">';
    h += '<div class="stats"><div class="stat"><b>' + an.length + '</b><span>判题次数</span></div>' +
      '<div class="stat"><b>' + mk.length + '</b><span>错题总数</span></div>' +
      '<div class="stat"><b>' + mk.filter(function (m) { return m.mastered; }).length + '</b><span>已掌握</span></div></div>';
    if (Object.keys(bySub).length) {
      h += '<div class="card"><h3>各科错题分布</h3>';
      var max = Math.max.apply(null, Object.keys(bySub).map(function (k) { return bySub[k]; }));
      Object.keys(bySub).forEach(function (k) {
        h += '<div class="bar"><span class="bl">' + esc(k) + '</span><span class="bt"><i style="width:' + Math.round(bySub[k] / max * 100) + '%"></i></span><span class="bn">' + bySub[k] + '</span></div>';
      });
      h += '</div>';
    } else { h += empty('还没有数据。多判几次题，这里会生成薄弱点分析。'); }
    return h + '</div>';
  }
  function bindReport() {}

  /* ============ 我的 ============ */
  function viewProfile() {
    var s = Store.getSettings();
    var h = '<header class="hd"><h1>👤 我的</h1></header><div class="page">';
    h += '<div class="card"><h3>年级</h3><div class="chips">' + Data.GRADES.map(function (g) {
      return '<button class="chip' + (state.grade === g.id ? ' on' : '') + '" data-g="' + g.id + '">' + g.name + '</button>';
    }).join('') + '</div></div>';
    h += '<div class="card"><h3>AI 后端地址</h3><p class="hint">填入 AI 代理地址后即真实判题/答疑；留空则用本地示例。密钥在后端，不进网页。</p>' +
      '<input id="backend" class="inp" placeholder="https://....workers.dev" value="' + esc(s.backendUrl || '') + '"/>' +
      '<button class="btn primary sm" id="saveBackend">保存</button></div>';
    h += '<div class="card"><h3>安装到主屏幕</h3><p class="hint">iPad/手机用 Safari 打开本网址 → 分享 → 「添加到主屏幕」，即可像 App 一样全屏打开。</p></div>';
    h += '<div class="card"><h3>数据</h3><button class="btn ghost sm" id="clearData">清空本机数据</button></div>';
    h += '<p class="ver">AI 课辅 · 初中　v0.1（骨架）</p>';
    return h + '</div>';
  }
  function bindProfile() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-g]'), function (b) {
      b.onclick = function () { state.grade = b.getAttribute('data-g'); Store.saveSettings({ grade: state.grade }); render(); };
    });
    document.getElementById('saveBackend').onclick = function () {
      Store.saveSettings({ backendUrl: document.getElementById('backend').value.trim() }); toast('已保存');
    };
    document.getElementById('clearData').onclick = function () {
      if (confirm('清空本机所有判题/错题数据？不可恢复。')) { localStorage.clear(); state.analysis = null; toast('已清空'); render(); }
    };
  }

  /* ============ 公用小组件 ============ */
  function empty(msg) { return '<div class="empty">' + esc(msg) + '</div>'; }
  function autoGrow(ta) {
    var fit = function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', fit); fit();
  }
  function zoom(src) {
    var d = document.createElement('div');
    d.className = 'zoom'; d.innerHTML = '<img src="' + src + '"/>';
    d.onclick = function () { document.body.removeChild(d); };
    document.body.appendChild(d);
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { if (t.parentNode) document.body.removeChild(t); }, 300); }, 1400);
  }

  window.App = { start: start };
})();
