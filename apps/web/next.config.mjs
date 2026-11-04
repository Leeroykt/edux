/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@edux/schema'],
  // The API is called from the same origin, so no cross-origin access is granted.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/documents", permanent: true },
      { source: "/plans", destination: "/settings?tab=plan", permanent: true },
      { source: "/profile", destination: "/settings?tab=profile", permanent: true },
    ];
  },
};

export default nextConfig;
