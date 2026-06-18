/* Service Worker — 应用外壳缓存，首次联网打开后离线也能进。
   注意：AI 判题/对话是实时网络请求，不缓存（fetch 失败直接报错，不返回旧壳）。 */
var CACHE = 'ai-kefu-v3';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icon.svg',
  './js/data.js',
  './js/knowledge.js',
  './js/storage.js',
  './js/api.js',
  './js/app.js'
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
  if (req.method !== 'GET') return;            // 判题/对话是 POST，直接走网络
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;  // 跨域（后端 API）不拦
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return resp;
      }).catch(function () { return cached; });
    })
  );
});
