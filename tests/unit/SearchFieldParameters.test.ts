/**
 * Unit Tests for SearchFieldParameters
 *
 * Tests the mailbox path handling and parameter utilities
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  getMailboxPathFromNodeParameter,
  getMailboxPathsFromNodeParameter,
  loadMailboxList,
  loadMailboxOptions,
  getAllMailboxes,
} from '../../nodes/Imap/utils/SearchFieldParameters';
import { createMockExecuteFunctions, createMockLoadOptionsFunctions, createMockImapClient } from '../setup';

describe('SearchFieldParameters', () => {
  let mockExecuteFunctions: any;
  let mockLoadOptionsFunctions: any;
  let mockImapClient: any;

  beforeEach(() => {
    mockExecuteFunctions = createMockExecuteFunctions();
    mockLoadOptionsFunctions = createMockLoadOptionsFunctions();
    mockImapClient = createMockImapClient();
  });

  describe('getMailboxPathFromNodeParameter', () => {
    it('should return mailbox path from node parameter', () => {
      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe('INBOX');
    });

    it('should return empty string for invalid parameter', () => {
      mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue(null);
      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe('');
    });

    it('should handle Chinese mailbox names correctly', () => {
      mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue({ value: '重要邮件' });
      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe('重要邮件');
    });

    it('should handle nested mailbox paths', () => {
      mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue({ value: 'INBOX/Subfolder' });
      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe('INBOX/Subfolder');
    });

    it('should handle special characters in mailbox names', () => {
      const specialMailbox = 'Test & Special Characters';
      mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue({ value: specialMailbox });
      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe(specialMailbox);
    });
  });

  describe('getMailboxPathsFromNodeParameter', () => {
    it('should return single mailbox path', () => {
      const result = getMailboxPathsFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toEqual(['INBOX']);
    });

    it('should return multiple mailbox paths', () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' }) // primary mailbox
        .mockReturnValueOnce(['INBOX', '重要邮件', '垃圾邮件']); // multiple mailboxes

      const result = getMailboxPathsFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toEqual(['INBOX', '重要邮件', '垃圾邮件']);
    });

    it('should return empty array for ALL mailboxes', () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce(null) // no primary mailbox
        .mockReturnValueOnce(null); // no multiple mailboxes

      const result = getMailboxPathsFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toEqual([]);
    });

    it('should filter out empty mailbox names', () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce(['INBOX', '', '重要邮件', null, '垃圾邮件']);

      const result = getMailboxPathsFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toEqual(['INBOX', '重要邮件', '垃圾邮件']);
    });
  });

  describe('loadMailboxList', () => {
    it('should load mailbox list successfully', async () => {
      const result = await loadMailboxList.call(mockLoadOptionsFunctions);

      expect(result).toEqual({
        results: [
          { name: 'INBOX', value: 'INBOX' },
          { name: '重要邮件', value: '重要邮件' },
        ],
      });
    });

    it('should handle empty mailbox list', async () => {
      mockImapClient.list = jest.fn().mockResolvedValue([]);
      mockLoadOptionsFunctions.getCredentials = jest.fn().mockResolvedValue({
        data: { host: 'test.com', port: 993, user: 'test', password: 'test', tls: true }
      });

      const result = await loadMailboxList.call(mockLoadOptionsFunctions);
      expect(result).toEqual({ results: [] });
    });

    it('should handle non-array mailbox response', async () => {
      mockImapClient.list = jest.fn().mockResolvedValue(null);
      mockLoadOptionsFunctions.logger = { warn: jest.fn() };

      const result = await loadMailboxList.call(mockLoadOptionsFunctions);
      expect(result).toEqual({ results: [] });
    });

    it('should handle connection errors', async () => {
      mockImapClient.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));
      mockLoadOptionsFunctions.logger = { error: jest.fn() };

      const result = await loadMailboxList.call(mockLoadOptionsFunctions);
      expect(result).toEqual({ results: [] });
    });
  });

  describe('loadMailboxOptions', () => {
    it('should load mailbox options with ALL option', async () => {
      const result = await loadMailboxOptions.call(mockLoadOptionsFunctions);

      expect(result).toEqual([
        {
          name: 'ALL',
          value: 'ALL',
          description: 'Search all available mailboxes',
        },
        { name: 'INBOX', value: 'INBOX' },
        { name: '重要邮件', value: '重要邮件' },
      ]);
    });

    it('should handle errors gracefully', async () => {
      mockImapClient.list = jest.fn().mockRejectedValue(new Error('Server error'));
      mockLoadOptionsFunctions.logger = { error: jest.fn() };

      const result = await loadMailboxOptions.call(mockLoadOptionsFunctions);
      expect(result).toEqual([]);
    });
  });

  describe('getAllMailboxes', () => {
    it('should get all mailboxes from client', async () => {
      const result = await getAllMailboxes(mockExecuteFunctions as any, mockImapClient);

      expect(result).toEqual(['INBOX', '重要邮件']);
    });

    it('should handle client errors', async () => {
      mockImapClient.list = jest.fn().mockRejectedValue(new Error('Client error'));
      mockExecuteFunctions.logger = { warn: jest.fn() };

      const result = await getAllMailboxes(mockExecuteFunctions as any, mockImapClient);
      expect(result).toEqual(['INBOX']); // fallback to INBOX
    });

    it('should handle non-array response', async () => {
      mockImapClient.list = jest.fn().mockResolvedValue(null);
      mockExecuteFunctions.logger = { warn: jest.fn() };

      const result = await getAllMailboxes(mockExecuteFunctions as any, mockImapClient);
      expect(result).toEqual(['INBOX']); // fallback to INBOX
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long mailbox names', () => {
      const longMailboxName = 'A'.repeat(1000);
      mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue({ value: longMailboxName });

      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe(longMailboxName);
    });

    it('should handle mailbox names with special characters', () => {
      const specialChars = 'Test & "Special" Characters (with) [brackets]';
      mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue({ value: specialChars });

      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe(specialChars);
    });

    it('should handle Unicode mailbox names', () => {
      const unicodeMailbox = '📧 Emoji Mailbox 🎉';
      mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue({ value: unicodeMailbox });

      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe(unicodeMailbox);
    });

    it('should handle empty mailbox names', () => {
      mockExecuteFunctions.getNodeParameter = jest.fn().mockReturnValue({ value: '' });

      const result = getMailboxPathFromNodeParameter(mockExecuteFunctions as any, 0);
      expect(result).toBe('');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of mailboxes efficiently', async () => {
      const largeMailboxList = Array.from({ length: 1000 }, (_, i) => ({
        path: `Mailbox${i}`,
        name: `Mailbox${i}`,
        delimiter: '/',
        flags: ['\\HasNoChildren'],
        specialUse: null,
        listed: true,
        subscribed: true,
      }));

      mockImapClient.list = jest.fn().mockResolvedValue(largeMailboxList);

      const startTime = Date.now();
      const result = await loadMailboxList.call(mockLoadOptionsFunctions);
      const endTime = Date.now();

      expect(result.results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
