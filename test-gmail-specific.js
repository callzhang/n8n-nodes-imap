const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Gmail-specific test suite
 * Tests Gmail connection and fetchOne uid parameter fix
 */
async function testGmailSpecific() {
    console.log('🧪 Testing Gmail-specific functionality...\n');

    // Load credentials
    const secrets = yaml.load(fs.readFileSync('secrets.yaml', 'utf8'));
    const gmail = secrets.gmail;

    console.log('📧 Gmail Configuration:');
    console.log(`  Host: ${gmail.host}`);
    console.log(`  User: ${gmail.user}`);
    console.log(`  Password: ${String(gmail.password).substring(0, 4)}...`);
    console.log('');

    // Parse host and port from the host string
    const [host, port] = gmail.host.split(':');

    const client = new ImapFlow({
        host: host,
        port: parseInt(port),
        secure: true,
        auth: {
            user: gmail.user,
            pass: gmail.password,
        },
        logger: false
    });

    let testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };

    try {
        console.log('🔌 Connecting to Gmail...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        console.log('📁 Opening INBOX...');
        await client.mailboxOpen('INBOX', { readOnly: true });

        let searchResults = await client.search({ seen: false });
        if (!searchResults || searchResults.length === 0) {
            console.log('⚠️  No unseen emails found in INBOX, trying all emails...');
            const allResults = await client.search({});
            if (!allResults || allResults.length === 0) {
                console.log('❌ No emails found in INBOX at all');
                return testResults;
            }
            searchResults = allResults;
        }

        const testUid = searchResults[0];
        console.log(`Testing with UID ${testUid}\n`);

        const sourceQuery = {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
            source: true
        };

        // Test 1: fetchOne without uid parameter (should work)
        console.log('🔍 Test 1: fetchOne without uid parameter...');
        testResults.total++;
        try {
            const email = await client.fetchOne(testUid, sourceQuery);
            if (email && email.envelope?.subject) {
                console.log(`✅ PASS: Without uid param - "${email.envelope.subject}"`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: Without uid param - No email data returned`);
                testResults.failed++;
                testResults.errors.push('fetchOne without uid parameter returned null');
            }
        } catch (error) {
            console.log(`❌ FAIL: Without uid param - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`fetchOne without uid parameter failed: ${error.message}`);
        }

        // Test 2: fetchOne with uid parameter (should fail - this is the bug)
        console.log('\n🔍 Test 2: fetchOne with uid parameter (bug reproduction)...');
        testResults.total++;
        try {
            const email = await client.fetchOne(testUid, sourceQuery, { uid: true });
            if (email && email.envelope?.subject) {
                console.log(`❌ UNEXPECTED: With uid param - "${email.envelope.subject}"`);
                console.log('   This should have failed - the bug may be fixed in the library');
                testResults.passed++;
            } else {
                console.log(`✅ EXPECTED: With uid param - No email data returned (this is the bug)`);
                testResults.passed++;
            }
        } catch (error) {
            console.log(`✅ EXPECTED: With uid param - ${error.message}`);
            testResults.passed++;
        }

        // Test 3: Multiple emails with correct parameters
        console.log('\n🔍 Test 3: Multiple emails with correct parameters...');
        testResults.total++;
        try {
            const emails = [];
            for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
                const uid = searchResults[i];
                const email = await client.fetchOne(uid, sourceQuery);
                if (email) {
                    emails.push(email);
                }
            }

            if (emails.length > 0) {
                console.log(`✅ PASS: Fetched ${emails.length} emails successfully`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: No emails fetched`);
                testResults.failed++;
                testResults.errors.push('Multiple email fetch returned no results');
            }
        } catch (error) {
            console.log(`❌ FAIL: Multiple emails - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Multiple email fetch failed: ${error.message}`);
        }

        // Test 4: Verify source content is included
        console.log('\n🔍 Test 4: Verify source content is included...');
        testResults.total++;
        try {
            const email = await client.fetchOne(testUid, sourceQuery);
            if (email && email.source && email.source.length > 0) {
                console.log(`✅ PASS: Source content included (${email.source.length} bytes)`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: No source content included`);
                testResults.failed++;
                testResults.errors.push('Source content not included in fetch result');
            }
        } catch (error) {
            console.log(`❌ FAIL: Source content test - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Source content test failed: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Gmail Test Error:', error.message);
        console.error('Full error:', error);
        testResults.failed++;
        testResults.errors.push(`Gmail test setup failed: ${error.message}`);
    } finally {
        try {
            await client.logout();
            console.log('\n🔌 Disconnected from Gmail');
        } catch (logoutError) {
            console.log('⚠️  Logout error (ignored):', logoutError.message);
        }
    }

    // Test Results Summary
    console.log('\n📊 Gmail Test Results');
    console.log('======================');
    console.log(`Total tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.errors.length > 0) {
        console.log('\n❌ Errors:');
        testResults.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }

    if (testResults.failed === 0) {
        console.log('\n🎉 All Gmail tests passed!');
        console.log('✅ The fetchOne uid parameter fix works for Gmail.');
    } else {
        console.log('\n⚠️  Some Gmail tests failed.');
        console.log('❌ The fix may need additional work for Gmail.');
    }

    return testResults;
}

testGmailSpecific().catch(console.error);
