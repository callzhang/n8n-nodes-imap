const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testFetchQueryDebug() {
    console.log('🔍 Testing fetch query with content parts...\n');
    
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

    try {
        console.log('📧 Connecting to Alimail...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        await client.mailboxOpen('垃圾邮件', { readOnly: true });

        // Test 1: Basic fetch query (like the node uses)
        console.log('🔍 Test 1: Basic fetch query...');
        const basicQuery = {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true
        };
        
        const searchResults = await client.search({ seen: false });
        console.log(`Found ${searchResults.length} unseen emails`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
            const uid = searchResults[i];
            try {
                const email = await client.fetchOne(uid, basicQuery);
                if (email) {
                    successCount++;
                    console.log(`✅ Basic query - UID ${uid}: "${email.envelope?.subject || 'No subject'}"`);
                }
            } catch (error) {
                errorCount++;
                console.log(`❌ Basic query - UID ${uid}: ${error.message}`);
            }
        }
        
        console.log(`Basic query results: ${successCount} success, ${errorCount} errors\n`);

        // Test 2: Fetch query with source (like when content parts are included)
        console.log('🔍 Test 2: Fetch query with source...');
        const sourceQuery = {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
            source: true  // This is added when content parts are requested
        };
        
        successCount = 0;
        errorCount = 0;
        
        for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
            const uid = searchResults[i];
            try {
                const email = await client.fetchOne(uid, sourceQuery);
                if (email) {
                    successCount++;
                    console.log(`✅ Source query - UID ${uid}: "${email.envelope?.subject || 'No subject'}"`);
                    console.log(`   Source length: ${email.source ? email.source.length : 0} bytes`);
                }
            } catch (error) {
                errorCount++;
                console.log(`❌ Source query - UID ${uid}: ${error.message}`);
            }
        }
        
        console.log(`Source query results: ${successCount} success, ${errorCount} errors\n`);

        // Test 3: Test with the exact same UIDs but different approach
        console.log('🔍 Test 3: Bulk fetch vs individual fetch...');
        
        // Bulk fetch (like the optimized approach)
        console.log('Bulk fetch approach...');
        const bulkEmails = [];
        for await (const email of client.fetch({}, sourceQuery)) {
            if (email.uid && bulkEmails.length < 3) {
                bulkEmails.push(email);
            }
        }
        console.log(`✅ Bulk fetch: ${bulkEmails.length} emails`);
        
        // Individual fetch (like the node does)
        console.log('Individual fetch approach...');
        const individualEmails = [];
        for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
            const uid = searchResults[i];
            try {
                const email = await client.fetchOne(uid, sourceQuery);
                if (email) {
                    individualEmails.push(email);
                }
            } catch (error) {
                console.log(`❌ Individual fetch failed for UID ${uid}: ${error.message}`);
            }
        }
        console.log(`✅ Individual fetch: ${individualEmails.length} emails`);

        // Test 4: Check if the issue is with specific UIDs
        console.log('\n🔍 Test 4: Testing specific UIDs from search results...');
        const testUids = searchResults.slice(0, 5);
        console.log(`Testing UIDs: ${testUids.join(', ')}`);
        
        for (const uid of testUids) {
            try {
                const email = await client.fetchOne(uid, sourceQuery);
                if (email) {
                    console.log(`✅ UID ${uid}: "${email.envelope?.subject || 'No subject'}"`);
                } else {
                    console.log(`❌ UID ${uid}: No email data returned`);
                }
            } catch (error) {
                console.log(`❌ UID ${uid}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testFetchQueryDebug().catch(console.error);
