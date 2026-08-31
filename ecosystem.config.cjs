// PM2 process manager configuration
// Usage: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "ecommerce-app",
      script: "dist/boot.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      // Log files
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
    },
  ],
};
