/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Chart screenshots are sent to the Rex server action as base64.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  // sharp is a native dependency used server-side by the Rex Vision Engine.
  serverExternalPackages: ["sharp"],
};
export default nextConfig;
