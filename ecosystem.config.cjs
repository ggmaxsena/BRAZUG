/** PM2 na Hostinger (VPS ou Node.js Web App): pm2 start ecosystem.config.cjs */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "brazug-web",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        ARMORY_URL: "http://2.24.124.162:3001"
      },
      env_file: ".env",
    },
    {
      name: "brazug-armory",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      cwd: path.resolve(__dirname, "brazug-armory"),
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",
    },
    {
      name: "brazug-sync-daily",
      script: "scripts/daily-sync.js",
      cwd: path.resolve(__dirname, "brazug-armory"),
      instances: 1,
      autorestart: false,
      cron_restart: "0 4 * * *",
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",
    }
  ],
};
