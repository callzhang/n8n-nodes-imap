import { FetchMessageObject, FetchQueryObject, ImapFlow } from "imapflow";
import { Readable } from "stream";
import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import { emailSearchParameters, getEmailSearchParametersFromNode } from "../../../utils/EmailSearchParameters";
import { simpleParser } from 'mailparser';
import { getEmailPartsInfoRecursive } from "../../../utils/EmailParts";


enum EmailParts {
  BodyStructure = 'bodyStructure',
  Flags = 'flags',
  Size = 'size',
  AttachmentsInfo = 'attachmentsInfo',
  TextContent = 'textContent',
  HtmlContent = 'htmlContent',
  Headers = 'headers',
}

function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stream) {
      resolve('');
    } else {
      const chunks: any[] = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      stream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
      stream.on('error', reject);
    }
  });
}

function textToSimplifiedHtml(text: string): string {
  if (!text) return '';

  // Convert text to simplified HTML
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\r\n/g, '<br>')
    .replace(/\r/g, '<br>');
}

function formatEmailAddresses(addresses: any[]): string[] {
  if (!addresses || !Array.isArray(addresses)) return [];

  return addresses.map(addr => {
    if (typeof addr === 'string') return addr;
    if (addr.name && addr.address) {
      return `${addr.name} <${addr.address}>`;
    }
    return addr.address || '';
  }).filter(addr => addr);
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
      displayName: 'Enhanced Email Fields',
      name: 'enhancedFields',
      type: 'boolean',
      default: true,
      description: 'Whether to return structured email fields (title, from, to, cc, bcc, labels, content)',
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

    // get enhanced fields parameter
    const enhancedFields = context.getNodeParameter('enhancedFields', itemIndex) as boolean;

    // process the emails
    for (const email of emailsList) {
      context.logger?.info(`  ${email.uid}`);
      var item_json = JSON.parse(JSON.stringify(email));

      // add mailbox path to the item
      item_json.mailboxPath = mailboxPath;

      // add enhanced email fields if requested
      if (enhancedFields) {
        // Extract structured fields from envelope
        if (email.envelope) {
          item_json.title = email.envelope.subject || '';
          item_json.from = formatEmailAddresses(email.envelope.from || []);
          item_json.to = formatEmailAddresses(email.envelope.to || []);
          item_json.cc = formatEmailAddresses(email.envelope.cc || []);
          item_json.bcc = formatEmailAddresses(email.envelope.bcc || []);
          item_json.replyTo = formatEmailAddresses(email.envelope.replyTo || []);
          item_json.date = email.envelope.date;
          item_json.messageId = email.envelope.messageId;
          item_json.inReplyTo = email.envelope.inReplyTo;
          // item_json.references = email.envelope.references; // references property not available in envelope
        }

        // Extract labels/flags
        if (email.flags) {
          item_json.labels = email.flags;
        }

        // Add size information
        if (email.size) {
          item_json.size = email.size;
        }
      }

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


      const analyzeBodyStructure = includeAttachmentsInfo || includeTextContent || includeHtmlContent;

      var textPartId = null;
      var htmlPartId = null;
      var attachmentsInfo = [];


      if (analyzeBodyStructure) {
        // workaround: dispositionParameters is an object, but it is not typed as such
        const bodyStructure = email.bodyStructure as unknown as any;

        if (bodyStructure) {

          const partsInfo = getEmailPartsInfoRecursive(context, bodyStructure);

          // filter attachments and text/html parts
          for (const partInfo of partsInfo) {
            if (partInfo.disposition === 'attachment') {
              // this is an attachment
              attachmentsInfo.push({
                partId: partInfo.partId,
                filename: partInfo.filename,
                type: partInfo.type,
                encoding: partInfo.encoding,
                size: partInfo.size,
              });
            } else {
              // if there is only one part, to sometimes it has no partId
              // in that case, ImapFlow uses "TEXT" as partId to download the only part
              if (partInfo.type === 'text/plain') {
                textPartId = partInfo.partId || "TEXT";
              }
              if (partInfo.type === 'text/html') {
                htmlPartId = partInfo.partId || "TEXT";
              }
            }
          }
        }
      }

      if (includeAttachmentsInfo) {
        item_json.attachmentsInfo = attachmentsInfo;
      }

      // fetch text and html content
      if (includeTextContent || includeHtmlContent) {
        if (includeTextContent) {
          // always set textContent to null, in case there is no text part
          item_json.textContent = null;
          if (textPartId) {
            const textContent = await client.download(email.uid.toString(), textPartId, {
              uid: true,
            });
            if (textContent.content) {
              item_json.textContent = await streamToString(textContent.content);

              // if enhanced fields are enabled, also provide simplified HTML version
              if (enhancedFields) {
                item_json.contentText = item_json.textContent;
                item_json.contentHtml = textToSimplifiedHtml(item_json.textContent);
              }
            }
          }
        }
        if (includeHtmlContent) {
          // always set htmlContent to null, in case there is no html part
          item_json.htmlContent = null;
          if (htmlPartId) {
            const htmlContent = await client.download(email.uid.toString(), htmlPartId, {
              uid: true,
            });
            if (htmlContent.content) {
              item_json.htmlContent = await streamToString(htmlContent.content);

              // if enhanced fields are enabled, also provide the HTML content
              if (enhancedFields) {
                item_json.contentHtml = item_json.htmlContent;
                // if we don't have text content, create simplified HTML from the HTML content
                if (!item_json.contentText) {
                  // Strip HTML tags for text version
                  item_json.contentText = item_json.htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                }
              }
            }
          }
        }

        // if enhanced fields are enabled but no content was found, set empty values
        if (enhancedFields && !item_json.contentText && !item_json.contentHtml) {
          item_json.contentText = '';
          item_json.contentHtml = '';
        }
      }

      returnData.push({
        json: item_json,
      });
    }

    return returnData;
  },
};
