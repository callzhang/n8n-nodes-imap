const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testNoSearchPerformance() {
    console.log('🔍 Testing IMAP performance without search queries...\n');
    
    // Load credentials
    const secrets = yaml.load(fs.readFileSync('secrets.yaml', 'utf8'));
    const gmail = secrets.gmail;
    
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

    try {
        console.log('📧 Connecting to Gmail...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        // Test 1: Get mailbox list
        console.log('📁 Test 1: Getting mailbox list...');
        const start1 = Date.now();
        const mailboxes = await client.list();
        const time1 = Date.now() - start1;
        console.log(`✅ Mailbox list: ${time1}ms (${mailboxes.length} mailboxes)\n`);

        // Test 2: Open INBOX
        console.log('📂 Test 2: Opening INBOX...');
        const start2 = Date.now();
        await client.mailboxOpen('INBOX');
        const time2 = Date.now() - start2;
        console.log(`✅ INBOX opened: ${time2}ms\n`);

        // Test 3: Get message count
        console.log('📊 Test 3: Getting message count...');
        const start3 = Date.now();
        const status = await client.status('INBOX', { messages: true });
        const time3 = Date.now() - start3;
        console.log(`✅ Message count: ${time3}ms (${status.messages} messages)\n`);

        // Test 4: Fetch all UIDs (no search)
        console.log('🔢 Test 4: Fetching all UIDs (no search)...');
        const start4 = Date.now();
        const allUids = [];
        for await (const message of client.fetch({}, { uid: true })) {
            if (message.uid) {
                allUids.push(message.uid);
            }
        }
        const time4 = Date.now() - start4;
        console.log(`✅ All UIDs fetched: ${time4}ms (${allUids.length} emails)\n`);

        // Test 5: Fetch first 10 emails with minimal data
        console.log('📧 Test 5: Fetching first 10 emails (minimal data)...');
        const start5 = Date.now();
        const emails = [];
        let count = 0;
        for await (const message of client.fetch({}, { uid: true, envelope: true })) {
            if (message.uid && count < 10) {
                emails.push({
                    uid: message.uid,
                    subject: message.envelope?.subject || 'No subject',
                    from: message.envelope?.from?.[0]?.address || 'Unknown'
                });
                count++;
            }
        }
        const time5 = Date.now() - start5;
        console.log(`✅ First 10 emails: ${time5}ms\n`);

        // Test 6: Fetch first 10 emails with full data
        console.log('📧 Test 6: Fetching first 10 emails (full data)...');
        const start6 = Date.now();
        const fullEmails = [];
        count = 0;
        for await (const message of client.fetch({}, { 
            uid: true, 
            envelope: true, 
            flags: true, 
            internalDate: true,
            size: true 
        })) {
            if (message.uid && count < 10) {
                fullEmails.push({
                    uid: message.uid,
                    subject: message.envelope?.subject || 'No subject',
                    from: message.envelope?.from?.[0]?.address || 'Unknown',
                    flags: message.flags,
                    date: message.internalDate,
                    size: message.size
                });
                count++;
            }
        }
        const time6 = Date.now() - start6;
        console.log(`✅ First 10 emails (full): ${time6}ms\n`);

        // Test 7: Your specific conditions - Seen, Not Flagged emails
        console.log('🎯 Test 7: Your specific conditions (Seen + Not Flagged)...');
        const start7 = Date.now();
        const searchResults = await client.search({
            seen: true,
            flagged: false
        });
        const time7a = Date.now() - start7;
        console.log(`✅ Search completed: ${time7a}ms (${searchResults.length} results)\n`);

        // Test 8: Fetch the filtered results (limit 8)
        console.log('📧 Test 8: Fetching filtered results (limit 8)...');
        const start8 = Date.now();
        const filteredEmails = [];
        for (const uid of searchResults.slice(0, 8)) { // Limit to 8 as requested
            const message = await client.fetchOne(uid, { 
                uid: true, 
                envelope: true, 
                flags: true 
            });
            if (message) {
                filteredEmails.push({
                    uid: message.uid,
                    subject: message.envelope?.subject || 'No subject',
                    from: message.envelope?.from?.[0]?.address || 'Unknown',
                    flags: message.flags,
                    seen: message.flags?.includes('\\Seen') || false,
                    flagged: message.flags?.includes('\\Flagged') || false
                });
            }
        }
        const time8 = Date.now() - start8;
        console.log(`✅ Filtered emails fetched: ${time8}ms (${filteredEmails.length} emails)\n`);

        // Test 9: Simulate the current EmailGetList behavior (client-side fallback)
        console.log('🔄 Test 9: Simulating EmailGetList client-side fallback...');
        const start9 = Date.now();
        
        // This simulates what happens in EmailGetList when search fails
        const allEmailsForFiltering = [];
        for await (const message of client.fetch({}, { 
            uid: true, 
            envelope: true, 
            flags: true 
        })) {
            if (message.uid) {
                allEmailsForFiltering.push({
                    uid: message.uid,
                    subject: message.envelope?.subject || '',
                    from: message.envelope?.from?.[0]?.address || '',
                    flags: message.flags || []
                });
            }
        }
        
        // Client-side filtering (like in EmailGetList fallback)
        const clientFiltered = allEmailsForFiltering.filter(email => {
            const isSeen = email.flags.includes('\\Seen');
            const isFlagged = email.flags.includes('\\Flagged');
            return isSeen && !isFlagged;
        }).slice(0, 8); // Limit to 8 as requested
        
        const time9 = Date.now() - start9;
        console.log(`✅ Client-side filtering: ${time9}ms (${clientFiltered.length} emails)\n`);

        // Performance analysis
        console.log('📊 PERFORMANCE ANALYSIS:');
        console.log('========================');
        console.log(`Mailbox list: ${time1}ms`);
        console.log(`Open INBOX: ${time2}ms`);
        console.log(`Message count: ${time3}ms`);
        console.log(`All UIDs: ${time4}ms`);
        console.log(`First 10 (minimal): ${time5}ms`);
        console.log(`First 10 (full): ${time6}ms`);
        console.log(`\n🎯 YOUR SPECIFIC CONDITIONS:`);
        console.log(`Server search (seen+not flagged): ${time7a}ms (${searchResults.length} results)`);
        console.log(`Fetch filtered results: ${time8}ms`);
        console.log(`Client-side filtering: ${time9}ms (${clientFiltered.length} results)`);
        console.log(`\n📈 Performance per email:`);
        console.log(`- UIDs only: ${(time4 / allUids.length).toFixed(2)}ms per email`);
        console.log(`- Full data (10 emails): ${(time6 / 10).toFixed(2)}ms per email`);

        console.log(`\n🔍 ANALYSIS FOR YOUR CONDITIONS:`);
        console.log(`- Server search: ${time7a}ms for ${searchResults.length} results`);
        console.log(`- Client filtering: ${time9}ms for ${clientFiltered.length} results`);
        
        if (time7a < time9) {
            console.log(`✅ Server search is ${((time9 - time7a) / time9 * 100).toFixed(1)}% faster than client filtering`);
        } else {
            console.log(`⚠️  Client filtering is ${((time7a - time9) / time7a * 100).toFixed(1)}% faster than server search`);
        }

        if (time9 > 10000) {
            console.log('\n⚠️  WARNING: Client-side filtering is very slow!');
            console.log('   This suggests the IMAP server is slow or has many emails.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testNoSearchPerformance().catch(console.error);
