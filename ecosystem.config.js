module.exports = {
  apps: [
    {
      name: '10x-unified-server',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/var/www/10XCoach.ai',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HTTPS: 'true'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HTTPS: 'true'
      }
    }
  ]
};
