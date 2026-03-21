import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // standalone 模式让 Docker 镜像只打包运行时必要文件，极大减小镜像体积
  output: "standalone",
};

export default nextConfig;
