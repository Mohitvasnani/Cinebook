import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8082";

const nextConfig: NextConfig = {
  /* The browser only ever talks to this origin. /api/* is forwarded to the
     Spring service, which makes the session cookie first-party: Safari and
     Chrome both block third-party cookies, so a cookie set directly by
     onrender.com would be dropped on a vercel.app page. It also means there is
     no CORS, because there is no cross-origin request left to permit.

     API_ORIGIN is a server-side variable, deliberately not NEXT_PUBLIC_: the
     browser never needs to know where the API actually lives. */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;