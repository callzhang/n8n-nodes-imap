/*
This file contains utilities for generating the parameters that retreive data from the IMAP server.
E.g. the list of mailboxes, the list of emails in a mailbox, etc.
*/

import { ListResponse } from "imapflow";
import { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodeListSearchResult, INodeProperties, INodePropertyOptions } from "n8n-workflow";
import { ImapCredentialsData } from "../../../credentials/ImapCredentials.credentials";
import { createImapClient } from "./ImapUtils";
import { getImapCredentials } from "./CredentialsSelector";

export async function loadMailboxList(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
  try {
    const credentials = await getImapCredentials(this) as ImapCredentialsData;
    const client = createImapClient(credentials, this.logger);
    await client.connect();

    const mailboxes = await client.list();
    client.close();

    // Ensure mailboxes is an array
    if (!Array.isArray(mailboxes)) {
      this.logger?.warn('Mailbox list is not an array, returning empty list');
      return { results: [] };
    }

    return {
      results: mailboxes.map((mailbox: ListResponse) => ({
        name: mailbox.path,
        value: mailbox.path,
      })),
    };
  } catch (error) {
    this.logger?.error(`Failed to load mailbox list: ${(error as Error).message}`);
    // Return empty results instead of throwing error
    return { results: [] };
  }
}

export async function loadMailboxOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  try {
    const credentials = await getImapCredentials(this) as ImapCredentialsData;
    const client = createImapClient(credentials, this.logger);
    await client.connect();

    const mailboxes = await client.list();
    client.close();

    // Ensure mailboxes is an array
    if (!Array.isArray(mailboxes)) {
      this.logger?.warn('Mailbox list is not an array, returning empty list');
      return [];
    }

    const mailboxOptions = mailboxes.map((mailbox: ListResponse) => ({
      name: mailbox.path,
      value: mailbox.path,
    }));

    // Add "ALL" option at the top
    return [
      {
        name: 'ALL',
        value: 'ALL',
        description: 'Search all available mailboxes',
      },
      ...mailboxOptions
    ];
  } catch (error) {
    this.logger?.error(`Failed to load mailbox options: ${(error as Error).message}`);
    // Return empty results instead of throwing error
    return [];
  }
}

const DEFAULT_MAILBOX_PARAMETER_NAME = 'mailboxPath';
/**
 * base parameter for selecting a mailbox
 */
export const parameterSelectMailbox: INodeProperties  = {
  displayName: 'Mailbox',
  name: DEFAULT_MAILBOX_PARAMETER_NAME,
  type: 'resourceLocator',
  default: {
    mode: 'list',
    value: 'INBOX',
  },
  description: 'Select the mailbox',
  modes: [
    {
      displayName: 'List',
      name: 'list',
      type: 'list',
      typeOptions: {
        searchListMethod: 'loadMailboxList',
        searchable: false,
        searchFilterRequired: false
      }
    },
    {
      displayName: 'Path',
      name: 'path',
      type: 'string',
      hint: 'Full path to mailbox in the format same as returned by List Mailboxes operation',
      validation: [
      ],
      placeholder: 'Full path to mailbox',
    },
  ],
};


/**
 * Simple mailbox path handler - no encoding/decoding needed
 * Modern IMAP servers support UTF-8 directly
 */
function getMailboxPath(mailboxPath: string): string {
  // Return the mailbox path as-is - modern servers handle UTF-8 directly
  return mailboxPath;
}

export function getMailboxPathFromNodeParameter(context: IExecuteFunctions, itemIndex: number,  paramName:string = DEFAULT_MAILBOX_PARAMETER_NAME): string {
  try {
    const mailboxPathObj = context.getNodeParameter(paramName, itemIndex) as IDataObject;
    // check if mailboxPathObj exists (could be undefined if mailboxPathObj is not required and not set)
    if (!mailboxPathObj) {
      return '';
    }
    // check if value exists
    if ("value" in mailboxPathObj === false) {
      return '';
    }
    const mailboxPath = mailboxPathObj['value'] as string;

    // Use simple path handler - no encoding/decoding needed
    return getMailboxPath(mailboxPath);
  } catch (error) {
    return '';
  }
}

/**
 * Get multiple mailbox paths from node parameter
 * Returns array of mailbox paths, or empty array for ALL mailboxes
 */
export function getMailboxPathsFromNodeParameter(context: IExecuteFunctions, itemIndex: number, paramName: string = DEFAULT_MAILBOX_PARAMETER_NAME): string[] {
  try {
    // First try to get the primary mailbox
    const primaryMailbox = getMailboxPathFromNodeParameter(context, itemIndex, paramName);

    // Check if there's a multiple mailboxes parameter
    const multipleMailboxes = context.getNodeParameter('multipleMailboxes', itemIndex) as string[];

    if (multipleMailboxes && Array.isArray(multipleMailboxes) && multipleMailboxes.length > 0) {
      // Use multiple mailboxes if specified
      return multipleMailboxes
        .filter(mailbox => mailbox && typeof mailbox === 'string' && mailbox.trim() !== '')
        .map(mailbox => String(mailbox).trim());
    }

    // If primary mailbox is specified, use it
    if (primaryMailbox && primaryMailbox.trim() !== '') {
      return [primaryMailbox];
    }

    // If no mailbox specified, return empty array (means ALL mailboxes)
    return [];
  } catch (error) {
    context.logger?.warn(`Error getting mailbox paths: ${(error as Error).message}`);
    // If there's an error, default to ALL mailboxes
    return [];
  }
}

/**
 * Get all available mailboxes from the IMAP server
 */
export async function getAllMailboxes(context: IExecuteFunctions, client: any): Promise<string[]> {
  try {
    const mailboxes = await client.list();

    // Ensure mailboxes is an array
    if (!Array.isArray(mailboxes)) {
      context.logger?.warn('Mailbox list is not an array, falling back to INBOX');
      return ['INBOX'];
    }

    return mailboxes.map((mailbox: any) => mailbox.path);
  } catch (error) {
    context.logger?.warn(`Failed to get mailbox list: ${(error as Error).message}`);
    // Fallback to INBOX if we can't get the list
    return ['INBOX'];
  }
}
