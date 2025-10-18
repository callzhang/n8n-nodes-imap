/**
 * Test Setup Configuration
 *
 * This file contains test utilities, mocks, and setup functions
 * for the IMAP Enhanced Node test suite.
 */

import { jest } from '@jest/globals';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

// Mock IMAP credentials for testing
export const mockCredentials = {
  host: 'imap.test.com',
  port: 993,
  user: 'test@test.com',
  password: 'testpassword',
  tls: true,
  allowUnauthorizedCerts: false,
};

// Mock email data for testing
export const mockEmailData = {
  uid: 12345,
  envelope: {
    date: new Date('2024-01-15T10:30:00Z'),
    subject: 'Test Email Subject',
    from: [{ name: 'Test Sender', address: 'sender@test.com' }],
    to: [{ name: 'Test Recipient', address: 'recipient@test.com' }],
    messageId: '<test-message-id@test.com>',
  },
  flags: ['\\Seen'],
  size: 1024,
  headers: new Map([
    ['Message-ID', '<test-message-id@test.com>'],
    ['From', 'Test Sender <sender@test.com>'],
    ['To', 'Test Recipient <recipient@test.com>'],
    ['Subject', 'Test Email Subject'],
    ['Date', 'Mon, 15 Jan 2024 10:30:00 +0000'],
  ]),
  source: Buffer.from('Mock email source data'),
};

// Mock mailbox data
export const mockMailboxData = {
  path: 'INBOX',
  name: 'INBOX',
  delimiter: '/',
  flags: ['\\HasNoChildren'],
  specialUse: '\\Inbox',
  listed: true,
  subscribed: true,
};

// Mock Chinese mailbox data
export const mockChineseMailboxData = {
  path: '重要邮件',
  name: '重要邮件',
  delimiter: '/',
  flags: ['\\HasNoChildren'],
  specialUse: null,
  listed: true,
  subscribed: true,
};

// Mock search results
export const mockSearchResults = [
  { uid: 1, flags: ['\\Seen'], size: 1024 },
  { uid: 2, flags: ['\\Flagged'], size: 2048 },
  { uid: 3, flags: [], size: 512 },
];

// Mock fetch results
export const mockFetchResults = {
  uid: 12345,
  envelope: mockEmailData.envelope,
  flags: mockEmailData.flags,
  size: mockEmailData.size,
  headers: mockEmailData.headers,
  source: mockEmailData.source,
};

// Mock execute functions
export const createMockExecuteFunctions = (): Partial<IExecuteFunctions> => ({
  getNodeParameter: jest.fn((paramName: string, itemIndex: number) => {
    const mockParams: { [key: string]: any } = {
      mailboxPath: { value: 'INBOX' },
      emailUid: '12345',
      flags: {
        '\\Seen': true,
        '\\Flagged': false,
      },
      customLabels: {
        label: [
          {
            name: 'Important',
            value: 'true',
            customValue: '',
            action: 'add',
          },
        ],
      },
      includeBody: true,
      includeRawHtml: false,
      cleanHtmlOption: true,
      includeTextContent: true,
      includeHtmlContent: true,
      includeMarkdownContent: true,
      includeParts: ['body', 'flags', 'size'],
      includeAllHeaders: true,
      headersToInclude: 'From,To,Subject,Date',
      includeAttachmentsInfo: true,
      limit: 100,
      searchCriteria: {
        from: 'sender@test.com',
        subject: 'Test',
        since: '2024-01-01',
      },
      multipleMailboxes: ['INBOX', '重要邮件'],
    };
    return mockParams[paramName];
  }),
  getInputData: jest.fn(() => [
    {
      json: { testData: 'value' },
      binary: {},
      pairedItem: { item: 0 },
    },
  ]),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  helpers: {
    prepareBinaryData: jest.fn().mockResolvedValue({
      data: 'mock-binary-data',
      mimeType: 'application/octet-stream',
      fileName: 'test-file.txt',
    }),
  },
});

// Mock load options functions
export const createMockLoadOptionsFunctions = (): Partial<ILoadOptionsFunctions> => ({
  getCredentials: jest.fn().mockResolvedValue(mockCredentials),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
});

