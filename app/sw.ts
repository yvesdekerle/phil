/// <reference lib="webworker" />
// Service worker Phil — bundlé via esbuild (Serwist runtime, cf. note I01).
// PHIL-I02 : stratégies par type de ressource + flow de mise à jour.
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // /offline est précachée à l'installation : c'est la vue de secours (I05).
  precacheEntries: [{ url: "/offline", revision: "phil-2" }],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
  // Pas de skipWaiting automatique : la nouvelle version attend que
  // l'utilisateur accepte la bannière « Nouvelle version disponible ».
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Assets Next.js immutables (JS/CSS/fonts hashés)
      matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "phil-static",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 })],
      }),
    },
    {
      // Images optimisées Next + icônes PWA
      matcher: ({ url }) =>
        url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/icons/"),
      handler: new CacheFirst({
        cacheName: "phil-images",
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 })],
      }),
    },
    {
      // Pages HTML : réseau d'abord, cache en secours (lecture offline I05)
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "phil-pages",
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 })],
      }),
    },
  ],
});

// Activation à la demande depuis la bannière de mise à jour.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

serwist.addEventListeners();
