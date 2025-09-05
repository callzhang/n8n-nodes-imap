import { ImapFlow } from 'imapflow';
import { IExecuteFunctions, NodeApiError, INodeExecutionData } from 'n8n-workflow';
import { ParameterValidator } from '../utils/helpers';
import { IImapOperation } from '../utils/types';

export class MarkEmailOperation implements IImapOperation {
	async execute(
		executeFunctions: IExecuteFunctions,
		client: ImapFlow,
		itemIndex: number,
	): Promise<INodeExecutionData[]> {
		const mailboxParam = executeFunctions.getNodeParameter('mailbox', itemIndex) as string | { mode: string; value: string };
		const mailbox = ParameterValidator.extractMailboxName(mailboxParam);
		const emailUid = executeFunctions.getNodeParameter('emailUid', itemIndex) as string;
		const markAs = executeFunctions.getNodeParameter('markAs', itemIndex) as string;

		ParameterValidator.validateMailbox(mailboxParam);
		ParameterValidator.validateUid(emailUid);

		const returnData: INodeExecutionData[] = [];

		executeFunctions.logger?.info(`Marking email "${emailUid}" as ${markAs} in "${mailbox}"`);

		try {
			await client.mailboxOpen(mailbox, { readOnly: false });
		} catch (error) {
			throw new NodeApiError(executeFunctions.getNode(), {
				message: `Failed to open mailbox ${mailbox}: ${(error as Error).message}`,
			});
		}

		try {
			let result: boolean;
			if (markAs === 'read') {
				result = await client.messageFlagsAdd(emailUid, ['\\Seen'], { uid: true });
			} else {
				result = await client.messageFlagsRemove(emailUid, ['\\Seen'], { uid: true });
			}

			if (!result) {
				throw new NodeApiError(executeFunctions.getNode(), {
					message: "Unable to mark email - no response from server",
				});
			}

			const jsonData = {
				success: true,
				message: `Email marked as ${markAs}`,
				uid: emailUid,
			};

			returnData.push({
				json: jsonData,
			});

			return returnData;
		} catch (error) {
			throw new NodeApiError(executeFunctions.getNode(), {
				message: `Failed to mark email: ${(error as Error).message}`,
			});
		}
	}
}
