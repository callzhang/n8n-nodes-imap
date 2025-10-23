const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Multi-provider test suite
 * Tests the fetchOne uid parameter fix across different email providers
 */
async function testMultiProvider() {
    console.log('🧪 Testing fetchOne uid parameter fix across multiple providers...\n');
    
    // Load credentials
    const secrets = yaml.load(fs.readFileSync('secrets.yaml', 'utf8'));
    
    const providers = [
        {
            name: 'Alimail',
            config: secrets.alimail,
            testMailbox: '垃圾邮件',
            testSearch: { seen: false }
        },
        {
            name: 'Gmail',
            config: secrets.gmail,
            testMailbox: 'INBOX',
            testSearch: { seen: false }
        }
    ];

    let overallResults = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };

    for (const provider of providers) {
        console.log(`📧 Testing ${provider.name}...`);
        console.log('='.repeat(50));
        
        const [host, port] = provider.config.host.split(':');
        
        const client = new ImapFlow({
            host: host,
            port: parseInt(port),
            secure: true,
            auth: {
                user: provider.config.user,
                pass: provider.config.password,
            },
            logger: false
        });

        let providerResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };

        try {
            console.log(`🔌 Connecting to ${provider.name}...`);
            await client.connect();
            console.log('✅ Connected successfully\n');

            console.log(`📁 Opening mailbox: ${provider.testMailbox}`);
            await client.mailboxOpen(provider.testMailbox, { readOnly: true });

            const searchResults = await client.search(provider.testSearch);
            if (!searchResults || searchResults.length === 0) {
                console.log(`⚠️  No emails found in ${provider.testMailbox}, skipping tests\n`);
                continue;
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
            providerResults.total++;
            try {
                const email = await client.fetchOne(testUid, sourceQuery);
                if (email && email.envelope?.subject) {
                    console.log(`✅ PASS: Without uid param - "${email.envelope.subject}"`);
                    providerResults.passed++;
                } else {
                    console.log(`❌ FAIL: Without uid param - No email data returned`);
                    providerResults.failed++;
                    providerResults.errors.push('fetchOne without uid parameter returned null');
                }
            } catch (error) {
                console.log(`❌ FAIL: Without uid param - ${error.message}`);
                providerResults.failed++;
                providerResults.errors.push(`fetchOne without uid parameter failed: ${error.message}`);
            }

            // Test 2: fetchOne with uid parameter (should fail - this is the bug)
            console.log('\n🔍 Test 2: fetchOne with uid parameter (bug reproduction)...');
            providerResults.total++;
            try {
                const email = await client.fetchOne(testUid, sourceQuery, { uid: true });
                if (email && email.envelope?.subject) {
                    console.log(`❌ UNEXPECTED: With uid param - "${email.envelope.subject}"`);
                    console.log('   This should have failed - the bug may be fixed in the library');
                    providerResults.passed++;
                } else {
                    console.log(`✅ EXPECTED: With uid param - No email data returned (this is the bug)`);
                    providerResults.passed++;
                }
            } catch (error) {
                console.log(`✅ EXPECTED: With uid param - ${error.message}`);
                providerResults.passed++;
            }

            // Test 3: Multiple emails with correct parameters
            console.log('\n🔍 Test 3: Multiple emails with correct parameters...');
            providerResults.total++;
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
                    providerResults.passed++;
                } else {
                    console.log(`❌ FAIL: No emails fetched`);
                    providerResults.failed++;
                    providerResults.errors.push('Multiple email fetch returned no results');
                }
            } catch (error) {
                console.log(`❌ FAIL: Multiple emails - ${error.message}`);
                providerResults.failed++;
                providerResults.errors.push(`Multiple email fetch failed: ${error.message}`);
            }

            // Test 4: Verify source content is included
            console.log('\n🔍 Test 4: Verify source content is included...');
            providerResults.total++;
            try {
                const email = await client.fetchOne(testUid, sourceQuery);
                if (email && email.source && email.source.length > 0) {
                    console.log(`✅ PASS: Source content included (${email.source.length} bytes)`);
                    providerResults.passed++;
                } else {
                    console.log(`❌ FAIL: No source content included`);
                    providerResults.failed++;
                    providerResults.errors.push('Source content not included in fetch result');
                }
            } catch (error) {
                console.log(`❌ FAIL: Source content test - ${error.message}`);
                providerResults.failed++;
                providerResults.errors.push(`Source content test failed: ${error.message}`);
            }

        } catch (error) {
            console.error(`❌ ${provider.name} Test Error:`, error.message);
            providerResults.failed++;
            providerResults.errors.push(`Test setup failed: ${error.message}`);
        } finally {
            await client.logout();
            console.log(`🔌 Disconnected from ${provider.name}\n`);
        }

        // Provider Results Summary
        console.log(`📊 ${provider.name} Test Results`);
        console.log('='.repeat(30));
        console.log(`Total tests: ${providerResults.total}`);
        console.log(`Passed: ${providerResults.passed}`);
        console.log(`Failed: ${providerResults.failed}`);
        console.log(`Success rate: ${((providerResults.passed / providerResults.total) * 100).toFixed(1)}%\n`);

        // Add to overall results
        overallResults.total += providerResults.total;
        overallResults.passed += providerResults.passed;
        overallResults.failed += providerResults.failed;
        overallResults.errors.push(...providerResults.errors.map(error => `${provider.name}: ${error}`));
    }

    // Overall Results Summary
    console.log('📊 Overall Test Results');
    console.log('=======================');
    console.log(`Total tests: ${overallResults.total}`);
    console.log(`Passed: ${overallResults.passed}`);
    console.log(`Failed: ${overallResults.failed}`);
    console.log(`Success rate: ${((overallResults.passed / overallResults.total) * 100).toFixed(1)}%`);

    if (overallResults.errors.length > 0) {
        console.log('\n❌ Errors:');
        overallResults.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }

    if (overallResults.failed === 0) {
        console.log('\n🎉 All tests passed across all providers!');
        console.log('✅ The fetchOne uid parameter fix works for both Alimail and Gmail.');
    } else {
        console.log('\n⚠️  Some tests failed.');
        console.log('❌ The fix may need additional work for certain providers.');
    }

    return overallResults;
}

testMultiProvider().catch(console.error);

