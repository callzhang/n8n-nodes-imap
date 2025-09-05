const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

// Test credentials
const config = {
  host: 'imap.qiye.aliyun.com',
  port: 993,
  secure: true,
  auth: {
    user: 'derek@stardust.ai',
    pass: 'wTYaIgdcdeLDeG0V'
  }
};

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function testRawMessage() {
  console.log('🔌 Connecting to IMAP server...');
  const client = new ImapFlow(config);
  
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Open INBOX
    console.log('📁 Opening INBOX...');
    await client.mailboxOpen('INBOX');
    console.log('✅ INBOX opened successfully!');
    
    // Search for recent emails
    console.log('🔍 Searching for recent emails...');
    const searchResult = await client.search({ seen: false }, { uid: true });
    console.log(`Found ${searchResult.length} unread emails`);
    
    if (searchResult.length === 0) {
      console.log('📧 No unread emails found, searching for any recent emails...');
      const allEmails = await client.search({ all: true }, { uid: true });
      console.log(`Found ${allEmails.length} total emails`);
      
      if (allEmails.length === 0) {
        console.log('❌ No emails found in mailbox');
        return;
      }
      
      // Use the most recent email
      searchResult.push(allEmails[allEmails.length - 1]);
    }
    
    // Test with the first email
    const emailUid = searchResult[0];
    console.log(`📧 Testing with email UID: ${emailUid}`);
    
    // Download the raw message
    console.log('📥 Downloading raw message...');
    const rawMessage = await client.download(emailUid, 'TEXT', { uid: true });
    
    if (rawMessage.content) {
      console.log('✅ Raw message downloaded successfully!');
      
      // Convert stream to string
      const rawContent = await streamToString(rawMessage.content);
      console.log(`Raw content length: ${rawContent.length} characters`);
      
      // Parse with mailparser
      console.log('🔍 Parsing with mailparser...');
      const parsed = await simpleParser(rawContent);
      
      console.log('\n📋 Parsed Email:');
      console.log(`  Subject: ${parsed.subject || 'No subject'}`);
      console.log(`  From: ${parsed.from?.text || 'No from'}`);
      console.log(`  To: ${parsed.to?.text || 'No to'}`);
      console.log(`  Date: ${parsed.date || 'No date'}`);
      console.log(`  Message ID: ${parsed.messageId || 'No message ID'}`);
      
      // Check for text content
      if (parsed.text) {
        console.log('\n📝 Text Content:');
        console.log(`  Length: ${parsed.text.length} characters`);
        console.log(`  Preview: ${parsed.text.substring(0, 200)}...`);
      } else {
        console.log('\n❌ No text content found');
      }
      
      // Check for HTML content
      if (parsed.html) {
        console.log('\n🌐 HTML Content:');
        console.log(`  Length: ${parsed.html.length} characters`);
        console.log(`  Preview: ${parsed.html.substring(0, 200)}...`);
      } else {
        console.log('\n❌ No HTML content found');
      }
      
      // Check for attachments
      if (parsed.attachments && parsed.attachments.length > 0) {
        console.log('\n📎 Attachments:');
        parsed.attachments.forEach((attachment, index) => {
          console.log(`  ${index + 1}. ${attachment.filename || 'unnamed'} (${attachment.contentType})`);
        });
      } else {
        console.log('\n📎 No attachments found');
      }
      
      // Check headers
      console.log('\n📋 Headers:');
      console.log(`  Content-Type: ${parsed.headers.get('content-type') || 'Not found'}`);
      console.log(`  Content-Transfer-Encoding: ${parsed.headers.get('content-transfer-encoding') || 'Not found'}`);
      console.log(`  MIME-Version: ${parsed.headers.get('mime-version') || 'Not found'}`);
      
    } else {
      console.log('❌ No raw message content found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('\n🔌 Closing connection...');
    await client.logout();
    console.log('✅ Connection closed');
  }
}

// Run the test
console.log('🚀 Starting raw message test...');
testRawMessage().catch(console.error);