// Mock IMAP client
export const createMockImapClient = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  list: jest.fn().mockResolvedValue([mockMailboxData, mockChineseMailboxData]),
  search: jest.fn().mockResolvedValue(mockSearchResults),
  fetchOne: jest.fn().mockResolvedValue(mockFetchResults),
  fetch: jest.fn().mockResolvedValue([mockFetchResults]),
  mailboxOpen: jest.fn().mockResolvedValue(undefined),
  mailboxClose: jest.fn().mockResolvedValue(undefined),
  messageFlagsAdd: jest.fn().mockResolvedValue(true),
  messageFlagsRemove: jest.fn().mockResolvedValue(true),
  messageMove: jest.fn().mockResolvedValue(true),
  messageCopy: jest.fn().mockResolvedValue(true),
  capabilities: jest.fn().mockResolvedValue(new Set(['IMAP4REV1', 'UTF8=ACCEPT', 'IDLE'])),
});

// Test utilities
export const testUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create test email data
  createTestEmail: (overrides: Partial<typeof mockEmailData> = {}) => ({
    ...mockEmailData,
    ...overrides,
  }),

  // Create test mailbox data
  createTestMailbox: (overrides: Partial<typeof mockMailboxData> = {}) => ({
    ...mockMailboxData,
    ...overrides,
  }),

  // Create test search criteria
  createSearchCriteria: (criteria: any = {}) => ({
    from: 'test@example.com',
    subject: 'Test Subject',
    since: '2024-01-01',
    ...criteria,
  }),

  // Mock error responses
  createMockError: (message: string, code?: string) => {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  },

  // Create mock IMAP server response
  createMockServerResponse: (data: any, success: boolean = true) => ({
    success,
    data,
    timestamp: new Date().toISOString(),
  }),
};

// Test data generators
export const testDataGenerators = {
  // Generate test emails
  generateTestEmails: (count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      uid: index + 1,
      envelope: {
        date: new Date(`2024-01-${String(index + 1).padStart(2, '0')}T10:30:00Z`),
        subject: `Test Email ${index + 1}`,
        from: [{ name: `Sender ${index + 1}`, address: `sender${index + 1}@test.com` }],
        to: [{ name: 'Test Recipient', address: 'recipient@test.com' }],
        messageId: `<test-message-${index + 1}@test.com>`,
      },
      flags: index % 2 === 0 ? ['\\Seen'] : ['\\Flagged'],
      size: 1024 + (index * 100),
    }));
  },

  // Generate test mailboxes
  generateTestMailboxes: (names: string[]) => {
    return names.map((name, index) => ({
      path: name,
      name: name,
      delimiter: '/',
      flags: ['\\HasNoChildren'],
      specialUse: index === 0 ? '\\Inbox' : null,
      listed: true,
      subscribed: true,
    }));
  },

  // Generate test search results
  generateTestSearchResults: (count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      uid: index + 1,
      flags: index % 3 === 0 ? ['\\Seen'] : index % 3 === 1 ? ['\\Flagged'] : [],
      size: 1024 + (index * 100),
    }));
  },
};

// Test configuration
export const testConfig = {
  // Test timeouts
  timeouts: {
    short: 1000,    // 1 second
    medium: 5000,   // 5 seconds
    long: 30000,    // 30 seconds
  },

  // Test data sizes
  dataSizes: {
    small: 1024,      // 1KB
    medium: 10240,    // 10KB
    large: 102400,    // 100KB
    xlarge: 1048576,  // 1MB
  },

  // Test email counts
  emailCounts: {
    small: 10,
    medium: 100,
    large: 1000,
  },

  // Test mailbox counts
  mailboxCounts: {
    small: 5,
    medium: 20,
    large: 100,
  },
};

// Export all test utilities
export default {
  mockCredentials,
  mockEmailData,
  mockMailboxData,
  mockChineseMailboxData,
  mockSearchResults,
  mockFetchResults,
  createMockExecuteFunctions,
  createMockLoadOptionsFunctions,
  createMockImapClient,
  testUtils,
  testDataGenerators,
  testConfig,
};
