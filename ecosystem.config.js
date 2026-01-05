module.exports = {
  apps: [
    {
      name: 'csvpdf',
      script: './csvpdf-server',
      cwd: '/home/ubuntu/csvpdf/server',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        GIN_MODE: 'release',
        PORT: '4000'
      },
      env_development: {
        GIN_MODE: 'debug',
        PORT: '4000'
      },
      error_file: '/home/ubuntu/csvpdf/logs/error.log',
      out_file: '/home/ubuntu/csvpdf/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
