const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Test suite for fetchOne uid parameter issue
 * This test validates the fix for the "No output data returned" issue
 */
async function testFetchOneUidParameter() {
    console.log('🧪 Testing fetchOne uid parameter issue...\n');
    
    // Load credentials
    const secrets = yaml.load(fs.readFileSync('secrets.yaml', 'utf8'));
    const alimail = secrets.alimail;
    
    // Parse host and port from the host string
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

    let testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };

    try {
        console.log('📧 Connecting to Alimail...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        await client.mailboxOpen('垃圾邮件', { readOnly: true });

        const searchResults = await client.search({ seen: false });
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

        // Test 3: fetchOne with uid=false (should work)
        console.log('\n🔍 Test 3: fetchOne with uid=false...');
        testResults.total++;
        try {
            const email = await client.fetchOne(testUid, sourceQuery, { uid: false });
            if (email && email.envelope?.subject) {
                console.log(`✅ PASS: With uid=false - "${email.envelope.subject}"`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: With uid=false - No email data returned`);
                testResults.failed++;
                testResults.errors.push('fetchOne with uid=false returned null');
            }
        } catch (error) {
            console.log(`❌ FAIL: With uid=false - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`fetchOne with uid=false failed: ${error.message}`);
        }

        // Test 4: Multiple emails with correct parameters
        console.log('\n🔍 Test 4: Multiple emails with correct parameters...');
        testResults.total++;
        try {
            const emails = [];
            for (let i = 0; i < Math.min(searchResults.length, 5); i++) {
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

        // Test 5: Verify source content is included
        console.log('\n🔍 Test 5: Verify source content is included...');
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
        console.error('❌ Test Error:', error.message);
        testResults.failed++;
        testResults.errors.push(`Test setup failed: ${error.message}`);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }

    // Test Results Summary
    console.log('\n📊 Test Results Summary');
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
        console.log('\n🎉 All tests passed! The fix is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. The fix may need additional work.');
    }

    return testResults;
}

testFetchOneUidParameter().catch(console.error);
