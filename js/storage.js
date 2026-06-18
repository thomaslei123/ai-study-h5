/* 本地存储层：用 localStorage 替代小程序的 wx.storage。
   保存判题记录、错题本、设置。数据只在本机浏览器，不上云。 */
(function () {
  var K = {
    settings: 'aikefu.settings',
    analyses: 'aikefu.analyses',
    mistakes: 'aikefu.mistakes'
  };

  function read(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var seq = 0;
  function uid(prefix) {
    seq += 1;
    return (prefix || 'id') + '_' + (Date.now().toString(36)) + '_' + seq;
  }

  /* ---- 设置 ---- */
  function getSettings() {
    return read(K.settings, { grade: 'g7', backendUrl: '' });
  }
  function saveSettings(patch) {
    var s = getSettings();
    Object.keys(patch || {}).forEach(function (k) { s[k] = patch[k]; });
    write(K.settings, s);
    return s;
  }

  /* ---- 判题记录 ---- */
  function getAnalyses() { return read(K.analyses, []); }
  function getAnalysis(id) {
    return getAnalyses().filter(function (a) { return a.id === id; })[0];
  }
  function saveAnalysis(a) {
    var list = getAnalyses();
    list.unshift(a);
    write(K.analyses, list.slice(0, 100));
    return a;
  }

  /* ---- 错题本 ---- */
  function getMistakes() { return read(K.mistakes, []); }
  function addMistake(m) {
    var list = getMistakes();
    m.id = m.id || uid('mk');
    m.createdAt = m.createdAt || Date.now();
    m.mastered = false;
    list.unshift(m);
    write(K.mistakes, list.slice(0, 500));
    return m;
  }
  function updateMistake(id, patch) {
    var list = getMistakes();
    list.forEach(function (m) {
      if (m.id === id) { Object.keys(patch).forEach(function (k) { m[k] = patch[k]; }); }
    });
    write(K.mistakes, list);
  }
  function removeMistake(id) {
    write(K.mistakes, getMistakes().filter(function (m) { return m.id !== id; }));
  }

  window.Store = {
    uid: uid,
    getSettings: getSettings, saveSettings: saveSettings,
    getAnalyses: getAnalyses, getAnalysis: getAnalysis, saveAnalysis: saveAnalysis,
    getMistakes: getMistakes, addMistake: addMistake, updateMistake: updateMistake, removeMistake: removeMistake
  };
})();
