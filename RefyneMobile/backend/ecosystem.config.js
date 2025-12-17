module.exports = {
  apps: [{
    name: 'refyne-backend',
    script: 'server.js',
    cwd: '/home/enoch/apps/Refyne-Mobile/RefyneMobile/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: '/home/enoch/apps/Refyne-Mobile/RefyneMobile/backend/.env',  // Update this path to your actual .env file location
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // Note: Install dependencies before starting PM2 using deploy.sh
    // PM2 doesn't support pre_start hooks, so run: npm install && pm2 start ecosystem.config.js
  }]
};

