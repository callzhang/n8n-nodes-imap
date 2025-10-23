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

async function testWorkTrueFlagFix(providerName, config) {
  console.log(`\n🧪 Testing "work:true" Flag Fix - ${providerName}`);
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

    // Test the specific "work:true" flag that was causing the error
    console.log('\n🔍 Test: Setting "work:true" custom label');
    try {
      const result = await client.messageFlagsAdd(testUid, ['work:true'], { uid: true });
      console.log(`✅ Set "work:true" custom label: ${result}`);

      // Verify the flag was set by checking current flags
      const currentFlags = await client.fetchOne(testUid, { flags: true }, { uid: true });
      if (currentFlags && currentFlags.flags) {
        const flagsArray = Array.from(currentFlags.flags);
        const hasWorkFlag = flagsArray.includes('work:true');
        console.log(`✅ Verified "work:true" flag is present: ${hasWorkFlag}`);
        console.log(`📋 Current flags: ${flagsArray.join(', ')}`);
      }

    } catch (error) {
      console.log(`❌ Failed to set "work:true" custom label: ${error.message}`);
      return { success: false, error: error.message };
    }

    // Test removing the flag
    console.log('\n🔍 Test: Removing "work:true" custom label');
    try {
      const result = await client.messageFlagsRemove(testUid, ['work:true'], { uid: true });
      console.log(`✅ Removed "work:true" custom label: ${result}`);

      // Verify the flag was removed
      const currentFlags = await client.fetchOne(testUid, { flags: true }, { uid: true });
      if (currentFlags && currentFlags.flags) {
        const flagsArray = Array.from(currentFlags.flags);
        const hasWorkFlag = flagsArray.includes('work:true');
        console.log(`✅ Verified "work:true" flag is removed: ${!hasWorkFlag}`);
        console.log(`📋 Current flags: ${flagsArray.join(', ')}`);
      }

    } catch (error) {
      console.log(`❌ Failed to remove "work:true" custom label: ${error.message}`);
    }

    console.log('\n✅ "work:true" flag tests completed');
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
  console.log('🧪 IMAP "work:true" Flag Fix Tests');
  console.log('==================================\n');

  const results = [];

  // Test Alimail
  if (alimail && alimail.host && alimail.user && alimail.password) {
    const alimailResult = await testWorkTrueFlagFix('Alimail', {
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
    const gmailResult = await testWorkTrueFlagFix('Gmail', {
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
    console.log(`${status} ${result.provider}: ${result.success ? 'work:true flag works correctly' : result.error}`);
  });

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;

  console.log(`\n📈 Results: ${passedTests}/${totalTests} providers passed`);

  if (failedTests > 0) {
    console.log(`❌ ${failedTests} provider(s) failed`);
    process.exit(1);
  } else {
    console.log('🎉 All providers passed! The "work:true" flag fix is working correctly.');
  }
}

runAllTests().catch(console.error);
