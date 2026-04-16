import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // 在父目录存在其他 lockfile 时，固定以本仓库为追踪根目录
  outputFileTracingRoot: root,
  // LanceDB 使用原生绑定，避免被 webpack 错误打包
  serverExternalPackages: ["@lancedb/lancedb"],
};

export default nextConfig;
