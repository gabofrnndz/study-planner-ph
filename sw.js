const CACHE = "deped-planner-v3";
const FILES = ["./", "index.html", "src/app.js", "src/policy.js", "fonts/inter-latin-400-normal.woff2", "fonts/inter-latin-500-normal.woff2", "fonts/inter-latin-600-normal.woff2", "fonts/poppins-latin-600-normal.woff2", "fonts/poppins-latin-700-normal.woff2", "src/style.css", "data/policies.json", "icon.svg", "manifest.webmanifest"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))));
self.addEventListener("fetch", e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
