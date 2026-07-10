module.exports = {
  apps: [
    {
      name: 'omnibot',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'omnibot-admin',
      script: 'admin/server.js',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/admin-err.log',
      out_file: './logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      watch: false,
    },
  ],
};
