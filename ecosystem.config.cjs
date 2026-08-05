module.exports = {
  apps: [
    {
      name: 'collectors-vault',
      script: 'dist/server.cjs',
      cwd: "C:\\DevWeb\\Projects\\MyCollector's Vault V3.3",
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 50,
      min_uptime: '5s',
      restart_delay: 3000,
      error_file: 'C:\\Users\\Administrator\\vault-server-error.log',
      out_file: 'C:\\Users\\Administrator\\vault-server-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
