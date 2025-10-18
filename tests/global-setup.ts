/**
 * Global Test Setup
 *
 * This file runs once before all tests
 */

import { jest } from '@jest/globals';

// Global test setup
export default async function globalSetup() {
  console.log('🚀 Starting IMAP Enhanced Node Test Suite');

  // Set up global test environment
  process.env.NODE_ENV = 'test';
  process.env.N8N_LOG_LEVEL = 'error'; // Reduce log noise during tests

  // Mock console methods to reduce test output noise
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  // Set up global test timeouts
  jest.setTimeout(30000); // 30 seconds for all tests

  // Mock global fetch if needed
  if (!global.fetch) {
    global.fetch = jest.fn();
  }

  // Set up global error handling
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  console.log('✅ Global test setup completed');
}
