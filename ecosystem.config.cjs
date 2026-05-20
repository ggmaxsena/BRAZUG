/** PM2 na Hostinger (VPS ou Node.js Web App): pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "brazug-web",
      script: "server.mjs",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",
    },
  ],
};
