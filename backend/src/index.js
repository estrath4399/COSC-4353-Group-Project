import { createApp } from './app.js';
import { defaultStore } from './store.js';

const PORT = process.env.PORT || 3001;
const app = createApp(defaultStore);
app.listen(PORT, () => {
  console.log(`QueueSmart API listening on http://localhost:${PORT}`);
});
