import { SearchObject } from "imapflow";
import { IDataObject, IExecuteFunctions, INodeProperties } from "n8n-workflow";

enum EmailFlags {
  Answered = 'answered',
  Deleted = 'deleted',
  Draft = 'draft',
  Flagged = 'flagged',
  Recent = 'recent',
  Seen = 'seen',
}

enum EmailSearchFilters {
  BCC = 'bcc',
  CC = 'cc',
  From = 'from',
  Subject = 'subject',
  Text = 'text',
  To = 'to',
  UID = 'uid',
}

export const emailSearchParameters : INodeProperties[] = [
  {
    displayName: "Date Range",
    name: "emailDateRange",
    type: "collection",
    placeholder: "Add Date Range",
    default: {
      since: "",
    },
    options: [
      {
        displayName: "Since",
        name: "since",
        type: "dateTime",
        default: "",
        description: "Start date of search",
      },
      {
        displayName: "Before",
        name: "before",
        type: "dateTime",
        default: "",
        description: "End date of search",
      },
    ],
  },
  // flags
  {
    displayName: "Flags",
    name: "emailFlags",
    type: "collection",
    placeholder: "Add Flag",
    default: {},
    options: [
      {
        displayName: "Is Answered",
        name: EmailFlags.Answered,
        type: "boolean",
        default: false,
        description: "Whether email is answered",
      },
      {
        displayName: "Is Deleted",
        name: EmailFlags.Deleted,
        type: "boolean",
        default: false,
        description: "Whether email is deleted",
      },
      {
        displayName: "Is Draft",
        name: EmailFlags.Draft,
        type: "boolean",
        default: false,
        description: "Whether email is draft",
      },
      {
        displayName: "Is Flagged",
        name: EmailFlags.Flagged,
        type: "boolean",
        default: true,
        description: "Whether email is flagged",
      },
      {
        displayName: "Is Recent",
        name: EmailFlags.Recent,
        type: "boolean",
        default: true,
        description: "Whether email is recent",
      },
      {
        displayName: 'Is Seen (Read)',
        name: EmailFlags.Seen,
        type: "boolean",
        default: false,
        description: "Whether email is seen",
        hint: "If true, only seen emails will be returned. If false, only unseen emails will be returned.",
      },
    ],
  },
  // custom labels
  {
    displayName: "Custom Labels",
    name: "customLabels",
    type: "collection",
    placeholder: "Add Custom Label",
    default: {},
    description: "Search by custom labels (keywords)",
    options: [
      {
        displayName: "Label Name",
        name: "labelName",
        type: "string",
        default: "",
        description: "Name of the custom label to search for",
        placeholder: "Important",
      },
      {
        displayName: "Label Value",
        name: "labelValue",
        type: "string",
        default: "",
        description: "Value to search for in the label",
        placeholder: "true",
      },
    ],
  },
  {
    displayName: "Search Filters",
    name: "emailSearchFilters",
    type: "collection",
    placeholder: "Add Filter",
    hint: "Search filters are case-insensitive and combined with AND (must match all).",
    default: {},
    options: [
      {
        displayName: "BCC Contains",
        name: EmailSearchFilters.BCC,
        type: "string",
        default: "",
        description: "Email address of BCC recipient",
      },
      {
        displayName: "CC Contains",
        name: EmailSearchFilters.CC,
        type: "string",
        default: "",
        description: "Email address of CC recipient",
      },
      {
        displayName: "From Contains",
        name: EmailSearchFilters.From,
        type: "string",
        default: "",
        description: "Email address of sender",
      },
      {
        displayName: "Subject Contains",
        name: EmailSearchFilters.Subject,
        type: "string",
        default: "",
        description: "Email subject",
      },
      {
        displayName: "Text Contains",
        name: EmailSearchFilters.Text,
        type: "string",
        default: "",
        description: "Search text",
      },
      {
        displayName: "To Contains",
        name: EmailSearchFilters.To,
        type: "string",
        default: "",
        description: "Email address of recipient",
      },
      {
        displayName: "UID",
        name: EmailSearchFilters.UID,
        type: "string",
        default: "",
        description: 'Comma-separated list of UIDs',
        placeholder: '1,2,3',
      },
    ],
  },
];

