#!/usr/bin/env node
const { spawn } = require('node:child_process');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const child = spawn('npx', [
  '--no-install',
  'concurrently',
  '--names',
  'auth,client',
  '--prefix-colors',
  'magenta,green',
  '--kill-others-on-fail',
  'npm run dev:auth',
  'npm run dev:client',
], { stdio: 'inherit', env: process.env });

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (error) => {
  console.error('[dev-local-web] 启动失败:', error.message);
  process.exit(1);
});
