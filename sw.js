/**
 * Samriddhi Solves MCQ — Service Worker (PWA)
 * Caches app shell and quiz data for offline use.
 */

const CACHE_NAME = "samriddhi-mcq-v1";
const ASSETS = [
  "./index.html",
  "./styles.css",
  "./script.js",
  "./quiz-data.js",
  "./manifest.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    }).catch(function () {
      // If any add fails, still activate (e.g. when run from file://)
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        var clone = response.clone();
        if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return caches.match("./index.html").then(function (fallback) {
          return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
        });
      });
    })
  );
});
