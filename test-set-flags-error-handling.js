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
const gmail = secrets.gmail;

async function testSetFlagsErrorHandling(providerName, config) {
  console.log(`\n🧪 Testing Set Flags Error Handling - ${providerName}`);
  console.log('='.repeat(50));

  // Parse host and port
  const [host, port] = config.host.split(':');
  
  const client = new ImapFlow({
    host: host,
    port: parseInt(port),
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully');

    // Open a mailbox
    const mailbox = config.mailbox || 'INBOX';
    await client.mailboxOpen(mailbox, { readOnly: false });
    console.log(`✅ Opened mailbox: ${mailbox}`);

    // Search for some emails to test with
    let searchResults = await client.search({ seen: false });
    if (!searchResults || searchResults.length === 0) {
      console.log('⚠️  No unseen emails found, trying all emails...');
      searchResults = await client.search({});
      if (!searchResults || searchResults.length === 0) {
        console.log('❌ No emails found at all');
        return { success: false, error: 'No emails found to test with' };
      }
    }

    const testUid = searchResults[0];
    console.log(`📧 Testing with UID ${testUid}`);

    // Test 1: Try to set a valid flag
    console.log('\n🔍 Test 1: Setting valid flag (\\Seen)');
    try {
      const result1 = await client.messageFlagsAdd(testUid, ['\\Seen'], { uid: true });
      console.log(`✅ Set \\Seen flag: ${result1}`);
    } catch (error) {
      console.log(`❌ Failed to set \\Seen flag: ${error.message}`);
    }

    // Test 2: Try to set an invalid flag (this should fail gracefully)
    console.log('\n🔍 Test 2: Setting invalid flag (\\InvalidFlag)');
    try {
      const result2 = await client.messageFlagsAdd(testUid, ['\\InvalidFlag'], { uid: true });
      console.log(`✅ Set invalid flag: ${result2}`);
    } catch (error) {
      console.log(`❌ Expected failure for invalid flag: ${error.message}`);
    }

    // Test 3: Try to set flags on non-existent UID
    console.log('\n🔍 Test 3: Setting flags on non-existent UID (999999)');
    try {
      const result3 = await client.messageFlagsAdd(999999, ['\\Seen'], { uid: true });
      console.log(`✅ Set flag on non-existent UID: ${result3}`);
    } catch (error) {
      console.log(`❌ Expected failure for non-existent UID: ${error.message}`);
    }

    // Test 4: Try to remove a flag that doesn't exist
    console.log('\n🔍 Test 4: Removing non-existent flag');
    try {
      const result4 = await client.messageFlagsRemove(testUid, ['\\NonExistentFlag'], { uid: true });
      console.log(`✅ Removed non-existent flag: ${result4}`);
    } catch (error) {
      console.log(`❌ Expected failure for non-existent flag: ${error.message}`);
    }

    // Test 5: Try to set flags with empty array
    console.log('\n🔍 Test 5: Setting flags with empty array');
    try {
      const result5 = await client.messageFlagsAdd(testUid, [], { uid: true });
      console.log(`✅ Set empty flags array: ${result5}`);
    } catch (error) {
      console.log(`❌ Failed with empty flags array: ${error.message}`);
    }

    console.log('\n✅ All error handling tests completed');
    return { success: true };

  } catch (error) {
    console.error(`❌ ${providerName} Test Error: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await client.logout();
    console.log(`🔌 Disconnected from ${providerName}`);
  }
}

async function runAllTests() {
  console.log('🧪 IMAP Set Flags Error Handling Tests');
  console.log('=====================================\n');

  const results = [];

  // Test Alimail
  if (alimail && alimail.host && alimail.user && alimail.password) {
    const alimailResult = await testSetFlagsErrorHandling('Alimail', {
      host: alimail.host,
      user: alimail.user,
      password: alimail.password,
      mailbox: 'INBOX'
    });
    results.push({ provider: 'Alimail', ...alimailResult });
  } else {
    console.log('⚠️  Alimail credentials not available');
  }

  // Test Gmail
  if (gmail && gmail.host && gmail.user && gmail.password) {
    const gmailResult = await testSetFlagsErrorHandling('Gmail', {
      host: gmail.host,
      user: gmail.user,
      password: gmail.password,
      mailbox: 'INBOX'
    });
    results.push({ provider: 'Gmail', ...gmailResult });
  } else {
    console.log('⚠️  Gmail credentials not available');
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.provider}: ${result.success ? 'All tests completed' : result.error}`);
  });

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;

  console.log(`\n📈 Results: ${passedTests}/${totalTests} providers passed`);
  
  if (failedTests > 0) {
    console.log(`❌ ${failedTests} provider(s) failed`);
    process.exit(1);
  } else {
    console.log('🎉 All providers passed!');
  }
}

runAllTests().catch(console.error);
