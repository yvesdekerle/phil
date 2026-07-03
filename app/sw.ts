/// <reference lib="webworker" />
// Service worker Phil (PHIL-I01) — bundlé via esbuild (Serwist + Turbopack
// ne cohabitent pas encore : pas de précache injecté, cache au fil de l'eau).
// Les stratégies fines par ressource arrivent avec PHIL-I02.
import { CacheFirst, NetworkFirst, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Assets Next.js immutables (hashés)
      matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({ cacheName: "phil-static" }),
    },
    {
      // Pages : réseau d'abord, cache en secours
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "phil-pages", networkTimeoutSeconds: 4 }),
    },
  ],
});

serwist.addEventListeners();
