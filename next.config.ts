import type { NextConfig } from "next";

const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

/**
 * PHIL-J01 — Headers de sécurité.
 * CSP : `script-src 'unsafe-inline'` reste nécessaire à l'hydratation Next
 * sans infrastructure de nonces ; le reste est fermé au strict besoin.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' en dev uniquement : requis par React pour le debug (jamais en prod)
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      // Avatars Google + couvertures de voyage (URL libre) + blobs offline
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      `connect-src 'self' ${SUPABASE_ORIGIN}`.trim(),
      // Viewer PDF (iframe même origine) et blobs offline
      "frame-src 'self' blob:",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Avatars Google (SSO)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Images de couverture des voyages : URL libre (D02), HTTPS uniquement
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      // Le viewer de documents est exclu de la CSP globale : `object-src 'none'`
      // + `frame-ancestors 'none'` sur la réponse PDF elle-même empêchent le
      // viewer de Chrome de l'afficher (page grise) et bloquent notre iframe.
      { source: "/((?!api/documents/).*)", headers: securityHeaders },
      {
        source: "/api/documents/:id/view",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; object-src 'self'; frame-ancestors 'self'",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
