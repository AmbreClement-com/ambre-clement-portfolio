import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// CSP : strict en prod, mais tolérante en dev (HMR a besoin d'eval).
// img-src autorise https: (CDN R2) et data: (placeholders LQIP).
const csp = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false, // évite la collision avec le menu compte (bas-gauche)
  // sharp (natif) : chargé depuis node_modules, non bundlé
  serverExternalPackages: ["sharp"],
  // Transitions de vue React (morph couverture → page projet à l'ouverture)
  experimental: { viewTransition: true },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Service worker : bon type MIME + jamais mis en cache (les MàJ se propagent).
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
