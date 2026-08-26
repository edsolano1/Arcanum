// Kill-switch service worker. The app moved to /Forge/; installed copies still hold the
// old worker and its cache, which would serve the old build forever. Their update check
// fetches this file, sees new bytes, and installs this instead - which tears everything
// down and sends every open window to the network, where index.html redirects to /Forge/.
var CACHE = 'arcanum-v9999-moved';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (cs) { cs.forEach(function (c) { try { c.navigate(c.url); } catch (err) {} }); })
  );
});
// No fetch handler: every request goes straight to the network from here on.
