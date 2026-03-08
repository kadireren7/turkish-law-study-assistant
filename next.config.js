/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ['docx'],
}

module.exports = nextConfig
