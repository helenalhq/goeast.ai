import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 将裸域名 (goeast.ai) 永久重定向到 www 版本，解决重复内容问题
      {
        source: "/:path*",
        has: [{ type: "host", value: "goeast.ai" }],
        destination: "https://www.goeast.ai/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
