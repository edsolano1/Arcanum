// Arcanum offline shell
var CACHE = 'arcanum-v107';
var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/arcanum-192.png',
  './icons/arcanum-512.png'
];

// Cache keys never carry a query string, so ?v=123 variants can't fork the cache.
function keyFor(req) {
  var u = new URL(req.url);
  u.search = '';
  u.hash = '';
  return new Request(u.toString(), { method: 'GET', credentials: 'omit' });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return fetch(new Request(u, { cache: 'reload' })).then(function (r) {
          if (r && r.ok) return c.put(keyFor(new Request(u)), r);
        }).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// The rest notice carries buttons. A tap on one lands here, not in the page - the page
// may not even be running - so the action is relayed to whichever client is alive, and
// the app is opened if none is.
self.addEventListener('notificationclick', function (e) {
  var act = e.action;
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
      for (var i = 0; i < cs.length; i++) {
        if (act) { cs[i].postMessage({ type: 'rest-action', action: act }); }
        if (!act && cs[i].focus) return cs[i].focus();
      }
      if (!act && self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf('http') !== 0) return;

  var isDoc = req.mode === 'navigate' || (req.destination === 'document') ||
              /\.html($|\?)/.test(req.url) || req.url.replace(/[?#].*$/, '').endsWith('/');

  if (isDoc) {
    // Network first: a fresh copy of the app always wins, cache is the offline fallback.
    e.respondWith(
      // cache:'no-store' skips the browser's own HTTP cache. Without it the worker's
      // "network" fetch could still be answered from a stale copy and the app would
      // never update no matter how many times the page was reloaded.
      fetch(new Request(req.url, { cache: 'no-store', credentials: 'omit' })).then(function (r) {
        if (r && r.ok) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(keyFor(req), copy); });
        }
        return r;
      }).catch(function () {
        return caches.match(keyFor(req), { ignoreSearch: true })
          .then(function (hit) { return hit || caches.match('./index.html', { ignoreSearch: true }); });
      })
    );
    return;
  }

  // Static assets (icons, fonts, manifest): cache first, refreshed in the background.
  e.respondWith(
    caches.match(keyFor(req), { ignoreSearch: true }).then(function (hit) {
      if (hit) {
        fetch(req).then(function (r) {
          if (r && r.ok) caches.open(CACHE).then(function (c) { c.put(keyFor(req), r.clone()); });
        }).catch(function () {});
        return hit;
      }
      return fetch(req).then(function (r) {
        if (r && r.ok) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(keyFor(req), copy); });
        }
        return r;
      });
    })
  );
});
