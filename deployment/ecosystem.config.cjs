module.exports = {
  apps: [{
    name: 'flouba-lite-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      RUN_MIGRATIONS: 'false',
    },
    max_memory_restart: '512M',
    kill_timeout: 5000,
    listen_timeout: 10000,
    time: true,
  }],
};
