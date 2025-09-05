import { IResourceDef } from '../../utils/CommonDefinitions';
import { resourceEmail } from './ResourceName';
import { copyEmailOperation } from './functions/EmailCopy';
import { createDraftOperation } from './functions/EmailCreateDraft';
import { downloadOperation } from './functions/EmailDownload';
import { downloadAttachmentOperation } from './functions/EmailDownloadAttachment';
import { getEmailsListOperation } from './functions/EmailGetList';
import { getSingleEmailOperation } from './functions/EmailGetSingle';
import { moveEmailOperation } from './functions/EmailMove';
import { setEmailFlagsOperation } from './functions/EmailSetFlags';
import { manageEmailLabelsOperation } from './functions/EmailManageLabels';

export const emailResourceDefinitions: IResourceDef = {
	resource: resourceEmail,
	operationDefs: [
		getEmailsListOperation,
		getSingleEmailOperation,
		downloadOperation,
		downloadAttachmentOperation,
		moveEmailOperation,
		copyEmailOperation,
		setEmailFlagsOperation,
		createDraftOperation,
		manageEmailLabelsOperation,
	],
};
