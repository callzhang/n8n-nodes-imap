const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testN8nDebug() {
    console.log('🐛 Debugging n8n node issue...\n');
    
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

        // Test 1: Check what server search returns
        console.log('🔍 Test 1: Server search behavior...');
        const searchResults = await client.search({
            seen: false
        });
        
        console.log(`Search results type: ${typeof searchResults}`);
        console.log(`Search results value:`, searchResults);
        console.log(`Is array: ${Array.isArray(searchResults)}`);
        console.log(`Length: ${searchResults ? searchResults.length : 'N/A'}\n`);

        if (Array.isArray(searchResults) && searchResults.length > 0) {
            console.log('✅ Server search returned array with results');
            console.log(`First 5 UIDs:`, searchResults.slice(0, 5));
            
            // Test 2: Try fetching individual emails (like the node does)
            console.log('\n📧 Test 2: Individual email fetching...');
            const emails = [];
            let successCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < Math.min(searchResults.length, 5); i++) {
                const uid = searchResults[i];
                console.log(`\nFetching UID ${uid}...`);
                
                try {
                    const email = await client.fetchOne(uid, {
                        uid: true,
                        envelope: true,
                        flags: true,
                        bodyStructure: true,
                        source: true
                    });
                    
                    if (email) {
                        emails.push(email);
                        successCount++;
                        console.log(`✅ Success: UID ${uid} - "${email.envelope?.subject || 'No subject'}"`);
                    } else {
                        console.log(`❌ No email data returned for UID ${uid}`);
                    }
                } catch (fetchError) {
                    errorCount++;
                    console.log(`❌ Error fetching UID ${uid}: ${fetchError.message}`);
                }
            }
            
            console.log(`\n📊 Fetch Results:`);
            console.log(`  - Success: ${successCount}`);
            console.log(`  - Errors: ${errorCount}`);
            console.log(`  - Total emails: ${emails.length}`);
            
            if (emails.length > 0) {
                console.log('\n✅ SUCCESS: Individual fetching is working');
                console.log('The issue might be elsewhere in the n8n node logic');
            } else {
                console.log('\n❌ FAILURE: Individual fetching is not working');
                console.log('This explains why n8n returns no results');
            }
        } else {
            console.log('❌ Server search did not return expected results');
            console.log('This explains why n8n returns no results');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testN8nDebug().catch(console.error);
