import { FetchQueryObject, ImapFlow } from "imapflow";
import { IBinaryKeyData, IDataObject, IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import { simpleParser } from 'mailparser';
import { htmlToMarkdown, cleanHtml } from "../../../utils/MarkdownConverter";



function htmlToText(html: string): string {
  if (!html) return '';

  // Remove script and style elements completely
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert HTML elements to plain text
  text = text
    // Convert line breaks
    .replace(/<br[^>]*>/gi, '\n')
    // Convert paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n')
    // Convert headers
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    // Convert divs
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '\n$1\n')
    // Convert lists
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '\n$1\n')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    // Convert blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n')
    // Convert links to plain text with URL (handle long URLs)
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, (match, url, text) => {
      try {
        const decodedUrl = decodeURIComponent(url);
        if (url.includes('%') && url.length > 200) {
          return text; // Just show the text for URLs with excessive byte code
        }
        if (decodedUrl.length > 500) {
          return text; // Just show the text for very long URLs
        }
        return `${text} (${url})`;
      } catch (e) {
        return text; // If decoding fails, just show the text
      }
    })
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Handle plain URLs in text (not in HTML links)
    .replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
      try {
        const decodedUrl = decodeURIComponent(url);
        if (url.includes('%') && url.length > 200) {
          return '[Long URL]';
        }
        if (decodedUrl.length > 500) {
          return '[Long URL]';
        }
        return match;
      } catch (e) {
        return '[Long URL]';
      }
    })
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
    .replace(/\n /g, '\n') // Remove leading spaces from lines
    .replace(/ \n/g, '\n'); // Remove trailing spaces from lines

  return text.trim();
}

