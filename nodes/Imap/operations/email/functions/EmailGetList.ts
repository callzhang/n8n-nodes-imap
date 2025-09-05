import { FetchMessageObject, FetchQueryObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import { emailSearchParameters, getEmailSearchParametersFromNode } from "../../../utils/EmailSearchParameters";
import { simpleParser } from 'mailparser';
import { NodeHtmlMarkdown } from 'node-html-markdown';


enum EmailParts {
  BodyStructure = 'bodyStructure',
  Flags = 'flags',
  Size = 'size',
  AttachmentsInfo = 'attachmentsInfo',
  TextContent = 'textContent',
  HtmlContent = 'htmlContent',
  Headers = 'headers',
}

// Removed unused streamToString function

// Removed unused textToSimplifiedHtml function


// Initialize HTML to Markdown converter
const nhm = new NodeHtmlMarkdown();

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return nhm.translate(html);
}

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
    // Convert links to plain text with URL
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
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
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
    .replace(/\n /g, '\n') // Remove leading spaces from lines
    .replace(/ \n/g, '\n'); // Remove trailing spaces from lines

  return text.trim();
}


export const getEmailsListOperation: IResourceOperationDef = {
  operation: {
    name: 'Get Many',
    value: 'getEmailsList',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
    },
    ...emailSearchParameters,
    //
    {
      displayName: 'Include Message Parts',
      name: 'includeParts',
      type: 'multiOptions',
      placeholder: 'Add Part',
      default: [],
      options: [
        {
          name: 'Text Content',
          value: EmailParts.TextContent,
        },
        {
          name: 'HTML Content',
          value: EmailParts.HtmlContent,
        },
        {
          name: 'Attachments Info',
          value: EmailParts.AttachmentsInfo,
        },
        {
          name: 'Flags',
          value: EmailParts.Flags,
        },
        {
          name: 'Size',
          value: EmailParts.Size,
        },
        {
          name: 'Body Structure',
          value: EmailParts.BodyStructure,
        },
        {
          name: 'Headers',
          value: EmailParts.Headers,
        },
      ],
    },
    {
      displayName: 'Include All Headers',
      name: 'includeAllHeaders',
      type: 'boolean',
      default: true,
      description: 'Whether to include all headers in the output',
      displayOptions: {
        show: {
          includeParts: [
            EmailParts.Headers,
          ],
        },
      },
    },
    {
      displayName: 'Headers to Include',
      name: 'headersToInclude',
      type: 'string',
      default: '',
      description: 'Comma-separated list of headers to include',
      placeholder: 'received,authentication-results,return-path',
      displayOptions: {
        show: {
          includeParts: [
            EmailParts.Headers,
          ],
          includeAllHeaders: [
            false,
          ],
        },
      },
    },
    {
      displayName: 'Limit',
      name: 'limit',
      type: 'number',
						typeOptions: {
							minValue: 1,
						},
      default: 50,
      description: 'Max number of results to return',
      placeholder: '100',
    },
    {
      displayName: 'Include Body',
      name: 'enhancedFields',
      type: 'boolean',
      default: true,
      description: 'Whether to include email body content in the results',
      hint: 'Returns text, markdown, and html fields with email body content',
    }
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    context.logger?.info(`Getting emails list from ${mailboxPath}`);

    await client.mailboxOpen(mailboxPath);

    var searchObject = getEmailSearchParametersFromNode(context, itemIndex);

    const includeParts = context.getNodeParameter('includeParts', itemIndex) as string[];
    var fetchQuery : FetchQueryObject = {
      uid: true,
      envelope: true,
    };

    if (includeParts.includes(EmailParts.BodyStructure)) {
      fetchQuery.bodyStructure = true;
    }
    if (includeParts.includes(EmailParts.Flags)) {
      fetchQuery.flags = true;
    }
    if (includeParts.includes(EmailParts.Size)) {
      fetchQuery.size = true;
    }
    if (includeParts.includes(EmailParts.Headers)) {
      fetchQuery.headers = true;
      // check if user wants only specific headers
      const includeAllHeaders = context.getNodeParameter('includeAllHeaders', itemIndex) as boolean;
      if (!includeAllHeaders) {
        const headersToInclude = context.getNodeParameter('headersToInclude', itemIndex) as string;
        context.logger?.info(`Including headers: ${headersToInclude}`);
        if (headersToInclude) {
          fetchQuery.headers = headersToInclude.split(',').map((header) => header.trim());
          context.logger?.info(`Including headers: ${fetchQuery.headers}`);
        }
      }
    }

    // will parse the bodystructure to get the attachments info
    const includeAttachmentsInfo = includeParts.includes(EmailParts.AttachmentsInfo);
    if (includeAttachmentsInfo) {
      fetchQuery.bodyStructure = true;
    }
    // text Content and html Content
    const includeTextContent = includeParts.includes(EmailParts.TextContent);
    const includeHtmlContent = includeParts.includes(EmailParts.HtmlContent);
    if (includeTextContent || includeHtmlContent) {
      // will parse the bodystructure to get the parts IDs for text and html
      fetchQuery.bodyStructure = true;
    }

    // log searchObject and fetchQuery
    context.logger?.debug(`Search object: ${JSON.stringify(searchObject)}`);
    context.logger?.debug(`Fetch query: ${JSON.stringify(fetchQuery)}`);

    // get enhanced fields parameter
    const enhancedFields = context.getNodeParameter('enhancedFields', itemIndex) as boolean;

    // if enhanced fields are enabled, fetch source for better content extraction
    if (enhancedFields) {
      fetchQuery.source = true; // Use source instead of bodyStructure for better performance
    }

    // get limit parameter
    const limit = context.getNodeParameter('limit', itemIndex) as number;

    // wait for all emails to be fetched before processing them
    // because we might need to fetch the body parts for each email,
    // and this will freeze the client if we do it in parallel
    const emailsList: FetchMessageObject[] = [];
    let count = 0;
    for  await (let email of client.fetch(searchObject, fetchQuery)) {
      emailsList.push(email);
      count++;
      // apply limit if specified
      if (limit > 0 && count >= limit) {
        context.logger?.info(`Reached limit of ${limit} emails, stopping fetch`);
        break;
      }
    }
    context.logger?.info(`Found ${emailsList.length} emails`);

    // process the emails
    for (const email of emailsList) {
      context.logger?.info(`  ${email.uid}`);
      var item_json: any = {};

      // Always include basic email info
      item_json.seq = email.seq;
      item_json.uid = email.uid;
      item_json.mailboxPath = mailboxPath;

      // Always include envelope data
      if (email.envelope) {
        item_json.envelope = email.envelope;
      }

      // Always include flags/labels as standard part
      if (email.flags) {
        item_json.labels = email.flags;
      }

      // Always include size
      if (email.size) {
        item_json.size = email.size;
      }

      // If enhanced fields are enabled and we have source, parse it directly
      if (enhancedFields && email.source) {
        context.logger?.debug(`Parsing email source for UID ${email.uid}...`);
        try {
          const parsed = await simpleParser(email.source);

          // Create envelope-like structure from parsed data if not available
          if (!item_json.envelope) {
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
          }

          // Set flags to empty array if not available
          if (!item_json.labels) {
            item_json.labels = [];
          }

          // Set size from source if not available
          if (!item_json.size) {
            item_json.size = email.source.length;
          }

          // Extract body content directly from parsed data
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

          context.logger?.debug(`Email source parsing successful for UID ${email.uid}`);
        } catch (error) {
          context.logger?.warn(`Failed to parse email source for UID ${email.uid}: ${error.message}`);
          // Set empty values as fallback
          item_json.text = '';
          item_json.markdown = '';
          item_json.html = '';
        }
      }

      // Note: All envelope fields are already included in the envelope object above

      // process the headers
      if (includeParts.includes(EmailParts.Headers)) {
        if (email.headers) {
          try {
            const headersString = email.headers.toString();
            const parsed = await simpleParser(headersString);
            item_json.headers = {};
            parsed.headers.forEach((value, key, map) => {
              //context.logger?.info(`    HEADER [${key}] = ${value}`);
              item_json.headers[key] = value;
            });
          } catch (error) {
            context.logger?.error(`    Error parsing headers: ${error}`);
          }
        }
      }


      // Handle attachment info if requested (simplified approach)
      if (includeAttachmentsInfo && email.source) {
        try {
          const parsed = await simpleParser(email.source);
          if (parsed.attachments && parsed.attachments.length > 0) {
            item_json.attachmentsInfo = parsed.attachments.map((attachment, index) => ({
              index: index,
              filename: attachment.filename || `attachment_${index}`,
              contentType: attachment.contentType || 'application/octet-stream',
              size: attachment.size || 0,
              contentId: attachment.contentId || null,
            }));
          }
        } catch (error) {
          context.logger?.warn(`Failed to parse attachments for email ${email.uid}: ${error.message}`);
        }
      }

      returnData.push({
        json: item_json,
      });
    }

    return returnData;
  },
};
