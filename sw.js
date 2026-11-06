/* TaskFlow service worker: app shell + runtime cache (also caches Chart.js/Lucide after first load) */
const C = 'taskflow-v2', A = ['./', 'index.html', 'css/style.css', 'js/app.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(A)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit);
    return hit || net; // stale-while-revalidate
  }));
});
