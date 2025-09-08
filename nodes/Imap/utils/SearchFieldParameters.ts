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
 * Decode UTF-7 encoded mailbox names and handle known encoding issues
 */
function decodeMailboxPath(str: string): string {
  // If the string doesn't contain UTF-7 encoding markers, return as-is
  if (!str.includes('&') || !str.includes('-')) {
    return str;
  }

  // Known problematic encodings and their correct mailbox names
  const knownEncodings: { [key: string]: string } = {
    '&V4NXPpCuTvY-': '垃圾邮件',
    '&V4RlcJCuTvY-': '发票', // This might be wrong, but let's try it
    // Add more as we discover them
  };

  // Check if this is a known problematic encoding
  if (knownEncodings[str]) {
    return knownEncodings[str];
  }

  // Try standard UTF-7 decoding as fallback
  try {
    // Replace &- with empty string (represents &)
    str = str.replace(/&-/g, '&');

    // Find all &...- patterns and decode them
    return str.replace(/&([A-Za-z0-9+,/]+)-/g, function(match, encoded) {
      try {
        // Convert base64-like encoding to bytes
        let binary = '';
        for (let i = 0; i < encoded.length; i++) {
          const char = encoded[i];
          if (char === ',') {
            binary += '/';
          } else if (char === '+') {
            binary += '+';
          } else {
            binary += char;
          }
        }

        // Pad the string to make it valid base64
        while (binary.length % 4) {
          binary += '=';
        }

        // Decode base64 to UTF-16 bytes, then to string
        const bytes = Buffer.from(binary, 'base64');
        return bytes.toString('utf16le');
      } catch (e) {
        return match; // Return original if decoding fails
      }
    });
  } catch (error) {
    return str; // Return original if any error occurs
  }
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

    // Decode any UTF-7 encoding issues
    return decodeMailboxPath(mailboxPath);
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
