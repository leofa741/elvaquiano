import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    MONGODB_CNN: process.env.MONGODB_CNN,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_SECRET: process.env.GOOGLE_SECRET,
    ID_GOOGLE: process.env.ID_GOOGLE,
    MAILER_SERVICE: process.env.MAILER_SERVICE,
    MAILER_EMAIL: process.env.MAILER_EMAIL,
    MAILER_SECRET_KEY: process.env.MAILER_SECRET_KEY,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;