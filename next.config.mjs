/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: ""
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
        port: ""
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        http2: false,
        dns: false,
        child_process: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
        path: false,
        os: false,
        buffer: false,
        https: false,
        http: false,
      };
      
      // Exclude GA4 client from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        '@google-analytics/data': 'commonjs @google-analytics/data',
        'google-gax': 'commonjs google-gax',
        '@grpc/grpc-js': 'commonjs @grpc/grpc-js',
        'google-auth-library': 'commonjs google-auth-library',
      });
    }
    return config;
  },
};

export default nextConfig;
