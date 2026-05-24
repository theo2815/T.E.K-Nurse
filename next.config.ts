import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Conservative, framework-safe security headers. Vercel already provides
  // HTTPS + HSTS. We deliberately do NOT set a strict Content-Security-Policy
  // or a camera Permissions-Policy here — both need testing against the QR
  // scanner + Supabase + Google Fonts before shipping, and a wrong value would
  // break the live app. These three have no functional side effects.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
