module.exports = {
  apps: [
    {
      name: 'csvpdf',
      script: 'server/src/index.js',
      cwd: '/home/ubuntu/csvpdf',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
