module.exports = {
  apps: [{
    name: '10x-dashboard-server',
    script: './src/index.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3001
    },
    error_file: '../logs/server-error.log',
    out_file: '../logs/server-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};

