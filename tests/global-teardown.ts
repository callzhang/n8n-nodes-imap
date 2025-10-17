/**
 * Global Test Teardown
 *
 * This file runs once after all tests complete
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment');

  // Clean up any global resources
  if (global.gc) {
    global.gc(); // Force garbage collection if available
  }

  // Clear any global timers
  if (global.clearTimeout) {
    global.clearTimeout();
  }

  if (global.clearInterval) {
    global.clearInterval();
  }

  // Reset environment variables
  delete process.env.NODE_ENV;
  delete process.env.N8N_LOG_LEVEL;

  console.log('✅ Global test teardown completed');
}
