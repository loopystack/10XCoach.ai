module.exports = {
  apps: [
    {
      name: '10x-unified-server',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      // Update cwd to your actual deployment path (e.g., /var/www/10xcoach)
      cwd: process.cwd(), // Uses current directory by default
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HTTPS: 'false' // Set to false when using Nginx for SSL
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HTTPS: 'false' // Set to false when using Nginx for SSL
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G'
    }
  ]
};
