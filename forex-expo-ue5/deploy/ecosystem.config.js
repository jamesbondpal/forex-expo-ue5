module.exports = {
  apps: [
    {
      name: 'forex-expo-signalling',
      script: 'server/src/index.js',
      cwd: '/opt/forex-expo-ue5',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/forex-expo/error.log',
      out_file: '/var/log/forex-expo/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart strategy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
