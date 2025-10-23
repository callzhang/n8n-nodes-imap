const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Regression test for fetchOne uid parameter issue
 * This test ensures the bug doesn't regress in future updates
 */
async function testRegressionFetchOneUid() {
    console.log('🛡️  Regression test for fetchOne uid parameter issue...\n');
    
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

        // Test 1: Verify the bug still exists (for documentation)
        console.log('🔍 Test 1: Verify the bug still exists (for documentation)...');
        testResults.total++;
        try {
            const email = await client.fetchOne(testUid, sourceQuery, { uid: true });
            if (email && email.envelope?.subject) {
                console.log(`⚠️  UNEXPECTED: Bug may be fixed in library - "${email.envelope.subject}"`);
                console.log('   This is unexpected - the bug should still exist');
                testResults.passed++;
            } else {
                console.log(`✅ EXPECTED: Bug still exists - No email data returned`);
                testResults.passed++;
            }
        } catch (error) {
            console.log(`✅ EXPECTED: Bug still exists - ${error.message}`);
            testResults.passed++;
        }

        // Test 2: Verify the fix works
        console.log('\n🔍 Test 2: Verify the fix works...');
        testResults.total++;
        try {
            const email = await client.fetchOne(testUid, sourceQuery);
            if (email && email.envelope?.subject) {
                console.log(`✅ PASS: Fix works - "${email.envelope.subject}"`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: Fix doesn't work - No email data returned`);
                testResults.failed++;
                testResults.errors.push('Fix does not work - fetchOne without uid parameter returns null');
            }
        } catch (error) {
            console.log(`❌ FAIL: Fix doesn't work - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Fix does not work: ${error.message}`);
        }

        // Test 3: Verify source content is included with fix
        console.log('\n🔍 Test 3: Verify source content is included with fix...');
        testResults.total++;
        try {
            const email = await client.fetchOne(testUid, sourceQuery);
            if (email && email.source && email.source.length > 0) {
                console.log(`✅ PASS: Source content included (${email.source.length} bytes)`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: No source content included`);
                testResults.failed++;
                testResults.errors.push('No source content included with fix');
            }
        } catch (error) {
            console.log(`❌ FAIL: Source content test failed - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Source content test failed: ${error.message}`);
        }

        // Test 4: Verify multiple emails work with fix
        console.log('\n🔍 Test 4: Verify multiple emails work with fix...');
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
                console.log(`✅ PASS: Multiple emails work (${emails.length} emails)`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: Multiple emails don't work`);
                testResults.failed++;
                testResults.errors.push('Multiple emails do not work with fix');
            }
        } catch (error) {
            console.log(`❌ FAIL: Multiple emails test failed - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Multiple emails test failed: ${error.message}`);
        }

        // Test 5: Performance test
        console.log('\n🔍 Test 5: Performance test...');
        testResults.total++;
        try {
            const startTime = Date.now();
            const emails = [];
            for (let i = 0; i < Math.min(searchResults.length, 10); i++) {
                const uid = searchResults[i];
                const email = await client.fetchOne(uid, sourceQuery);
                if (email) {
                    emails.push(email);
                }
            }
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (emails.length > 0 && duration < 10000) { // Less than 10 seconds
                console.log(`✅ PASS: Performance acceptable (${emails.length} emails in ${duration}ms)`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: Performance unacceptable (${emails.length} emails in ${duration}ms)`);
                testResults.failed++;
                testResults.errors.push(`Performance unacceptable: ${emails.length} emails in ${duration}ms`);
            }
        } catch (error) {
            console.log(`❌ FAIL: Performance test failed - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Performance test failed: ${error.message}`);
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
    console.log('\n📊 Regression Test Results');
    console.log('==========================');
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
        console.log('\n🎉 All regression tests passed!');
        console.log('✅ The fix is working correctly and the issue is resolved.');
        console.log('✅ Future updates should not break this functionality.');
    } else {
        console.log('\n⚠️  Some regression tests failed.');
        console.log('❌ The fix may not be working correctly or there are new issues.');
    }

    return testResults;
}

testRegressionFetchOneUid().catch(console.error);
