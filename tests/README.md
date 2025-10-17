# IMAP Enhanced Node Test Suite

## Overview

This test suite provides comprehensive testing for the IMAP Enhanced Node, covering all operations, edge cases, and user scenarios.

## Test Structure

```
tests/
├── user_cases.md              # User cases and test scenarios documentation
├── setup.ts                   # Test utilities and mocks
├── jest.config.js             # Jest configuration
├── package.json               # Test dependencies
├── global-setup.ts            # Global test setup
├── global-teardown.ts         # Global test teardown
├── test-results-processor.js  # Test results processing
├── unit/                      # Unit tests
│   ├── SearchFieldParameters.test.ts
│   └── MarkdownConverter.test.ts
└── integration/               # Integration tests
    └── EmailOperations.test.ts
```

## Running Tests

### Prerequisites

```bash
# Install test dependencies
npm install --save-dev jest @jest/globals @types/jest ts-jest
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests for CI
npm run test:ci

# Run tests with debug output
npm run test:debug

# Run tests silently
npm run test:silent
```

## Test Categories

### Unit Tests

Test individual functions in isolation with mocked dependencies:

- **SearchFieldParameters.test.ts**: Tests mailbox path handling and parameter utilities
- **MarkdownConverter.test.ts**: Tests HTML to Markdown conversion and JSON extraction

### Integration Tests

Test complete operation workflows:

- **EmailOperations.test.ts**: Tests email operations (get, download, set flags, move, copy, create draft)

## Test Coverage

The test suite aims for:
- **80%+ code coverage** across all modules
- **100% coverage** for critical functions
- **Edge case coverage** for error handling
- **Performance testing** for large datasets

## Mock Data

The test suite includes comprehensive mock data:

### Mock Credentials
```typescript
const mockCredentials = {
  host: 'imap.test.com',
  port: 993,
  user: 'test@test.com',
  password: 'testpassword',
  tls: true,
  allowUnauthorizedCerts: false,
};
```

### Mock Email Data
```typescript
const mockEmailData = {
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
  // ... more fields
};
```

### Mock Mailbox Data
```typescript
const mockMailboxData = {
  path: 'INBOX',
  name: 'INBOX',
  delimiter: '/',
  flags: ['\\HasNoChildren'],
  specialUse: '\\Inbox',
  listed: true,
  subscribed: true,
};
```

## Test Scenarios

### Email Operations

1. **Get Email List**
   - ✅ Retrieve emails with various filters
   - ✅ Handle Chinese mailbox names
   - ✅ Process large email lists
   - ✅ Handle search criteria

2. **Download Email**
   - ✅ Download with content extraction
   - ✅ Handle binary output
   - ✅ Process different content types

3. **Set Email Flags**
   - ✅ Set standard flags (Seen, Flagged, etc.)
   - ✅ Set custom labels
   - ✅ Handle multiple UIDs
   - ✅ Work with Chinese mailboxes

4. **Move/Copy Email**
   - ✅ Move between mailboxes
   - ✅ Copy to multiple destinations
   - ✅ Handle Chinese mailbox names

5. **Create Draft**
   - ✅ Create text/HTML drafts
   - ✅ Handle attachments
   - ✅ Set custom headers

### Mailbox Operations

1. **List Mailboxes**
   - ✅ List all mailboxes
   - ✅ Handle nested structures
   - ✅ Display Chinese names

2. **Create/Delete/Rename Mailboxes**
   - ✅ Create with Chinese characters
   - ✅ Handle duplicates
   - ✅ Manage nested mailboxes

### Error Handling

1. **Network Issues**
   - ✅ Connection timeouts
   - ✅ Network interruptions
   - ✅ Server unavailable

2. **Authentication Issues**
   - ✅ Invalid credentials
   - ✅ Expired tokens
   - ✅ Permission denied

3. **Data Issues**
   - ✅ Corrupted data
   - ✅ Invalid formats
   - ✅ Encoding problems

## Performance Testing

The test suite includes performance tests for:

- **Large email lists** (1000+ emails)
- **Large mailbox structures** (100+ mailboxes)
- **Content processing** (100KB+ emails)
- **Concurrent operations**

## Test Utilities

### Mock Functions
```typescript
// Create mock execute functions
const mockExecuteFunctions = createMockExecuteFunctions();

// Create mock IMAP client
const mockImapClient = createMockImapClient();

// Create test data
const testEmail = testUtils.createTestEmail({
  uid: 12345,
  subject: 'Custom Subject',
});
```

### Test Data Generators
```typescript
// Generate test emails
const testEmails = testDataGenerators.generateTestEmails(100);

// Generate test mailboxes
const testMailboxes = testDataGenerators.generateTestMailboxes([
  'INBOX', '重要邮件', '垃圾邮件'
]);
```

## Continuous Integration

The test suite is designed for CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
```

## Test Results

Test results are processed and generate:

- **Coverage reports** (HTML, LCOV)
- **Test summaries** (JSON)
- **Performance metrics**
- **Error reports**

## Contributing

When adding new tests:

1. **Follow naming conventions**: `*.test.ts`
2. **Use descriptive test names**: `should handle Chinese mailbox names correctly`
3. **Include edge cases**: Error conditions, large data, special characters
4. **Mock external dependencies**: Don't make real network calls
5. **Test both success and failure paths**
6. **Update documentation**: Add new test scenarios to `user_cases.md`

## Troubleshooting

### Common Issues

1. **Timeout errors**: Increase `testTimeout` in jest.config.js
2. **Memory issues**: Use `--max-old-space-size=4096` for large tests
3. **Mock issues**: Ensure mocks are properly reset between tests
4. **Coverage issues**: Check that all code paths are tested

### Debug Mode

```bash
# Run tests with debug output
npm run test:debug

# Run specific test file
npx jest tests/unit/SearchFieldParameters.test.ts --verbose

# Run tests matching pattern
npx jest --testNamePattern="should handle Chinese"
```

## Test Data Requirements

For integration tests, you may need:

- **Test IMAP server** (Docker container)
- **Test email accounts** with various mailbox types
- **Test emails** with different content types
- **Test attachments** of various sizes

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Use meaningful assertions**: Test specific behavior, not implementation
3. **Mock external dependencies**: Don't rely on external services
4. **Test edge cases**: Empty data, large data, error conditions
5. **Keep tests fast**: Avoid slow operations in unit tests
6. **Document test scenarios**: Explain what each test validates
