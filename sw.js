/* Service Worker — 网络优先（在线永远拿最新代码，离线才用缓存）。
   开发期最重要：避免旧 JS 被缓存导致"改了不生效"。AI 判题/对话是 POST，不经此。 */
var CACHE = 'ai-kefu-v5';
var ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest', './icon.svg',
  './js/data.js', './js/knowledge.js', './js/digest.js', './js/storage.js', './js/api.js', './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                 // 判题/对话(POST)直接走网络
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;       // 后端 API(跨域)不拦
  // 网络优先：拿到最新就更新缓存；断网才回退缓存
  e.respondWith(
    fetch(req).then(function (resp) {
      if (resp && resp.status === 200) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return resp;
    }).catch(function () { return caches.match(req); })
  );
});