export const downloadOperation: IResourceOperationDef = {
  operation: {
    name: 'Download as EML',
    value: 'downloadEml',
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
      description: 'UID of the email to download',
    },
    {
      displayName: 'Output to Binary Data',
      name: 'outputToBinary',
      type: 'boolean',
      default: true,
      description: 'Whether to output the email as binary data or JSON as text',
      hint: 'If true, the email will be output as binary data. If false, the email will be output as JSON as text.',
    },
    {
      displayName: 'Put Output File in Field',
      name: 'binaryPropertyName',
      type: 'string',
      default: 'data',
      required: true,
      placeholder: 'e.g data',
      hint: 'The name of the output binary field to put the file in',
      displayOptions: {
        show: {
          outputToBinary: [true],
        },
      },
    },
    {
      displayName: 'Include Email Body',
      name: 'includeBody',
      type: 'boolean',
      default: false,
      description: 'Whether to include parsed email body content in the output',
      hint: 'When enabled, includes text, markdown, and html fields with email body content',
    },
    {
      displayName: 'Clean HTML',
      name: 'cleanHtml',
      type: 'boolean',
      default: true,
      description: 'Whether to clean HTML by removing unreadable tags and attributes',
      hint: 'Removes style attributes, converts divs to paragraphs, and cleans up formatting for better readability',
      displayOptions: {
        show: {
          includeBody: [true],
        },
      },
    },
    {
      displayName: 'Include Raw HTML',
      name: 'includeRawHtml',
      type: 'boolean',
      default: false,
      description: 'Whether to include the original raw HTML content',
      hint: 'Warning: Raw HTML can be very large (1MB+). Only enable if you need the original HTML for processing.',
      displayOptions: {
        show: {
          includeBody: [true],
        },
      },
    },

  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    await client.mailboxOpen(mailboxPath, { readOnly: true });

    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;

    if (!emailUid || emailUid.trim() === '') {
      throw new Error('Email UID is required');
    }
    const outputToBinary = context.getNodeParameter('outputToBinary', itemIndex, true) as boolean;
    const binaryPropertyName = context.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;
    const includeBody = context.getNodeParameter('includeBody', itemIndex, false) as boolean;
    const cleanHtmlOption = context.getNodeParameter('cleanHtml', itemIndex, true) as boolean;
    const includeRawHtml = context.getNodeParameter('includeRawHtml', itemIndex, false) as boolean;

    // get source from the email
    const query: FetchQueryObject = {
      uid: true,
      source: true,
    };
    const emailInfo = await client.fetchOne(emailUid, query, { uid: true });

    if (!emailInfo) {
      throw new Error(`Email with UID ${emailUid} not found in mailbox ${mailboxPath}`);
    }

    let binaryFields: IBinaryKeyData | undefined = undefined;
    let jsonData: IDataObject = {
      uid: emailInfo.uid,
    };

    // Process email body if requested
    if (includeBody && emailInfo.source) {
      try {
        const parsed = await simpleParser(emailInfo.source);

        // Extract basic email information
        jsonData.envelope = {
          date: parsed.date,
          subject: parsed.subject,
          from: parsed.from,
          to: parsed.to,
          cc: parsed.cc,
          bcc: parsed.bcc,
          replyTo: parsed.replyTo,
          messageId: parsed.messageId,
        };

        // Extract body content
        if (parsed.text) {
          jsonData.text = parsed.text;
          jsonData.markdown = parsed.text; // Plain text is already readable
        } else {
          jsonData.text = '';
          jsonData.markdown = '';
        }

        if (parsed.html) {
          const originalHtmlSize = parsed.html.length;
          const originalHtmlSizeKB = originalHtmlSize / 1024;

          // Store raw HTML only if explicitly requested
          if (includeRawHtml) {
            jsonData.htmlRaw = parsed.html;
            jsonData.htmlRawSizeKB = originalHtmlSizeKB;
          }

          // Clean HTML (always enabled by default)
          if (cleanHtmlOption) {
            const cleanedHtml = cleanHtml(parsed.html);
            const cleanedHtmlSize = cleanedHtml.length;
            const htmlReduction = ((originalHtmlSize - cleanedHtmlSize) / originalHtmlSize) * 100;

            jsonData.html = cleanedHtml;
            jsonData.htmlCleaned = true;
            jsonData.htmlOriginalSizeKB = originalHtmlSizeKB;
            jsonData.htmlCleanedSizeKB = cleanedHtmlSize / 1024;

            if (htmlReduction > 0) {
              context.logger?.debug(`Email ${emailInfo.uid}: HTML cleaned, size reduced by ${htmlReduction.toFixed(1)}% (${(originalHtmlSize/1024).toFixed(1)}KB → ${(cleanedHtmlSize/1024).toFixed(1)}KB)`);
            }
          } else {
            jsonData.html = parsed.html;
          }

          // Generate markdown from cleaned HTML
          jsonData.markdown = htmlToMarkdown(jsonData.html);

          // If we don't have text content, create plain text from HTML
          if (!jsonData.text) {
            jsonData.text = htmlToText(jsonData.html);
          }
        } else {
          jsonData.html = '';
        }

        // Ensure we have all three formats
        if (!jsonData.text) jsonData.text = '';
        if (!jsonData.markdown) jsonData.markdown = '';
        if (!jsonData.html) jsonData.html = '';

        context.logger?.debug(`Email body processing successful for UID ${emailInfo.uid}`);
      } catch (error) {
        context.logger?.warn(`Failed to parse email body for UID ${emailInfo.uid}: ${error.message}`);
        // Set empty values as fallback
        jsonData.text = '';
        jsonData.markdown = '';
        jsonData.html = '';
      }
    }

    if (outputToBinary) {
      // output to binary data
      if (!emailInfo.source) {
        throw new Error(`Email UID ${emailUid} has no source data available`);
      }
      const binaryData = await context.helpers.prepareBinaryData(emailInfo.source, mailboxPath + '_' + emailUid + '.eml', 'message/rfc822');
      binaryFields = {
        [binaryPropertyName]: binaryData,
      };
    } else {
      // output to JSON as text
      if (!emailInfo.source) {
        throw new Error(`Email UID ${emailUid} has no source data available`);
      }
      jsonData = {
        ...jsonData,
        emlContent: emailInfo.source.toString(),
      };
    }

    const newItem: INodeExecutionData = {
      json: jsonData,
      binary: binaryFields,
      pairedItem: {
        item: itemIndex,
      },
    };
    return [newItem];
  },
};
