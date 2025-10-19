import { FetchMessageObject, FetchQueryObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getAllMailboxes } from "../../../utils/SearchFieldParameters";
import { emailSearchParameters, getEmailSearchParametersFromNode } from "../../../utils/EmailSearchParameters";
import { simpleParser } from 'mailparser';
import { htmlToMarkdown, cleanHtml, htmlToText } from "../../../utils/MarkdownConverter";

/**
 * Get optimized fetch fields based on search criteria
 * Excludes body/text fields that require full content fetching
 */
function getOptimizedFetchFields(searchObject: any): any {
  const fields: any = { uid: true };

  // Check if we need envelope fields
  const needsEnvelope = searchObject.subject || searchObject.from || searchObject.to;

  if (needsEnvelope) {
    fields.envelope = {};

    if (searchObject.subject) {
      fields.envelope.subject = true;
    }

    if (searchObject.from) {
      fields.envelope.from = true;
    }

    if (searchObject.to) {
      fields.envelope.to = true;
    }
  }

  // Check if we need date fields
  if (searchObject.since || searchObject.before) {
    fields.internalDate = true;
  }

  // Check if we need flags
  if (searchObject.seen !== undefined || searchObject.flagged || searchObject.answered) {
    fields.flags = true;
  }

  // Check if we need size
  if (searchObject.larger || searchObject.smaller) {
    fields.size = true;
  }

  // Note: We deliberately exclude body/text fields as they require full content fetching
  // which is not optimized for client-side filtering

  return fields;
}

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

        // Check if we have any search criteria
        const hasSearchCriteria = Object.keys(searchObject).length > 0;

        let searchResults: number[] | false;

        if (hasSearchCriteria) {
          // First, try server-side search for emails using the search object
          context.logger?.info(`Searching with criteria: ${JSON.stringify(searchObject)}`);

          try {
            searchResults = await client.search(searchObject);

            if (!searchResults || searchResults === undefined) {
              // Server search returned undefined, treat as failure and fall back to client-side
              context.logger?.warn(`Server search returned undefined, falling back to client-side search`);
              throw new Error('Server search returned undefined');
            }

            context.logger?.info(`Found ${searchResults.length} emails matching search criteria in ${mailboxPath}`);

            if (searchResults.length === 0) {
              context.logger?.info(`No emails found matching criteria in ${mailboxPath}`);
              continue;
            }
          } catch (searchError) {
            // Server-side search failed (common with limited IMAP servers like Alimail)
            context.logger?.warn(`Server-side search failed: ${(searchError as Error).message}`);
            context.logger?.info(`Falling back to optimized client-side search for ${mailboxPath}`);

            // Optimized fallback: Fetch only required fields for client-side filtering
            const optimizedFields = getOptimizedFetchFields(searchObject);
            context.logger?.info(`Using optimized fetch fields: ${JSON.stringify(optimizedFields)}`);

            const allEmails: number[] = [];
            const allEmailData: any[] = [];

            // Fetch emails with only the fields needed for filtering
            for await (const email of client.fetch({}, optimizedFields)) {
              if (email.uid) {
                allEmails.push(email.uid);
                allEmailData.push(email);
              }
            }

            context.logger?.info(`Fetched ${allEmails.length} emails with optimized fields for client-side filtering`);

            // Apply client-side filtering based on search criteria
            const filteredUids: number[] = [];
            for (let i = 0; i < allEmails.length; i++) {
              const uid = allEmails[i];
              const emailData = allEmailData[i];
              let matches = true;

              // Check subject filter
              if (searchObject.subject && emailData.envelope?.subject) {
                const subject = emailData.envelope.subject.toLowerCase();
                const searchSubject = searchObject.subject.toLowerCase();
                if (!subject.includes(searchSubject)) {
                  matches = false;
                }
              }

              // Check from filter
              if (searchObject.from && emailData.envelope?.from) {
                const from = emailData.envelope.from.map((addr: any) => addr.address.toLowerCase()).join(' ');
                const searchFrom = searchObject.from.toLowerCase();
                if (!from.includes(searchFrom)) {
                  matches = false;
                }
              }

              // Check to filter
              if (searchObject.to && emailData.envelope?.to) {
                const to = emailData.envelope.to.map((addr: any) => addr.address.toLowerCase()).join(' ');
                const searchTo = searchObject.to.toLowerCase();
                if (!to.includes(searchTo)) {
                  matches = false;
                }
              }

              // Check date filters
              if (searchObject.since && emailData.internalDate) {
                const emailDate = new Date(emailData.internalDate);
                const sinceDate = new Date(searchObject.since);
                if (emailDate < sinceDate) {
                  matches = false;
                }
              }

              if (searchObject.before && emailData.internalDate) {
                const emailDate = new Date(emailData.internalDate);
                const beforeDate = new Date(searchObject.before);
                if (emailDate > beforeDate) {
                  matches = false;
                }
              }

              // Check flags filters
              if (searchObject.seen === false && emailData.flags) {
                if (emailData.flags.includes('\\Seen')) {
                  matches = false;
                }
              }

              if (searchObject.seen === true && emailData.flags) {
                if (!emailData.flags.includes('\\Seen')) {
                  matches = false;
                }
              }

              if (matches) {
                filteredUids.push(uid);
              }
            }

            searchResults = filteredUids;
            context.logger?.info(`Optimized client-side search found ${searchResults.length} emails matching criteria in ${mailboxPath}`);

            if (searchResults.length === 0) {
              context.logger?.info(`No emails found matching criteria in ${mailboxPath}`);
              continue;
            }
          }
        } else {
          // No search criteria provided, fetch all emails directly
          context.logger?.info(`No search criteria provided, fetching all emails from ${mailboxPath}`);

          // Fetch all emails directly instead of UIDs + individual fetch
          const allEmails: number[] = [];
          for await (const email of client.fetch({}, { uid: true })) {
            if (email.uid) {
              allEmails.push(email.uid);
            }
          }

          searchResults = allEmails;
          context.logger?.info(`Found ${searchResults.length} total emails in ${mailboxPath}`);
        }

        // Then fetch the email data for the found UIDs
        if (hasSearchCriteria) {
          // For search results, fetch individually (already optimized)
          for (const uid of searchResults) {
            if (limitReached) break;

            try {
              const email = await client.fetchOne(uid, fetchQuery, { uid: true });
              if (email) {
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
            } catch (fetchError) {
              context.logger?.warn(`Failed to fetch email UID ${uid}: ${(fetchError as Error).message}`);
              // Continue with next email
            }
          }
        } else {
          // For no search criteria, fetch all emails at once (much faster)
          context.logger?.info(`Fetching all emails at once for better performance`);

          for await (const email of client.fetch({}, fetchQuery)) {
            if (limitReached) break;
            if (email.uid) {
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

      // Process content parts if requested - OPTIMIZED: Parse once, extract all content types
      let parsedEmail: any = null;
      if ((includeTextContent || includeHtmlContent || includeMarkdownContent || includeAttachmentsInfo) && email.source) {
        context.logger?.debug(`Parsing email source for UID ${email.uid}...`);
        try {
          parsedEmail = await simpleParser(email.source);

          // Extract text content if requested
          if (includeTextContent) {
            if (parsedEmail.text) {
              item_json.textContent = parsedEmail.text;
            } else if (parsedEmail.html) {
              // Generate text from HTML if no plain text available
              const cleanedHtml = cleanHtml(parsedEmail.html);
              item_json.textContent = htmlToText(cleanedHtml);
            } else {
              item_json.textContent = '';
            }
          }

          // Extract HTML content if requested
          if (includeHtmlContent) {
            if (parsedEmail.html) {
              const originalHtmlSize = parsedEmail.html.length;
              const originalHtmlSizeKB = originalHtmlSize / 1024;

              // Clean HTML by default for better readability
              const cleanedHtml = cleanHtml(parsedEmail.html);
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
            if (parsedEmail.html) {
              const cleanedHtml = cleanHtml(parsedEmail.html);
              item_json.markdownContent = htmlToMarkdown(cleanedHtml);
            } else if (parsedEmail.text) {
              // If no HTML, use plain text as markdown
              item_json.markdownContent = parsedEmail.text;
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


      // Handle attachment info if requested - OPTIMIZED: Reuse parsed email data
      if (includeAttachmentsInfo) {
        try {
          const emailData = parsedEmail || (email.source ? await simpleParser(email.source) : null);
          if (emailData?.attachments && emailData.attachments.length > 0) {
            item_json.attachmentsInfo = emailData.attachments.map((attachment: any, index: number) => ({
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
