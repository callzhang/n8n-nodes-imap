import { ImapFlow } from "imapflow";
import { IDataObject, IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';
import { ImapFlowErrorCatcher, NodeImapError } from "../../../utils/ImapUtils";
import { ParameterValidator } from "../../../utils/ParameterValidator";


enum ImapFlags {
  Answered = '\\Answered',
  Flagged = '\\Flagged',
  Deleted = '\\Deleted',
  Seen = '\\Seen',
  Draft = '\\Draft',
}

export const setEmailFlagsOperation: IResourceOperationDef = {
  operation: {
    name: 'Set Flags',
    value: 'setEmailFlags',
    description: 'Set flags on an email like "Seen" or "Flagged"',
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
      description: 'UID of the email to set flags',
      hint: 'You can use comma separated list of UIDs',
    },
    {
      displayName: 'Flags',
      name: 'flags',
      type: 'collection',
      default: [],
      required: true,
      placeholder: 'Add Flag',
      options: [
        {
          displayName: 'Answered',
          name: ImapFlags.Answered,
          type: 'boolean',
          default: false,
          description: 'Whether email is answered',
        },
        {
          displayName: 'Deleted',
          name: ImapFlags.Deleted,
          type: 'boolean',
          default: false,
          description: 'Whether email is deleted',
        },
        {
          displayName: 'Draft',
          name: ImapFlags.Draft,
          type: 'boolean',
          default: false,
          description: 'Whether email is draft',
        },
        {
          displayName: 'Flagged',
          name: ImapFlags.Flagged,
          type: 'boolean',
          default: false,
          description: 'Whether email is flagged',
        },
        {
          displayName: 'Seen',
          name: ImapFlags.Seen,
          type: 'boolean',
          default: false,
          description: 'Whether email is seen',
        },
      ],
    },
    {
      displayName: 'Custom Labels',
      name: 'customLabels',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      default: {},
      placeholder: 'Add Custom Label',
      description: 'Custom labels (keywords) to add, remove, or set. Both Label Name and Label Value are required.',
      options: [
        {
          displayName: 'Label',
          name: 'label',
          values: [
            {
              displayName: 'Label Name',
              name: 'name',
              type: 'string',
              default: '',
              description: 'Name of the custom label',
              placeholder: 'Important',
              required: true,
            },
            {
              displayName: 'Label Value',
              name: 'value',
              type: 'options',
              default: 'true',
              description: 'Value of the custom label (required)',
              required: true,
              options: [
                {
                  name: 'Completed',
                  value: 'completed',
                },
                {
                  name: 'Custom Value',
                  value: '__custom__',
                },
                {
                  name: 'False',
                  value: 'false',
                },
                {
                  name: 'High',
                  value: 'high',
                },
                {
                  name: 'Important',
                  value: 'important',
                },
                {
                  name: 'Low',
                  value: 'low',
                },
                {
                  name: 'Medium',
                  value: 'medium',
                },
                {
                  name: 'Pending',
                  value: 'pending',
                },
                {
                  name: 'Reviewed',
                  value: 'reviewed',
                },
                {
                  name: 'True',
                  value: 'true',
                },
                {
                  name: 'Urgent',
                  value: 'urgent',
                },
              ],
            },
            {
              displayName: 'Custom Value',
              name: 'customValue',
              type: 'string',
              default: '',
              description: 'Enter custom label value (only used when "Custom Value" is selected above)',
              placeholder: 'Enter your custom value',
              displayOptions: {
                show: {
                  value: ['__custom__'],
                },
              },
            },
            {
              displayName: 'Action',
              name: 'action',
              type: 'options',
              default: 'add',
              options: [
                {
                  name: 'Add',
                  value: 'add',
                  action: 'Add this label to the email',
                },
                {
                  name: 'Remove',
                  value: 'remove',
                  action: 'Remove this label from the email',
                },
                {
                  name: 'Set',
                  value: 'set',
                  action: 'Replace ALL existing custom labels with only this one',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    // Get mailbox path - no encoding/decoding needed for modern servers
    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    const emailUid = String(context.getNodeParameter('emailUid', itemIndex) || '');
    const flags = context.getNodeParameter('flags', itemIndex) as unknown as { [key: string]: boolean };
    const customLabels = context.getNodeParameter('customLabels', itemIndex) as { label: Array<{ name: string; value: string; customValue: string; action: string }> };

    // Validate parameters
    ParameterValidator.validateUids(emailUid);

    var flagsToSet : string[] = [];
    var flagsToRemove : string[] = [];
    for (const flagName in flags) {
        if (flags[flagName]) {
          flagsToSet.push(flagName);
        } else {
          flagsToRemove.push(flagName);
        }
    }

    // Process custom labels
    let customLabelsToSet: string[] = [];
    let customLabelsToRemove: string[] = [];
    let hasSetAction = false;
    let incompleteLabels: string[] = [];

    if (customLabels.label && Array.isArray(customLabels.label)) {
      for (const labelItem of customLabels.label) {
        // Determine the actual value to use
        let actualValue = labelItem.value;
        if (labelItem.value === '__custom__') {
          actualValue = labelItem.customValue;
        }

        if (labelItem.name && actualValue) {
          const labelString = `${labelItem.name}:${actualValue}`;
          if (labelItem.action === 'add') {
            customLabelsToSet.push(labelString);
          } else if (labelItem.action === 'remove') {
            customLabelsToRemove.push(labelString);
          } else if (labelItem.action === 'set') {
            customLabelsToSet.push(labelString);
            hasSetAction = true;
          }
        } else if (labelItem.name || actualValue) {
          // Partial label - missing name or value
          const missing = [];
          if (!labelItem.name) missing.push('name');
          if (!actualValue) {
            if (labelItem.value === '__custom__') {
              missing.push('custom value');
            } else {
              missing.push('value');
            }
          }
          incompleteLabels.push(`Label missing ${missing.join(' and ')}`);
        }
      }
    }

    // Validate custom labels and provide helpful error messages
    if (incompleteLabels.length > 0) {
      throw new Error(`Custom label validation failed: ${incompleteLabels.join(', ')}. Please ensure both Label Name and Label Value are provided.`);
    }

    // Combine standard flags and custom labels
    const allFlagsToSet = [...flagsToSet, ...customLabelsToSet];
    const allFlagsToRemove = [...flagsToRemove, ...customLabelsToRemove];

    let jsonData: IDataObject = {
      uid: emailUid,
      flagsToSet: allFlagsToSet,
      flagsToRemove: allFlagsToRemove,
      hasSetAction: hasSetAction,
    };

    context.logger?.info(`Setting flags "${allFlagsToSet.join(',')}" and removing flags "${allFlagsToRemove.join(',')}" on email "${emailUid}"`);

    try {
      await client.mailboxOpen(mailboxPath, { readOnly: false });
    } catch (error) {
      const errorMessage = (error as Error).message;
      context.logger?.error(`Failed to open mailbox "${mailboxPath}": ${errorMessage}`);
      throw new Error(`Failed to open mailbox "${mailboxPath}": ${errorMessage}`);
    }

    // Handle "set" action for custom labels - need to replace all custom labels
    if (hasSetAction) {
      // First, get current flags to identify existing custom labels
      const currentFlags = await client.fetchOne(emailUid, { flags: true }, { uid: true });
      if (currentFlags && currentFlags.flags) {
        // Remove all existing custom labels (those with colon in them)
        const existingCustomLabels = Array.from(currentFlags.flags).filter((flag: string) =>
          typeof flag === 'string' && flag.includes(':') && !flag.startsWith('\\')
        );

        if (existingCustomLabels.length > 0) {
          ImapFlowErrorCatcher.getInstance().startErrorCatching();
          const isSuccess = await client.messageFlagsRemove(emailUid, existingCustomLabels, {
            uid: true,
          });
          if (!isSuccess) {
            const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
            throw new NodeImapError(
              context.getNode(),
              "Unable to remove existing custom labels",
              errorsList
            );
          }
        }
      }
    }

    // Add new flags and custom labels
    if (allFlagsToSet.length > 0) {
      ImapFlowErrorCatcher.getInstance().startErrorCatching();
      const isSuccess : boolean = await client.messageFlagsAdd(emailUid, allFlagsToSet, {
        uid: true,
      });
      if (!isSuccess) {
        const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
        throw new NodeImapError(
          context.getNode(),
          "Unable to set flags",
          errorsList
        );
      }
    }

    // Remove specified flags and custom labels (for non-set actions)
    if (allFlagsToRemove.length > 0 && !hasSetAction) {
      const isSuccess : boolean = await client.messageFlagsRemove(emailUid, allFlagsToRemove, {
        uid: true,
      });
      if (!isSuccess) {
        const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
        throw new NodeImapError(
          context.getNode(),
          "Unable to remove flags",
          errorsList
        );
      }
    }

    returnData.push({
      json: jsonData,
    });

    return returnData;
  },
};
