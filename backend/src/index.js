import { createApp } from './app.js';
import { defaultStore } from './store.js';

const PORT = process.env.PORT || 3001;
const app = createApp(defaultStore);
const server = app.listen(PORT, () => {
  console.log(`QueueSmart API listening on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    try {
      defaultStore.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
