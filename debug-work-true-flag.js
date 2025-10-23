const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

// Load credentials
let secrets;
try {
  const secretsFile = fs.readFileSync('secrets.yaml', 'utf8');
  secrets = yaml.load(secretsFile);
} catch (error) {
  console.error('❌ Failed to load secrets.yaml:', error.message);
  process.exit(1);
}

const alimail = secrets.alimail;

async function debugWorkTrueFlag() {
  console.log('🔍 Debugging "work:true" Flag Issue');
  console.log('==================================\n');

  // Parse host and port
  const [host, port] = alimail.host.split(':');
  
  const client = new ImapFlow({
    host: host,
    port: parseInt(port),
    secure: true,
    auth: {
      user: alimail.user,
      pass: alimail.password,
    },
    logger: false
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully');

    // Open a mailbox
    const mailbox = 'INBOX';
    await client.mailboxOpen(mailbox, { readOnly: false });
    console.log(`✅ Opened mailbox: ${mailbox}`);

    // Search for some emails to test with
    let searchResults = await client.search({ seen: false });
    if (!searchResults || searchResults.length === 0) {
      console.log('⚠️  No unseen emails found, trying all emails...');
      searchResults = await client.search({});
      if (!searchResults || searchResults.length === 0) {
        console.log('❌ No emails found at all');
        return;
      }
    }

    const testUid = searchResults[0];
    console.log(`📧 Testing with UID ${testUid}`);

    // Test 1: Direct IMAP command with work:true
    console.log('\n🔍 Test 1: Direct IMAP command with "work:true"');
    try {
      const result = await client.messageFlagsAdd(testUid, ['work:true'], { uid: true });
      console.log(`✅ Direct IMAP "work:true": ${result}`);
    } catch (error) {
      console.log(`❌ Direct IMAP "work:true" failed: ${error.message}`);
    }

    // Test 2: Check if work:true is a valid IMAP flag
    console.log('\n🔍 Test 2: Check current flags before and after');
    try {
      const beforeFlags = await client.fetchOne(testUid, { flags: true }, { uid: true });
      console.log(`📋 Before flags: ${Array.from(beforeFlags.flags).join(', ')}`);
      
      const result = await client.messageFlagsAdd(testUid, ['work:true'], { uid: true });
      console.log(`📋 Add result: ${result}`);
      
      const afterFlags = await client.fetchOne(testUid, { flags: true }, { uid: true });
      console.log(`📋 After flags: ${Array.from(afterFlags.flags).join(', ')}`);
      
    } catch (error) {
      console.log(`❌ Flag check failed: ${error.message}`);
    }

    // Test 3: Try different flag formats
    console.log('\n🔍 Test 3: Try different flag formats');
    const testFlags = ['work:true', 'work:false', 'work:high', 'priority:urgent'];
    
    for (const flag of testFlags) {
      try {
        console.log(`  Testing flag: "${flag}"`);
        const result = await client.messageFlagsAdd(testUid, [flag], { uid: true });
        console.log(`  ✅ Result: ${result}`);
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }

    // Test 4: Check server capabilities
    console.log('\n🔍 Test 4: Check server capabilities');
    try {
      const capabilities = await client.capabilities();
      console.log(`📋 Server capabilities: ${Object.keys(capabilities).join(', ')}`);
    } catch (error) {
      console.log(`❌ Capabilities check failed: ${error.message}`);
    }

    console.log('\n✅ Debug tests completed');

  } catch (error) {
    console.error(`❌ Debug Error: ${error.message}`);
  } finally {
    await client.logout();
    console.log(`🔌 Disconnected`);
  }
}

debugWorkTrueFlag().catch(console.error);
