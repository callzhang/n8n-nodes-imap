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
      description: 'Custom labels (keywords) to add or remove',
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
              type: 'string',
              default: '',
              description: 'Value of the custom label',
              placeholder: 'true',
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
                },
                {
                  name: 'Remove',
                  value: 'remove',
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

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;
    const flags = context.getNodeParameter('flags', itemIndex) as unknown as { [key: string]: boolean };
    const customLabels = context.getNodeParameter('customLabels', itemIndex) as { label: Array<{ name: string; value: string; action: string }> };

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
    if (customLabels.label && Array.isArray(customLabels.label)) {
      for (const labelItem of customLabels.label) {
        if (labelItem.name && labelItem.value) {
          const labelString = `${labelItem.name}:${labelItem.value}`;
          if (labelItem.action === 'add') {
            flagsToSet.push(labelString);
          } else if (labelItem.action === 'remove') {
            flagsToRemove.push(labelString);
          }
        }
      }
    }

    let jsonData: IDataObject = {
      uid: emailUid,
      flagsToSet: flagsToSet,
      flagsToRemove: flagsToRemove,
    };

    context.logger?.info(`Setting flags "${flagsToSet.join(',')}" and removing flags "${flagsToRemove.join(',')}" on email "${emailUid}"`);

    try {
      await client.mailboxOpen(mailboxPath, { readOnly: false });
    } catch (error) {
      throw new Error(`Failed to open mailbox ${mailboxPath}: ${(error as Error).message}`);
    }

    if (flagsToSet.length > 0) {
      ImapFlowErrorCatcher.getInstance().startErrorCatching();
      const isSuccess : boolean = await client.messageFlagsAdd(emailUid, flagsToSet, {
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
    if (flagsToRemove.length > 0) {
      const isSuccess : boolean = await client.messageFlagsRemove(emailUid, flagsToRemove, {
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
