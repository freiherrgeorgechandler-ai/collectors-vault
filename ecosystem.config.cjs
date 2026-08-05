module.exports = {
  apps: [{
    name: 'vault-v3',
    script: 'dist/server.cjs',
    cwd: 'C:\\Users\\Administrator\\Downloads\\REMIX-~1',
    env: { NODE_ENV: 'production' },
    instances: 1,
    autorestart: true
  }]
};
