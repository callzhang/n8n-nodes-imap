import { ImapFlow } from "imapflow";
import { IDataObject, IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';
import { ImapFlowErrorCatcher, NodeImapError } from "../../../utils/ImapUtils";

export const manageEmailLabelsOperation: IResourceOperationDef = {
  operation: {
    name: 'Manage Labels',
    value: 'manageEmailLabels',
    description: 'Add or remove custom labels (keywords) on emails',
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
      description: 'UID of the email to manage labels',
      hint: 'You can use comma separated list of UIDs',
    },
    {
      displayName: 'Action',
      name: 'action',
      type: 'options',
      default: 'add',
      options: [
        {
          name: 'Add Labels',
          value: 'add',
          action: 'Add custom labels to the email',
          description: 'Add custom labels to the email',
        },
        {
          name: 'Remove Labels',
          value: 'remove',
          action: 'Remove custom labels from the email',
          description: 'Remove custom labels from the email',
        },
        {
          name: 'Set Labels',
          value: 'set',
          action: 'Set custom labels replace existing ones',
          description: 'Set custom labels (replace existing ones)',
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
      required: true,
      placeholder: 'Add Custom Label',
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
          ],
        },
      ],
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;
    const action = context.getNodeParameter('action', itemIndex) as string;
    const customLabels = context.getNodeParameter('customLabels', itemIndex) as { label: Array<{ name: string; value: string }> };

    // Extract labels from the fixed collection
    const labels: string[] = [];
    if (customLabels.label && Array.isArray(customLabels.label)) {
      for (const labelItem of customLabels.label) {
        if (labelItem.name && labelItem.value) {
          labels.push(`${labelItem.name}:${labelItem.value}`);
        }
      }
    }

    if (labels.length === 0) {
      throw new Error('No custom labels provided');
    }

    let jsonData: IDataObject = {
      uid: emailUid,
      action: action,
      labels: labels,
    };

    context.logger?.info(`Managing labels "${labels.join(',')}" on email "${emailUid}" with action "${action}"`);

    await client.mailboxOpen(mailboxPath, { readOnly: false });

    ImapFlowErrorCatcher.getInstance().startErrorCatching();

    let isSuccess = false;
    if (action === 'add') {
      isSuccess = await client.messageFlagsAdd(emailUid, labels, {
        uid: true,
      });
    } else if (action === 'remove') {
      isSuccess = await client.messageFlagsRemove(emailUid, labels, {
        uid: true,
      });
    } else if (action === 'set') {
      // For set action, we need to first get current flags and then set the new ones
      // This is a simplified implementation - in practice, you might want to preserve system flags
      isSuccess = await client.messageFlagsSet(emailUid, labels, {
        uid: true,
      });
    }

    if (!isSuccess) {
      const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
      throw new NodeImapError(
        context.getNode(),
        `Unable to ${action} labels`,
        errorsList
      );
    }

    ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();

    returnData.push({
      json: jsonData,
    });

    return returnData;
  },
};
