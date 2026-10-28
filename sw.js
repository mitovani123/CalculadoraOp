/* Service worker — Calculadora Operacional CTT (bp bioenergy)
   Faz o app funcionar offline depois de aberto uma vez com internet.
   Estratégia: pré-cacheia o app na instalação; para a página (navegação)
   tenta a rede primeiro (para pegar atualizações) e cai no cache quando offline. */
const CACHE = 'ctt-bp-v2';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isNav = req.mode === 'navigate' || accept.includes('text/html');

  if (isNav) {
    // página: rede primeiro (atualizações), cache como reserva offline
    e.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => { try { c.put('./index.html', copy); } catch (_) {} });
          return resp;
        })
        .catch(() =>
          caches.match(req).then(r => r || caches.match('./index.html')).then(r => r || caches.match('./'))
        )
    );
  } else {
    // outros pedidos (raros, tudo já está embutido): cache primeiro
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => { try { c.put(req, copy); } catch (_) {} });
        return resp;
      }).catch(() => r))
    );
  }
});
