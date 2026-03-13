// Load .env from repo root (when run from api/, ../../.env)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { spawn } from 'child_process';

const addr = process.env.NGROK_ADDR || process.env.PORT || '3000';
const hostname = (process.env.NGROK_DOMAIN || '').trim();
const authtoken = (process.env.NGROK_AUTHTOKEN || '').trim();

if (!authtoken) {
  console.error('❌ NGROK_AUTHTOKEN is missing in .env');
  process.exit(1);
}
if (!hostname) {
  console.error('❌ NGROK_DOMAIN is missing in .env (e.g. smooth-key-goblin.ngrok-free.app)');
  process.exit(1);
}

const args = [
  'http', String(addr),
  `--hostname=${hostname}`,
  `--authtoken=${authtoken}`,
  '--log=stdout'
];

const env = { ...process.env, NGROK_CONFIG: '/dev/null' };
console.log(`\n▶ starting ngrok: http://${addr}  →  https://${hostname}\n`);

const child = spawn('ngrok', args, { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
