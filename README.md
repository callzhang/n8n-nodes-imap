# <img src="nodes/Imap/node-imap-enhanced-icon.svg"  height="40"> n8n-nodes-imap-enhanced

This is an enhanced n8n community node that adds support for [IMAP](https://en.wikipedia.org/wiki/Internet_Message_Access_Protocol) email servers with advanced features including multiple mailbox support, custom labels, limit parameters, and professional HTML to Markdown conversion.

* [Installation](#installation)  
* [Operations](#operations)  
* [Credentials](#credentials)
* [Version history](CHANGELOG.md)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Use `n8n-nodes-imap-enhanced` in N8N settings to install the stable version.

To install beta version, use `n8n-nodes-imap-enhanced@beta`.

NPMJS: [n8n-nodes-imap-enhanced](https://www.npmjs.com/package/n8n-nodes-imap-enhanced)


## Operations

* Mailbox
  * Get list of mailboxes (including status information like number of messages) **with limit parameter**
  * Get status of a mailbox (number of messages, etc.)
  * Create a mailbox
  * Rename a mailbox
  * ~Delete a mailbox~ (disabled due to danger of accidental data loss and no apparent use case)
* Email
  * **Get list of emails from multiple mailboxes** **with limit parameter and three content formats (text, markdown, html)**
  * **Get single email from multiple mailboxes** with comprehensive content processing
  * Download attachments from an email
  * Move an email to another mailbox
  * Copy an email into another mailbox
  * Set/remove flags on an email ("seen", "answered", "flagged", "deleted", "draft") **with custom labels support**
  * **Manage custom labels** (add, remove, set custom labels/keywords)
  * Create email draft in a mailbox
    * Use `n8n-nodes-eml` node to create complex emails. It supports attachments and other features.

## New Features

### Professional Content Processing
- **Three Content Formats**: Returns `text`, `markdown`, and `html` fields for email body content
- **Professional Markdown**: Uses `node-html-markdown` library for accurate HTML to Markdown conversion
- **Clean Text**: Converts HTML to readable plain text with proper formatting
- **Standard Fields**: Always includes flags/labels and structured envelope data

### Multiple Mailbox Support
- **Multi-Selection**: Select multiple mailboxes simultaneously for comprehensive email searches
- **ALL Mailboxes Option**: Empty mailbox selection automatically searches ALL available mailboxes
- **Cross-Mailbox Search**: Find emails across multiple mailboxes in a single operation
- **Mailbox Tracking**: Each email result includes the source mailbox path for better organization

### Custom Labels Support
- **Search by Custom Labels**: Search emails using custom labels/keywords
- **Label Management**: Add, remove, or set custom labels on emails
- **Flexible Format**: Support for `labelName:labelValue` format (e.g., "Priority:High")

### Limit Parameters
- **Email List Limit**: Control maximum number of emails returned
- **Mailbox List Limit**: Control maximum number of mailboxes returned
- **Performance Optimization**: Prevents excessive data fetching

### Text Search Limitations & Solutions
- **Server Limitations**: Some IMAP servers (like Alimail `imap.qiye.aliyun.com`) don't support text-based searches (`SUBJECT`, `BODY`, `FROM`, `TO`)
- **Recommended Workaround**: Use "Get Many" operation with multiple mailboxes, then filter results locally using n8n's "Filter" node
- **Cross-Mailbox Search**: Our multiple mailbox feature is perfect for this - search all mailboxes and filter locally
- **Better Performance**: Local filtering gives you more control and works reliably across all IMAP servers

### Output Structure
```json
{
  "seq": 415,
  "uid": 18718,
  "mailboxPath": "INBOX",
  "envelope": {
    "subject": "Email Subject",
    "from": [{"name": "Sender", "address": "sender@example.com"}],
    "to": [{"name": "Recipient", "address": "recipient@example.com"}],
    "date": "2025-01-XX",
    "messageId": "<message-id>"
  },
  "labels": ["\\Seen"],
  "size": 12345,
  "text": "Plain text content",
  "markdown": "# Header\n\n**Bold** text",
  "html": "<p>HTML content</p>"
}
```

## Usage Examples

### Multiple Mailbox Search
To search for emails across multiple mailboxes:

1. **Search All Mailboxes**: Leave the "Mailbox" field empty to search all available mailboxes
2. **Search Specific Mailboxes**: Select multiple mailboxes (e.g., INBOX, Sent, Drafts)
3. **Filter Results**: Use n8n's "Filter" node to search for specific text content

### Text Search Workaround
For IMAP servers that don't support text-based searches (like Alimail):

1. Use "Get Many" operation with empty mailbox selection (searches all mailboxes)
2. Add a "Filter" node after the IMAP node
3. Configure the filter to search in email fields like `envelope.subject`, `textContent`, `htmlContent`, etc.

Example filter expression:
```
{{ $json.envelope.subject.includes("Mary") || $json.textContent.includes("Mary") }}
```

## Credentials

Currently, this node supports only basic authentication (username and password).  
OAuth2 authentication is not supported yet.  

> NOTE: You can reuse core [N8N IMAP Trigger node](https://docs.n8n.io/integrations/builtin/credentials/imap/) credentials for this node.

