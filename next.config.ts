import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Case studies -> Build log rename. Permanent (SEO-preserving) redirects
    // for anyone with an old bookmark or backlink.
    return [
      { source: "/case-studies", destination: "/build-log", permanent: true },
      { source: "/case-studies/feed.xml", destination: "/build-log/feed.xml", permanent: true },
      { source: "/case-studies/:slug", destination: "/build-log/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
