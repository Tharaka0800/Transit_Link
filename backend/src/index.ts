import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import connectDB from '../config/db.js';
import seedDemoData from '../utils/seedData.js';
import { createIncidentServer } from './server.js';

export { createApp, createIncidentServer } from './server.js';

export async function startServer() {
  // .env is already tracked in this workspace. New server credentials belong
  // in the ignored override; externally provided environment values still win.
  dotenv.config({ path: '.env.local' });
  dotenv.config();
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer from 0 to 65535.');
  }
  // Fail clearly on missing incident configuration before opening databases.
  const server = createIncidentServer();
  await connectDB();
  if (process.env.USE_MEMORY_DB === 'true' || process.env.AUTO_SEED === 'true') {
    await seedDemoData();
  }
  await new Promise<void>((resolve, reject) => {
    server.httpServer.once('error', reject);
    server.httpServer.listen(port, () => {
      server.httpServer.off('error', reject);
      resolve();
    });
  });
  console.log(`TransitLink HTTP/Socket.IO server running on port ${port}`);
  return server;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  startServer().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Server startup failed.');
    process.exitCode = 1;
  });
}
