// scripts/stop-dev.ts
import { execSync } from 'node:child_process';

const kill = (cmd: string) => {
  try { execSync(cmd, { stdio: 'ignore' }); } catch {}
};

// Ports: 3000 (API), 5173 (Vite app), 4321 (Astro marketing)
const PORTS = process.argv.slice(2).length ? process.argv.slice(2) : ['3000', '5173', '4321'];

console.log(`[stop-dev] freeing ports ${PORTS.join(', ')} and stopping dev processes...`);

for (const port of PORTS) {
  // macOS/Linux: kill whatever is listening on :PORT
  // xargs -r is GNU-only; macOS uses: xargs (no -r). Use sh -c for portability.
  kill(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | xargs kill -9 2>/dev/null`);
}

// any compiled API servers
kill(`pkill -f "node .*api/dist"`);

// any tsx watchers (api runs as tsx watch src/index.ts from api/)
kill(`pkill -f "tsx.*src/index"`);

// any Vite processes
kill(`pkill -f "vite"`);

// any Astro processes
kill(`pkill -f "astro"`);

// any ngrok agents
kill(`pkill -f ngrok`);

console.log('[stop-dev] done.');
