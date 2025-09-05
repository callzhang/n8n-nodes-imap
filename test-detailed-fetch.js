const { ImapFlow } = require('imapflow');

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

async function testDetailedFetch() {
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
    
    // Test with multiple emails to find one with proper structure
    console.log('\n🔍 Testing multiple emails to find one with proper structure...');
    
    for (let i = 0; i < Math.min(5, searchResult.length); i++) {
      const emailUid = searchResult[i];
      console.log(`\n📧 Testing email ${i + 1}/5 - UID: ${emailUid}`);
      
      try {
        // Fetch email with different query combinations
        console.log('📥 Fetching with basic query...');
        const basicQuery = {
          uid: true,
          envelope: true
        };
        
        const basicEmail = await client.fetchOne(emailUid, basicQuery);
        console.log('✅ Basic fetch successful');
        console.log(`  Envelope: ${JSON.stringify(basicEmail.envelope, null, 2)}`);
        
        // Try fetching with body structure
        console.log('📥 Fetching with body structure...');
        const bodyQuery = {
          uid: true,
          envelope: true,
          bodyStructure: true
        };
        
        const bodyEmail = await client.fetchOne(emailUid, bodyQuery);
        console.log('✅ Body structure fetch successful');
        console.log(`  Body Structure: ${JSON.stringify(bodyEmail.bodyStructure, null, 2)}`);
        
        // Try fetching with flags
        console.log('📥 Fetching with flags...');
        const flagsQuery = {
          uid: true,
          flags: true
        };
        
        const flagsEmail = await client.fetchOne(emailUid, flagsQuery);
        console.log('✅ Flags fetch successful');
        console.log(`  Flags: ${JSON.stringify(flagsEmail.flags, null, 2)}`);
        
        // Try fetching the whole message
        console.log('📥 Fetching whole message...');
        try {
          const wholeMessage = await client.download(emailUid, 'TEXT', { uid: true });
          if (wholeMessage.content) {
            console.log('✅ Whole message downloaded successfully');
            console.log(`  Content type: ${wholeMessage.contentType}`);
            console.log(`  Content encoding: ${wholeMessage.contentEncoding}`);
            console.log(`  Content size: ${wholeMessage.size} bytes`);
          } else {
            console.log('❌ No content in whole message');
          }
        } catch (downloadError) {
          console.log(`❌ Error downloading whole message: ${downloadError.message}`);
        }
        
        // If we found a good email, break
        if (basicEmail.envelope && bodyEmail.bodyStructure) {
          console.log('🎉 Found email with proper structure!');
          break;
        }
        
      } catch (error) {
        console.log(`❌ Error testing email ${emailUid}: ${error.message}`);
      }
    }
    
    // Try a different approach - fetch multiple emails at once
    console.log('\n🔍 Testing batch fetch...');
    try {
      const batchQuery = {
        uid: true,
        envelope: true,
        bodyStructure: true,
        flags: true
      };
      
      const batchEmails = await client.fetch(searchResult.slice(0, 3), batchQuery);
      console.log(`✅ Batch fetch successful, got ${batchEmails.length} emails`);
      
      for (const email of batchEmails) {
        console.log(`\n📧 Email UID: ${email.uid}`);
        console.log(`  Envelope: ${email.envelope ? 'Present' : 'Missing'}`);
        console.log(`  Body Structure: ${email.bodyStructure ? 'Present' : 'Missing'}`);
        console.log(`  Flags: ${email.flags ? 'Present' : 'Missing'}`);
        
        if (email.envelope) {
          console.log(`  Subject: ${email.envelope.subject || 'No subject'}`);
          console.log(`  From: ${email.envelope.from?.[0]?.address || 'No from'}`);
        }
        
        if (email.bodyStructure) {
          console.log(`  Body Structure Type: ${email.bodyStructure.type || 'Unknown'}`);
          console.log(`  Body Structure Subtype: ${email.bodyStructure.subtype || 'Unknown'}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error in batch fetch: ${error.message}`);
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
console.log('🚀 Starting detailed fetch test...');
testDetailedFetch().catch(console.error);
