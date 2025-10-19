const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testSearchFix() {
    console.log('🔧 Testing search fix for undefined results...\n');
    
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

        await client.mailboxOpen('已发送', { readOnly: true });

        // Test 1: Check what search returns
        console.log('🔍 Test 1: Testing server search behavior...');
        const searchResults = await client.search({
            subject: '拉勾'
        });
        
        console.log(`Search results type: ${typeof searchResults}`);
        console.log(`Search results value: ${searchResults}`);
        console.log(`Is undefined: ${searchResults === undefined}`);
        console.log(`Is null: ${searchResults === null}`);
        console.log(`Is array: ${Array.isArray(searchResults)}`);
        
        if (Array.isArray(searchResults)) {
            console.log(`Array length: ${searchResults.length}`);
        }
        console.log('');

        // Test 2: Simulate the fixed logic
        console.log('🔧 Test 2: Simulating fixed logic...');
        
        let searchResults2;
        try {
            searchResults2 = await client.search({
                subject: '拉勾'
            });

            if (!searchResults2 || searchResults2 === undefined) {
                console.log('✅ Server search returned undefined, triggering fallback');
                throw new Error('Server search returned undefined');
            }

            console.log(`✅ Server search returned: ${searchResults2.length} results`);
        } catch (searchError) {
            console.log(`✅ Caught error: ${searchError.message}`);
            console.log('✅ This would trigger client-side fallback');
        }
        console.log('');

        // Test 3: Test with a search that might work
        console.log('🔍 Test 3: Testing with different search terms...');
        
        const testTerms = ['邀请', '修改', '回复', '拉勾'];
        
        for (const term of testTerms) {
            try {
                const results = await client.search({
                    subject: term
                });
                console.log(`Search for "${term}": ${results ? results.length : 'undefined'} results`);
            } catch (error) {
                console.log(`Search for "${term}": Error - ${error.message}`);
            }
        }
        console.log('');

        // Test 4: Test client-side fallback
        console.log('🔄 Test 4: Testing client-side fallback...');
        const startTime = Date.now();
        
        const allEmails = [];
        for await (const email of client.fetch({}, { 
            uid: true, 
            envelope: true 
        })) {
            if (email.uid) {
                allEmails.push({
                    uid: email.uid,
                    subject: email.envelope?.subject || ''
                });
            }
        }
        
        const fetchTime = Date.now() - startTime;
        console.log(`✅ Fetched ${allEmails.length} emails: ${fetchTime}ms`);
        
        // Search for "拉勾"
        const matchingEmails = allEmails.filter(email => 
            email.subject.includes('拉勾')
        );
        
        console.log(`✅ Client-side search for "拉勾": ${matchingEmails.length} results`);
        
        if (matchingEmails.length > 0) {
            console.log('🎉 Found matching emails:');
            matchingEmails.forEach(email => {
                console.log(`  - UID ${email.uid}: "${email.subject}"`);
            });
        } else {
            console.log('❌ No emails found with "拉勾"');
            
            // Check for partial matches
            const partialMatches = allEmails.filter(email => 
                email.subject.includes('拉') || email.subject.includes('勾')
            );
            
            if (partialMatches.length > 0) {
                console.log(`🔍 Found ${partialMatches.length} emails with partial matches:`);
                partialMatches.slice(0, 5).forEach(email => {
                    console.log(`  - UID ${email.uid}: "${email.subject}"`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testSearchFix().catch(console.error);
