import type { NextConfig } from "next";

// VULN-003 fix : headers de sécurité globaux.
// - X-Frame-Options: DENY → empêche le clickjacking (le site ne peut pas être iframé)
// - X-Content-Type-Options: nosniff → empêche le MIME sniffing
// - Referrer-Policy: strict-origin-when-cross-origin → limite les leaks de referrer
// - Strict-Transport-Security: HSTS 2 ans → force HTTPS
// - Permissions-Policy: désactive caméra, micro, géoloc, etc. (inutiles pour PocketMCP)
// - Content-Security-Policy: permissive mais safe (self + unsafe-inline pour le dev Next.js,
//   pas de 'unsafe-eval' qui est la vraie porte d'entrée XSS)
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // On veut que le build échoue sur les erreurs de type (au lieu de les ignorer).
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
