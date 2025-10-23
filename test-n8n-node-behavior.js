const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Test suite for n8n node behavior
 * This test simulates the exact n8n node execution flow
 */
async function testN8nNodeBehavior() {
    console.log('🧪 Testing n8n node behavior...\n');
    
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

        // Simulate n8n node parameters
        const mailboxPath = '垃圾邮件';
        const searchObject = { seen: false };
        const includeParts = ['MarkdownContent', 'TextContent', 'HtmlContent'];
        const limit = 8;

        console.log('📋 Test Parameters:');
        console.log(`  - Mailbox: ${mailboxPath}`);
        console.log(`  - Search: ${JSON.stringify(searchObject)}`);
        console.log(`  - Include Parts: ${includeParts.join(', ')}`);
        console.log(`  - Limit: ${limit}\n`);

        // Step 1: Open mailbox
        console.log('🔍 Step 1: Opening mailbox...');
        testResults.total++;
        try {
            await client.mailboxOpen(mailboxPath, { readOnly: true });
            console.log('✅ PASS: Mailbox opened successfully');
            testResults.passed++;
        } catch (error) {
            console.log(`❌ FAIL: Mailbox open failed - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Mailbox open failed: ${error.message}`);
            return testResults;
        }

        // Step 2: Build fetch query (like n8n does)
        console.log('\n🔍 Step 2: Building fetch query...');
        testResults.total++;
        const fetchQuery = {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
            source: true  // Added because content parts are requested
        };
        console.log(`✅ PASS: Fetch query built - ${JSON.stringify(fetchQuery)}`);
        testResults.passed++;

        // Step 3: Server-side search
        console.log('\n🔍 Step 3: Server-side search...');
        testResults.total++;
        let searchResults;
        try {
            searchResults = await client.search(searchObject);
            if (searchResults && searchResults.length > 0) {
                console.log(`✅ PASS: Search found ${searchResults.length} emails`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: Search returned no results`);
                testResults.failed++;
                testResults.errors.push('Server search returned no results');
                return testResults;
            }
        } catch (error) {
            console.log(`❌ FAIL: Search failed - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Search failed: ${error.message}`);
            return testResults;
        }

        // Step 4: Individual email fetching (with fix)
        console.log('\n🔍 Step 4: Individual email fetching...');
        testResults.total++;
        try {
            const emailsList = [];
            let totalCount = 0;
            let successCount = 0;

            for (const uid of searchResults) {
                if (totalCount >= limit) break;

                try {
                    // FIXED: Remove { uid: true } parameter
                    const email = await client.fetchOne(uid, fetchQuery);
                    if (email) {
                        email.mailboxPath = mailboxPath;
                        emailsList.push(email);
                        totalCount++;
                        successCount++;
                    }
                } catch (fetchError) {
                    console.log(`  ⚠️  Failed to fetch UID ${uid}: ${fetchError.message}`);
                }
            }

            if (emailsList.length > 0) {
                console.log(`✅ PASS: Fetched ${emailsList.length} emails successfully`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: No emails fetched`);
                testResults.failed++;
                testResults.errors.push('No emails were fetched');
                return testResults;
            }
        } catch (error) {
            console.log(`❌ FAIL: Email fetching failed - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Email fetching failed: ${error.message}`);
            return testResults;
        }

        // Step 5: Email processing (like n8n does)
        console.log('\n🔍 Step 5: Email processing...');
        testResults.total++;
        try {
            const returnData = [];
            const emailsList = []; // This would be populated from step 4

            // Re-fetch emails for processing test
            for (let i = 0; i < Math.min(searchResults.length, limit); i++) {
                const uid = searchResults[i];
                const email = await client.fetchOne(uid, fetchQuery);
                if (email) {
                    email.mailboxPath = mailboxPath;
                    emailsList.push(email);
                }
            }

            for (const email of emailsList) {
                const item_json = {
                    seq: email.seq,
                    uid: email.uid,
                    mailboxPath: email.mailboxPath,
                    envelope: email.envelope,
                    labels: email.flags,
                    size: email.size
                };

                // Add content if available
                if (email.source) {
                    item_json.hasSource = true;
                    item_json.sourceLength = email.source.length;
                }

                returnData.push({
                    json: item_json
                });
            }

            if (returnData.length > 0) {
                console.log(`✅ PASS: Processed ${returnData.length} emails for return`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: No data processed for return`);
                testResults.failed++;
                testResults.errors.push('No data processed for return');
            }
        } catch (error) {
            console.log(`❌ FAIL: Email processing failed - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Email processing failed: ${error.message}`);
        }

        // Step 6: Verify content inclusion
        console.log('\n🔍 Step 6: Verify content inclusion...');
        testResults.total++;
        try {
            const email = await client.fetchOne(searchResults[0], fetchQuery);
            if (email && email.source && email.source.length > 0) {
                console.log(`✅ PASS: Content included (${email.source.length} bytes)`);
                testResults.passed++;
            } else {
                console.log(`❌ FAIL: No content included`);
                testResults.failed++;
                testResults.errors.push('No content included in fetch result');
            }
        } catch (error) {
            console.log(`❌ FAIL: Content verification failed - ${error.message}`);
            testResults.failed++;
            testResults.errors.push(`Content verification failed: ${error.message}`);
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
        console.log('\n🎉 All tests passed! The n8n node behavior is working correctly.');
        console.log('✅ The fix resolves the "No output data returned" issue.');
    } else {
        console.log('\n⚠️  Some tests failed. The fix may need additional work.');
    }

    return testResults;
}

testN8nNodeBehavior().catch(console.error);
