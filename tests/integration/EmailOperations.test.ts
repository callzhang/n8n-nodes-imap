/**
 * Integration Tests for Email Operations
 *
 * Tests complete email operation workflows
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  getEmailsListOperation,
  downloadOperation,
  setEmailFlagsOperation,
  moveOperation,
  copyOperation,
  createDraftOperation,
} from '../../nodes/Imap/operations/email/functions';
import {
  createMockExecuteFunctions,
  createMockImapClient,
  mockEmailData,
  mockSearchResults,
  testDataGenerators
} from '../setup';

describe('Email Operations Integration Tests', () => {
  let mockExecuteFunctions: any;
  let mockImapClient: any;

  beforeEach(() => {
    mockExecuteFunctions = createMockExecuteFunctions();
    mockImapClient = createMockImapClient();
  });

  describe('Get Emails List Operation', () => {
    it('should retrieve emails list successfully', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' }) // mailboxPath
        .mockReturnValueOnce(['body', 'flags', 'size']) // includeParts
        .mockReturnValueOnce(true) // includeTextContent
        .mockReturnValueOnce(true) // includeHtmlContent
        .mockReturnValueOnce(true) // includeMarkdownContent
        .mockReturnValueOnce(true) // includeAllHeaders
        .mockReturnValueOnce('From,To,Subject,Date') // headersToInclude
        .mockReturnValueOnce(true) // includeAttachmentsInfo
        .mockReturnValueOnce(100) // limit
        .mockReturnValueOnce({}) // searchCriteria
        .mockReturnValueOnce([]); // multipleMailboxes

      const result = await getEmailsListOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].json).toHaveProperty('uid');
      expect(result![0].json).toHaveProperty('envelope');
    });

    it('should handle search criteria', async () => {
      const searchCriteria = {
        from: 'sender@test.com',
        subject: 'Test',
        since: '2024-01-01',
      };

      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce(['body'])
        .mockReturnValueOnce(false) // includeTextContent
        .mockReturnValueOnce(false) // includeHtmlContent
        .mockReturnValueOnce(false) // includeMarkdownContent
        .mockReturnValueOnce(false) // includeAllHeaders
        .mockReturnValueOnce('') // headersToInclude
        .mockReturnValueOnce(false) // includeAttachmentsInfo
        .mockReturnValueOnce(50) // limit
        .mockReturnValueOnce(searchCriteria)
        .mockReturnValueOnce([]);

      const result = await getEmailsListOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(mockImapClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'sender@test.com',
          subject: 'Test',
          since: '2024-01-01',
        }),
        expect.any(Object)
      );
    });

    it('should handle Chinese mailbox names', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: '重要邮件' })
        .mockReturnValueOnce(['body'])
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(50)
        .mockReturnValueOnce({})
        .mockReturnValueOnce([]);

      const result = await getEmailsListOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(mockImapClient.mailboxOpen).toHaveBeenCalledWith('重要邮件', expect.any(Object));
    });

    it('should handle multiple mailboxes', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce(['body'])
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(50)
        .mockReturnValueOnce({})
        .mockReturnValueOnce(['INBOX', '重要邮件', '垃圾邮件']);

      const result = await getEmailsListOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      // Should process multiple mailboxes
      expect(mockImapClient.mailboxOpen).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully', async () => {
      mockImapClient.mailboxOpen = jest.fn().mockRejectedValue(new Error('Mailbox not found'));
      mockExecuteFunctions.logger = { error: jest.fn() };

      await expect(
        getEmailsListOperation.executeImapAction(
          mockExecuteFunctions as any,
          0,
          mockImapClient
        )
      ).rejects.toThrow('Mailbox not found');
    });
  });

  describe('Download Email Operation', () => {
    it('should download email successfully', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' }) // mailboxPath
        .mockReturnValueOnce('12345') // emailUid
        .mockReturnValueOnce(true) // includeBody
        .mockReturnValueOnce(false) // includeRawHtml
        .mockReturnValueOnce(true) // cleanHtmlOption
        .mockReturnValueOnce(false) // outputToBinary
        .mockReturnValueOnce('data'); // binaryPropertyName

      const result = await downloadOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json).toHaveProperty('uid', '12345');
      expect(result![0].json).toHaveProperty('envelope');
    });

    it('should handle binary output', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce('12345')
        .mockReturnValueOnce(false) // includeBody
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true) // outputToBinary
        .mockReturnValueOnce('data');

      const result = await downloadOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].binary).toHaveProperty('data');
    });

    it('should handle content extraction', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce('12345')
        .mockReturnValueOnce(true) // includeBody
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('data');

      const result = await downloadOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json).toHaveProperty('text');
      expect(result![0].json).toHaveProperty('html');
      expect(result![0].json).toHaveProperty('markdown');
    });
  });

  describe('Set Email Flags Operation', () => {
    it('should set standard flags successfully', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' }) // mailboxPath
        .mockReturnValueOnce('12345') // emailUid
        .mockReturnValueOnce({ // flags
          '\\Seen': true,
          '\\Flagged': false,
          '\\Deleted': false,
          '\\Draft': false,
          '\\Answered': false,
        })
        .mockReturnValueOnce({ label: [] }); // customLabels

      const result = await setEmailFlagsOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json).toHaveProperty('uid', '12345');
      expect(result![0].json).toHaveProperty('flagsToSet');
      expect(result![0].json).toHaveProperty('flagsToRemove');
    });

    it('should set custom labels', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce('12345')
        .mockReturnValueOnce({})
        .mockReturnValueOnce({
          label: [
            {
              name: 'Important',
              value: 'true',
              customValue: '',
              action: 'add',
            },
            {
              name: 'Urgent',
              value: 'high',
              customValue: '',
              action: 'set',
            },
          ],
        });

      const result = await setEmailFlagsOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json.flagsToSet).toContain('Important:true');
      expect(result![0].json.flagsToSet).toContain('Urgent:high');
      expect(result![0].json.hasSetAction).toBe(true);
    });

    it('should handle multiple UIDs', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce('12345,12346,12347') // multiple UIDs
        .mockReturnValueOnce({ '\\Seen': true })
        .mockReturnValueOnce({ label: [] });

      const result = await setEmailFlagsOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json.uid).toBe('12345,12346,12347');
    });

    it('should handle Chinese mailbox names', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: '重要邮件' })
        .mockReturnValueOnce('12345')
        .mockReturnValueOnce({ '\\Seen': true })
        .mockReturnValueOnce({ label: [] });

      const result = await setEmailFlagsOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(mockImapClient.mailboxOpen).toHaveBeenCalledWith('重要邮件', expect.any(Object));
    });

    it('should handle validation errors', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce('') // empty UID
        .mockReturnValueOnce({})
        .mockReturnValueOnce({ label: [] });

      await expect(
        setEmailFlagsOperation.executeImapAction(
          mockExecuteFunctions as any,
          0,
          mockImapClient
        )
      ).rejects.toThrow();
    });
  });

  describe('Move Email Operation', () => {
    it('should move email successfully', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' }) // sourceMailbox
        .mockReturnValueOnce('12345') // emailUid
        .mockReturnValueOnce({ value: 'Archive' }); // destinationMailbox

      const result = await moveOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json).toHaveProperty('uid', '12345');
      expect(result![0].json).toHaveProperty('sourceMailbox', 'INBOX');
      expect(result![0].json).toHaveProperty('destinationMailbox', 'Archive');
    });

    it('should handle Chinese mailbox names', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: '重要邮件' })
        .mockReturnValueOnce('12345')
        .mockReturnValueOnce({ value: '垃圾邮件' });

      const result = await moveOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json.sourceMailbox).toBe('重要邮件');
      expect(result![0].json.destinationMailbox).toBe('垃圾邮件');
    });

    it('should handle multiple UIDs', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce('12345,12346,12347')
        .mockReturnValueOnce({ value: 'Archive' });

      const result = await moveOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json.uid).toBe('12345,12346,12347');
    });
  });

  describe('Copy Email Operation', () => {
    it('should copy email successfully', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' }) // sourceMailbox
        .mockReturnValueOnce('12345') // emailUid
        .mockReturnValueOnce({ value: 'Archive' }); // destinationMailbox

      const result = await copyOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json).toHaveProperty('uid', '12345');
      expect(result![0].json).toHaveProperty('sourceMailbox', 'INBOX');
      expect(result![0].json).toHaveProperty('destinationMailbox', 'Archive');
    });
  });

  describe('Create Draft Operation', () => {
    it('should create draft successfully', async () => {
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'Drafts' }) // destinationMailbox
        .mockReturnValueOnce('Test Subject') // subject
        .mockReturnValueOnce('test@example.com') // to
        .mockReturnValueOnce('Test body content') // body
        .mockReturnValueOnce('text') // bodyType
        .mockReturnValueOnce('sender@example.com') // from
        .mockReturnValueOnce('') // cc
        .mockReturnValueOnce('') // bcc
        .mockReturnValueOnce('') // replyTo
        .mockReturnValueOnce('') // inReplyTo
        .mockReturnValueOnce('') // references
        .mockReturnValueOnce('') // priority
        .mockReturnValueOnce('') // customHeaders
        .mockReturnValueOnce('') // attachments
        .mockReturnValueOnce(false); // saveToSent

      const result = await createDraftOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );

      expect(result).not.toBeNull();
      expect(result![0].json).toHaveProperty('messageId');
      expect(result![0].json).toHaveProperty('subject', 'Test Subject');
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      mockImapClient.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));
      mockExecuteFunctions.logger = { error: jest.fn() };

      await expect(
        getEmailsListOperation.executeImapAction(
          mockExecuteFunctions as any,
          0,
          mockImapClient
        )
      ).rejects.toThrow();
    });

    it('should handle mailbox not found errors', async () => {
      mockImapClient.mailboxOpen = jest.fn().mockRejectedValue(new Error('Mailbox not found'));
      mockExecuteFunctions.logger = { error: jest.fn() };

      await expect(
        getEmailsListOperation.executeImapAction(
          mockExecuteFunctions as any,
          0,
          mockImapClient
        )
      ).rejects.toThrow('Mailbox not found');
    });

    it('should handle invalid UID errors', async () => {
      mockImapClient.fetchOne = jest.fn().mockResolvedValue(null);
      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce('99999') // non-existent UID
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('data');

      await expect(
        downloadOperation.executeImapAction(
          mockExecuteFunctions as any,
          0,
          mockImapClient
        )
      ).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large email lists efficiently', async () => {
      const largeSearchResults = testDataGenerators.generateTestSearchResults(1000);
      mockImapClient.search = jest.fn().mockResolvedValue(largeSearchResults);

      mockExecuteFunctions.getNodeParameter = jest.fn()
        .mockReturnValueOnce({ value: 'INBOX' })
        .mockReturnValueOnce(['body'])
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce({})
        .mockReturnValueOnce([]);

      const startTime = Date.now();
      const result = await getEmailsListOperation.executeImapAction(
        mockExecuteFunctions as any,
        0,
        mockImapClient
      );
      const endTime = Date.now();

      expect(result).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
