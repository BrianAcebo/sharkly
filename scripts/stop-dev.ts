// scripts/stop-dev.ts
import { execSync } from 'node:child_process';

const kill = (cmd: string) => {
  try { execSync(cmd, { stdio: 'ignore' }); } catch {}
};

const PORT = process.argv[2] || '3001';

console.log(`[stop-dev] freeing port :${PORT} and stopping ngrok agents...`);

// macOS/Linux: kill whatever is listening on :PORT
kill(`lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t | xargs -r kill -9`);

// any compiled servers
kill(`pkill -f "node .*api/dist"`);

// any tsx watchers
kill(`pkill -f "tsx .*api/src/index.ts"`);

// any ngrok agents
kill(`pkill -f ngrok`);

console.log('[stop-dev] done.');
