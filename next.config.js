/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['docx'],
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig
