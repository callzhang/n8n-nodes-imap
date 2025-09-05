import { ImapFlow } from 'imapflow';
import { ParsedMail, simpleParser } from 'mailparser';
import { IExecuteFunctions, NodeApiError } from 'n8n-workflow';
import { ParameterValidator } from '../utils/helpers';
import { IEmailData, IImapOperation } from '../utils/types';

export class GetEmailOperation implements IImapOperation {
	async execute(
		executeFunctions: IExecuteFunctions,
		client: ImapFlow,
		itemIndex: number,
	): Promise<IEmailData> {
		const mailboxParam = executeFunctions.getNodeParameter('mailbox', itemIndex) as string | { mode: string; value: string };
		const mailbox = ParameterValidator.extractMailboxName(mailboxParam);
		const emailUid = executeFunctions.getNodeParameter('emailUid', itemIndex) as string;

		ParameterValidator.validateMailbox(mailboxParam);
		ParameterValidator.validateUid(emailUid);

		try {
			await client.mailboxOpen(mailbox);
		} catch (error) {
			throw new NodeApiError(executeFunctions.getNode(), {
				message: `Failed to open folder ${mailbox}: ${(error as Error).message}`,
			});
		}

												let message: any;
		try {
			// First, search for the specific UID to verify it exists
			const searchResults = await client.search({ uid: emailUid.toString() });
			if (searchResults.length === 0) {
				throw new NodeApiError(executeFunctions.getNode(), {
					message: `Email with UID ${emailUid} not found in ${mailbox}`,
				});
			}

			// Fetch full email content but skip attachment processing
			const messageGenerator = client.fetch(emailUid.toString(), {
				source: true,  // Full email source for text/html content
				uid: true,
				flags: true,
				size: true
			}, { uid: true });

			// Get the first (and only) message from the generator
			for await (const msg of messageGenerator) {
				message = msg;
				break;
			}

			if (!message) {
				throw new Error(`No message data received for UID ${emailUid}`);
			}
		} catch (error) {
			throw new NodeApiError(executeFunctions.getNode(), {
				message: `Failed to fetch email with UID ${emailUid}: ${(error as Error).message}`,
			});
		}

		if (!message) {
			throw new NodeApiError(executeFunctions.getNode(), {
				message: `Email with UID ${emailUid} not found in ${mailbox}`,
			});
		}

				// Parse email content but skip attachments
		if (!message.source) {
			throw new NodeApiError(executeFunctions.getNode(), {
				message: `Email source not available for UID ${emailUid}`,
			});
		}

		let parsed: ParsedMail;
		try {
			// Parse email content (will include attachments info but we'll ignore them)
			parsed = await simpleParser(message.source);
			console.log('Email parsed successfully:', {
				subject: parsed.subject,
				fromCount: parsed.from ? 1 : 0,
				textLength: typeof parsed.text === 'string' ? parsed.text.length : 0,
				htmlLength: typeof parsed.html === 'string' ? parsed.html.length : 0
			});
		} catch (error) {
			console.error('Email parsing failed:', error);
			throw new NodeApiError(executeFunctions.getNode(), {
				message: `Failed to parse email content: ${(error as Error).message}`,
			});
		}

		// Helper function to normalize address objects to arrays
		const normalizeAddresses = (addresses: any): any[] => {
			if (!addresses) return [];
			return Array.isArray(addresses) ? addresses : [addresses];
		};

		// Return email data with content but NO attachments
		const emailData: IEmailData = {
			uid: typeof message.uid === 'string' ? parseInt(message.uid, 10) : message.uid,
			subject: parsed.subject || '',
			from: parsed.from || {},
			to: normalizeAddresses(parsed.to),
			cc: normalizeAddresses(parsed.cc),
			bcc: normalizeAddresses(parsed.bcc),
			date: parsed.date || null,
			text: parsed.text || '',    // Full text content
			html: parsed.html || '',    // Full HTML content
			attachments: [],  // NO attachments - use downloadAttachment operation instead
			flags: message.flags || new Set(),
			seen: message.flags?.has('\\Seen') || false,
			size: message.size
		};

		console.log('Email data prepared for return:', {
			uid: emailData.uid,
			subject: emailData.subject,
			from: emailData.from,
			textLength: emailData.text?.length || 0,
			htmlLength: emailData.html?.length || 0,
			flagsCount: emailData.flags.size
		});

		return emailData;
	}
}
