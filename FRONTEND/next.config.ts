import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      "images.pexels.com",
      'i.pravatar.cc',
    ]
  },
   async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:3001/api/:path*'
            }
        ]
    }
};

export default nextConfig;
