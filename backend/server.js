// Compatibility entry point for earlier setup instructions. The TypeScript
// server serves existing account/notification routes and real-time incidents.
try {
  const { startServer } = await import('./dist/backend/src/index.js');
  await startServer();
} catch (error) {
  if (error?.code === 'ERR_MODULE_NOT_FOUND') {
    console.error('Build the backend first with npm run build, or run npm run dev.');
  } else {
    console.error(error instanceof Error ? error.message : 'Server startup failed.');
  }
  process.exitCode = 1;
}
