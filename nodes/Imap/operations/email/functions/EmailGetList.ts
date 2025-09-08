import { FetchMessageObject, FetchQueryObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getAllMailboxes } from "../../../utils/SearchFieldParameters";
import { emailSearchParameters, getEmailSearchParametersFromNode } from "../../../utils/EmailSearchParameters";
import { simpleParser } from 'mailparser';
import { htmlToMarkdown, cleanHtml } from "../../../utils/MarkdownConverter";


enum EmailParts {
  BodyStructure = 'bodyStructure',
  Flags = 'flags',
  Size = 'size',
  AttachmentsInfo = 'attachmentsInfo',
  TextContent = 'textContent',
  HtmlContent = 'htmlContent',
  MarkdownContent = 'markdownContent',
  Headers = 'headers',
}

// Removed unused streamToString function

// Removed unused textToSimplifiedHtml function




export const getEmailsListOperation: IResourceOperationDef = {
  operation: {
    name: 'Get Many',
    value: 'getEmailsList',
  },
  parameters: [
    {
      displayName: 'Mailbox Names or IDs',
      name: 'mailboxes',
      type: 'multiOptions',
      default: ['ALL'],
      description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
      typeOptions: {
        loadOptionsMethod: 'loadMailboxOptions',
      },
      options: [
        {
          name: 'ALL',
          value: 'ALL',
          description: 'Search all available mailboxes',
        },
        {
          name: 'INBOX',
          value: 'INBOX',
        },
      ],
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
          name: 'Markdown Content',
          value: EmailParts.MarkdownContent,
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
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    // Get mailbox selection parameter
    const selectedMailboxes = context.getNodeParameter('mailboxes', itemIndex) as string[];

    // Determine which mailboxes to search
    let mailboxesToSearch: string[];
    if (selectedMailboxes.includes('ALL')) {
      // Search all available mailboxes
      mailboxesToSearch = await getAllMailboxes(context, client);
    } else if (selectedMailboxes.length === 0) {
      // Fallback to INBOX if no mailboxes selected
      mailboxesToSearch = ['INBOX'];
    } else {
      // Use selected mailboxes (filter out 'ALL' if present)
      mailboxesToSearch = selectedMailboxes.filter(mailbox => mailbox !== 'ALL');
    }

    context.logger?.info(`Searching in ${mailboxesToSearch.length} mailbox(es): ${mailboxesToSearch.join(', ')}`);

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
    // text Content, html Content, and markdown Content
    const includeTextContent = includeParts.includes(EmailParts.TextContent);
    const includeHtmlContent = includeParts.includes(EmailParts.HtmlContent);
    const includeMarkdownContent = includeParts.includes(EmailParts.MarkdownContent);
    if (includeTextContent || includeHtmlContent || includeMarkdownContent) {
      // will parse the bodystructure to get the parts IDs for text and html
      fetchQuery.bodyStructure = true;
    }

    // log searchObject and fetchQuery
    context.logger?.debug(`Search object: ${JSON.stringify(searchObject)}`);
    context.logger?.debug(`Fetch query: ${JSON.stringify(fetchQuery)}`);

    // if any content parts are requested, fetch source for better content extraction
    if (includeTextContent || includeHtmlContent || includeMarkdownContent) {
      fetchQuery.source = true; // Use source instead of bodyStructure for better performance
    }

    // get limit parameter
    const limit = context.getNodeParameter('limit', itemIndex) as number;

    // wait for all emails to be fetched before processing them
    // because we might need to fetch the body parts for each email,
    // and this will freeze the client if we do it in parallel
    const emailsList: FetchMessageObject[] = [];
    let totalCount = 0;
    let limitReached = false;

    // Iterate through each mailbox
    for (const mailboxPath of mailboxesToSearch) {
      if (limitReached) break;

      try {
        context.logger?.info(`Opening mailbox: ${mailboxPath}`);
        await client.mailboxOpen(mailboxPath, { readOnly: true });

        let mailboxCount = 0;
        for await (let email of client.fetch(searchObject, fetchQuery)) {
          // Add mailbox information to the email object
          (email as any).mailboxPath = mailboxPath;
          emailsList.push(email);
          totalCount++;
          mailboxCount++;

          // apply limit if specified
          if (limit > 0 && totalCount >= limit) {
            context.logger?.info(`Reached limit of ${limit} emails, stopping fetch`);
            limitReached = true;
            break;
          }
        }

        context.logger?.info(`Found ${mailboxCount} emails in ${mailboxPath}`);
      } catch (error) {
        context.logger?.warn(`Failed to search mailbox ${mailboxPath}: ${(error as Error).message}`);
        // Continue with next mailbox
      }
    }

    context.logger?.info(`Found ${emailsList.length} total emails across ${mailboxesToSearch.length} mailbox(es)`);

    // process the emails
    for (const email of emailsList) {
      context.logger?.info(`  ${email.uid}`);
      var item_json: any = {};

      // Always include basic email info
      item_json.seq = email.seq;
      item_json.uid = email.uid;
      item_json.mailboxPath = (email as any).mailboxPath; // Include mailbox path from the email object

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

      // Process content parts if requested
      if ((includeTextContent || includeHtmlContent || includeMarkdownContent) && email.source) {
        context.logger?.debug(`Parsing email source for UID ${email.uid}...`);
        try {
          const parsed = await simpleParser(email.source);

          // Extract text content if requested
          if (includeTextContent) {
            if (parsed.text) {
              item_json.textContent = parsed.text;
            } else if (parsed.html) {
              // Generate text from HTML if no plain text available
              const cleanedHtml = cleanHtml(parsed.html);
              item_json.textContent = htmlToText(cleanedHtml);
            } else {
              item_json.textContent = '';
            }
          }

          // Extract HTML content if requested
          if (includeHtmlContent) {
            if (parsed.html) {
              const originalHtmlSize = parsed.html.length;
              const originalHtmlSizeKB = originalHtmlSize / 1024;

              // Clean HTML by default for better readability
              const cleanedHtml = cleanHtml(parsed.html);
              const cleanedHtmlSize = cleanedHtml.length;
              const htmlReduction = ((originalHtmlSize - cleanedHtmlSize) / originalHtmlSize) * 100;

              item_json.htmlContent = cleanedHtml;
              item_json.htmlCleaned = true;
              item_json.htmlOriginalSizeKB = originalHtmlSizeKB;
              item_json.htmlCleanedSizeKB = cleanedHtmlSize / 1024;

              if (htmlReduction > 0) {
                context.logger?.debug(`Email ${email.uid}: HTML cleaned, size reduced by ${htmlReduction.toFixed(1)}% (${(originalHtmlSize/1024).toFixed(1)}KB → ${(cleanedHtmlSize/1024).toFixed(1)}KB)`);
              }
            } else {
              item_json.htmlContent = '';
            }
          }

          // Extract markdown content if requested
          if (includeMarkdownContent) {
            if (parsed.html) {
              const cleanedHtml = cleanHtml(parsed.html);
              item_json.markdownContent = htmlToMarkdown(cleanedHtml);
            } else if (parsed.text) {
              // If no HTML, use plain text as markdown
              item_json.markdownContent = parsed.text;
            } else {
              item_json.markdownContent = '';
            }
          }

          context.logger?.debug(`Email source parsing successful for UID ${email.uid}`);
        } catch (error) {
          context.logger?.warn(`Failed to parse email source for UID ${email.uid}: ${error.message}`);
          // Set empty values as fallback
          if (includeTextContent) item_json.textContent = '';
          if (includeHtmlContent) item_json.htmlContent = '';
          if (includeMarkdownContent) item_json.markdownContent = '';
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
