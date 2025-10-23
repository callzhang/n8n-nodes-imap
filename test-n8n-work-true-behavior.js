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

// Simulate the n8n node's flag processing logic
function processFlags(flags) {
  console.log(`🔍 Processing flags: ${JSON.stringify(flags)}`);
  
  var flagsToSet = [];
  var flagsToRemove = [];
  let customLabelsToSet = [];
  let customLabelsToRemove = [];

  // Process flags and custom labels
  for (const flagName in flags) {
    console.log(`  Processing flag: "${flagName}" = ${flags[flagName]}`);
    
    // Check if this is a custom label (contains colon) or a standard flag
    if (flagName.includes(':')) {
      // This is a custom label, process it separately
      const [labelName, labelValue] = flagName.split(':', 2);
      console.log(`    → Custom label: ${labelName}:${labelValue}`);
      if (flags[flagName]) {
        customLabelsToSet.push(`${labelName}:${labelValue}`);
      } else {
        customLabelsToRemove.push(`${labelName}:${labelValue}`);
      }
    } else {
      // This is a standard flag
      console.log(`    → Standard flag: ${flagName}`);
      if (flags[flagName]) {
        flagsToSet.push(flagName);
      } else {
        flagsToRemove.push(flagName);
      }
    }
  }

  console.log(`📋 Flags to set: ${flagsToSet.join(', ')}`);
  console.log(`📋 Flags to remove: ${flagsToRemove.join(', ')}`);
  console.log(`📋 Custom labels to set: ${customLabelsToSet.join(', ')}`);
  console.log(`📋 Custom labels to remove: ${customLabelsToRemove.join(', ')}`);

  return {
    flagsToSet,
    flagsToRemove,
    customLabelsToSet,
    customLabelsToRemove
  };
}

async function testN8nWorkTrueBehavior() {
  console.log('🧪 Testing N8N "work:true" Behavior');
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

    // Simulate the exact scenario from the error
    console.log('\n🔍 Simulating N8N Node Behavior:');
    
    // This is how the flags object would look in the n8n node
    const flags = {
      'work:true': true
    };

    const processed = processFlags(flags);

    // Test the actual IMAP operations
    console.log('\n🔍 Testing IMAP Operations:');
    
    if (processed.customLabelsToSet.length > 0) {
      console.log(`  Setting custom labels: ${processed.customLabelsToSet.join(', ')}`);
      try {
        const result = await client.messageFlagsAdd(testUid, processed.customLabelsToSet, { uid: true });
        console.log(`  ✅ Result: ${result}`);
        
        if (!result) {
          console.log('  ⚠️  Server returned false - this might be a server limitation');
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    if (processed.flagsToSet.length > 0) {
      console.log(`  Setting standard flags: ${processed.flagsToSet.join(', ')}`);
      try {
        const result = await client.messageFlagsAdd(testUid, processed.flagsToSet, { uid: true });
        console.log(`  ✅ Result: ${result}`);
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n✅ N8N behavior test completed');

  } catch (error) {
    console.error(`❌ Test Error: ${error.message}`);
  } finally {
    await client.logout();
    console.log(`🔌 Disconnected`);
  }
}

testN8nWorkTrueBehavior().catch(console.error);
