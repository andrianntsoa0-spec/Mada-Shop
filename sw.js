const CACHE = "mada-shop-v74";
const ASSETS = ["./", "./index.html", "./manifest.json", "./logo.png",
  "./icon-192.png", "./icon-512.png"];
const NET_TIMEOUT = 4000; // ms : au-delà, on sert la version en cache (évite le chargement interminable)

self.addEventListener("install", e => {
  // Chaque fichier est ajouté séparément : un fichier manquant ne doit pas bloquer l'installation
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Firebase/Firestore et autres sites externes : laisser passer (Firebase gère sa synchro)
  if (url.origin !== location.origin) return;

  const fromCache = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html"));

  // Réseau d'abord (dernière version) mais avec délai maximum, sinon cache
  e.respondWith(new Promise(resolve => {
    let done = false;
    const timer = setTimeout(() => {
      fromCache().then(r => { if (r && !done) { done = true; resolve(r); } });
    }, NET_TIMEOUT);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      if (!done) { done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      if (done) return;
      fromCache().then(r => { done = true; resolve(r || Response.error()); });
    });
  }));
});

self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>l.length?l[0].focus():clients.openWindow("./")))});
