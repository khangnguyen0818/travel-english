// Service worker: lưu giao diện & bài học để dùng offline.
// Khi sửa code hoặc thêm bài, hãy tăng số VERSION để điện thoại tải bản mới.
const VERSION = 'traveltalk-v7';
const IMG_CACHE = 'traveltalk-images';
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/storage.js',
  'js/srs.js',
  'js/speech.js',
  'js/grammar.js',
  'js/app.js',
  'data/topics.json',
  'data/vocab.json',
  'data/survival.json',
  'data/topics/airport.json',
  'data/topics/immigration.json',
  'data/topics/hotel.json',
  'data/topics/restaurant.json',
  'data/topics/transport.json',
  'data/topics/cafe.json',
  'data/topics/money.json',
  'data/topics/sightseeing.json',
  'data/topics/smalltalk.json',
  'data/topics/internet.json',
  'data/topics/family.json',
  'data/topics/onboard.json',
  'data/topics/flight-problems.json',
  'data/topics/directions.json',
  'data/topics/shopping.json',
  'data/topics/health.json',
  'data/topics/emergency.json',
  'data/topics/prepare.json',
  'data/topics/car.json',
  'data/topics/homestay.json',
  'data/topics/photos.json',
  'data/topics/beach.json',
  'data/topics/weather.json',
  'data/topics/business.json',
  'data/topics/cruise.json',
  'data/topics/feelings.json',
  'data/topics/trains.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' để bỏ qua bộ nhớ đệm của trình duyệt, luôn lấy file mới từ GitHub
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== IMG_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Ảnh từ Wikimedia (upload./thumb.wikimedia.org): lấy từ bộ nhớ trước, không có mới tải
  if (url.hostname.endsWith('wikimedia.org') && url.hostname !== 'commons.wikimedia.org') {
    e.respondWith(caches.open(IMG_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // Tra cứu ảnh: ưu tiên mạng, mất mạng thì dùng bản đã lưu
  if (url.hostname === 'commons.wikimedia.org') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(IMG_CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req)));
    return;
  }

  if (url.origin !== location.origin) return;

  // File của app: có mạng thì luôn lấy bản mới nhất (và lưu lại), mất mạng mới dùng bản đã lưu
  e.respondWith(caches.open(VERSION).then(async c => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return c.match('index.html');
      return new Response('Offline', { status: 503 });
    }
  }));
});