export function getEmailSearchParametersFromNode(context: IExecuteFunctions, itemIndex: number): SearchObject {
  var searchObject: SearchObject = {};

  // date range
  const emailDateRangeObj = context.getNodeParameter('emailDateRange', itemIndex) as IDataObject;
  const since = emailDateRangeObj['since'] as string;
  const before = emailDateRangeObj['before'] as string;

  if (since) {
    searchObject.since = new Date(since);
  }
  if (before) {
    searchObject.before = new Date(before);
  }

  // flags
  const emailFlagsObj = context.getNodeParameter('emailFlags', itemIndex) as IDataObject;
  // check if flag exists (could be undefined)
  if (EmailFlags.Answered in emailFlagsObj) {
    searchObject.answered = emailFlagsObj[EmailFlags.Answered] as boolean;
  }
  if (EmailFlags.Deleted in emailFlagsObj) {
    searchObject.deleted = emailFlagsObj[EmailFlags.Deleted] as boolean;
  }
  if (EmailFlags.Draft in emailFlagsObj) {
    searchObject.draft = emailFlagsObj[EmailFlags.Draft] as boolean;
  }
  if (EmailFlags.Flagged in emailFlagsObj) {
    searchObject.flagged = emailFlagsObj[EmailFlags.Flagged] as boolean;
  }
  if (EmailFlags.Recent in emailFlagsObj) {
    const recent = emailFlagsObj[EmailFlags.Recent] as boolean;
    if (recent) {
      searchObject.recent = true;
    } else {
      searchObject.old = true;
    }
  }
  if (EmailFlags.Seen in emailFlagsObj) {
    searchObject.seen = emailFlagsObj[EmailFlags.Seen] as boolean;
  }

  // custom labels
  const customLabelsObj = context.getNodeParameter('customLabels', itemIndex) as IDataObject;
  if (customLabelsObj.labelName && customLabelsObj.labelValue) {
    const labelName = customLabelsObj.labelName as string;
    const labelValue = customLabelsObj.labelValue as string;
    // Use keyword search for custom labels
    searchObject.keyword = `${labelName}:${labelValue}`;
  }

  // search filters
  const emailSearchFiltersObj = context.getNodeParameter('emailSearchFilters', itemIndex) as IDataObject;
  if (EmailSearchFilters.BCC in emailSearchFiltersObj) {
    searchObject.bcc = emailSearchFiltersObj[EmailSearchFilters.BCC] as string;
  }
  if (EmailSearchFilters.CC in emailSearchFiltersObj) {
    searchObject.cc = emailSearchFiltersObj[EmailSearchFilters.CC] as string;
  }
  if (EmailSearchFilters.From in emailSearchFiltersObj) {
    searchObject.from = emailSearchFiltersObj[EmailSearchFilters.From] as string;
  }
  if (EmailSearchFilters.Subject in emailSearchFiltersObj) {
    searchObject.subject = emailSearchFiltersObj[EmailSearchFilters.Subject] as string;
  }
  if (EmailSearchFilters.Text in emailSearchFiltersObj) {
    searchObject.body = emailSearchFiltersObj[EmailSearchFilters.Text] as string;
  }
  if (EmailSearchFilters.To in emailSearchFiltersObj) {
    searchObject.to = emailSearchFiltersObj[EmailSearchFilters.To] as string;
  }
  if (EmailSearchFilters.UID in emailSearchFiltersObj) {
    searchObject.uid = emailSearchFiltersObj[EmailSearchFilters.UID] as string;
  }

  return searchObject;
}
