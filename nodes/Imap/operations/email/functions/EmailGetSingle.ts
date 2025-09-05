import { ImapFlow } from 'imapflow';
import { ParsedMail, simpleParser } from 'mailparser';
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';
import { ParameterValidator } from '../../../utils/ParameterValidator';
import { NodeHtmlMarkdown } from 'node-html-markdown';

// HTML conversion functions
const nhm = new NodeHtmlMarkdown();

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return nhm.translate(html);
}

function htmlToText(html: string): string {
  if (!html) return '';
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '\n$1\n')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '\n$1\n')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n');
  return text.trim();
}

// Removed unused streamToString function

export const getSingleEmailOperation: IResourceOperationDef = {
  operation: {
    name: 'Get Single Email',
    value: 'getSingleEmail',
    description: 'Get a single email with full content (optimized for performance)',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
    },
    {
      displayName: 'Email UID',
      name: 'emailUid',
      type: 'string',
      default: '',
      description: 'UID of the email to fetch',
      required: true,
    },
    {
      displayName: 'Include Body Content',
      name: 'includeBody',
      type: 'boolean',
      default: true,
      description: 'Whether to include email body content (text, markdown, html)',
      hint: 'Returns text, markdown, and html fields with email body content',
    },
    {
      displayName: 'Include Attachments Info',
      name: 'includeAttachmentsInfo',
      type: 'boolean',
      default: false,
      description: 'Whether to include attachment information (without downloading)',
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    const returnData: INodeExecutionData[] = [];

    // Validate parameters
    const mailboxParam = context.getNodeParameter('mailbox', itemIndex) as string | { mode: string; value: string };
    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;
    const includeBody = context.getNodeParameter('includeBody', itemIndex, true) as boolean;
    const includeAttachmentsInfo = context.getNodeParameter('includeAttachmentsInfo', itemIndex, false) as boolean;

    ParameterValidator.validateMailbox(mailboxParam);
    ParameterValidator.validateUid(emailUid);

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    context.logger?.info(`Fetching single email UID ${emailUid} from ${mailboxPath}`);

    try {
      // Open mailbox
      await client.mailboxOpen(mailboxPath, { readOnly: true });
    } catch (error) {
      throw new Error(`Failed to open mailbox ${mailboxPath}: ${(error as Error).message}`);
    }

    try {
      // First, verify the email exists
      const searchResults = await client.search({ uid: emailUid.toString() });
      if (searchResults.length === 0) {
        throw new Error(`Email with UID ${emailUid} not found in ${mailboxPath}`);
      }

      // Build fetch query
      const fetchQuery: any = {
        uid: true,
        source: true, // Get full email source for better content extraction
        flags: true,
        size: true,
      };

      // Fetch the email
      const email = await client.fetchOne(emailUid, fetchQuery, { uid: true });

      if (!email) {
        throw new Error(`No email data received for UID ${emailUid}`);
      }

      context.logger?.debug(`Email fetched successfully: UID ${email.uid}`);

      // Parse the email content
      let parsed: ParsedMail;
      try {
        if (!email.source) {
          throw new Error(`Email source not available for UID ${emailUid}`);
        }

        parsed = await simpleParser(email.source);
        context.logger?.debug(`Email parsed successfully: subject="${parsed.subject}", textLength=${typeof parsed.text === 'string' ? parsed.text.length : 0}, htmlLength=${typeof parsed.html === 'string' ? parsed.html.length : 0}`);
      } catch (error) {
        throw new Error(`Failed to parse email content: ${(error as Error).message}`);
      }

      // Build the response
      const item_json: any = {
        seq: email.seq,
        uid: email.uid,
        mailboxPath: mailboxPath,
        size: email.size,
        flags: email.flags ? Array.from(email.flags) : [],
        seen: email.flags?.has('\\Seen') || false,
      };

      // Add envelope data from parsed content
      item_json.envelope = {
        subject: parsed.subject || '',
        from: parsed.from ? [{ address: (parsed.from as any).value?.[0]?.address || '', name: (parsed.from as any).value?.[0]?.name || '' }] : [],
        to: parsed.to ? (parsed.to as any).value?.map((addr: any) => ({ address: addr.address || '', name: addr.name || '' })) || [] : [],
        cc: parsed.cc ? (parsed.cc as any).value?.map((addr: any) => ({ address: addr.address || '', name: addr.name || '' })) || [] : [],
        bcc: parsed.bcc ? (parsed.bcc as any).value?.map((addr: any) => ({ address: addr.address || '', name: addr.name || '' })) || [] : [],
        replyTo: parsed.replyTo ? (parsed.replyTo as any).value?.map((addr: any) => ({ address: addr.address || '', name: addr.name || '' })) || [] : [],
        date: parsed.date || new Date(),
        messageId: parsed.messageId || '',
        inReplyTo: parsed.inReplyTo || ''
      };

      // Add body content if requested
      if (includeBody) {
        if (parsed.text) {
          item_json.text = parsed.text;
          item_json.markdown = parsed.text; // Plain text is already readable
        } else {
          item_json.text = '';
          item_json.markdown = '';
        }

        if (parsed.html) {
          item_json.html = parsed.html;
          item_json.markdown = htmlToMarkdown(parsed.html);
          // If we don't have text content, create plain text from HTML
          if (!item_json.text) {
            item_json.text = htmlToText(parsed.html);
          }
        } else {
          item_json.html = '';
        }

        // Ensure we have all three formats
        if (!item_json.text) item_json.text = '';
        if (!item_json.markdown) item_json.markdown = '';
        if (!item_json.html) item_json.html = '';
      }

      // Add attachment info if requested
      if (includeAttachmentsInfo && parsed.attachments) {
        item_json.attachmentsInfo = parsed.attachments.map((attachment, index) => ({
          index: index,
          filename: attachment.filename || `attachment_${index}`,
          contentType: attachment.contentType || 'application/octet-stream',
          size: attachment.size || 0,
          contentId: attachment.contentId || null,
        }));
      }

      context.logger?.info(`Single email processed successfully: UID ${email.uid}, subject="${item_json.envelope.subject}"`);

      returnData.push({
        json: item_json,
      });

      return returnData;

    } catch (error) {
      throw new Error(`Failed to fetch email with UID ${emailUid}: ${(error as Error).message}`);
    }
  },
};
