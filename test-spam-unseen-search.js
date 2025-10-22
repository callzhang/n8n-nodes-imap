const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testSpamUnseenSearch() {
    console.log('🗑️ Testing spam mailbox unseen search...\n');
    
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

        // Test 1: List all mailboxes
        console.log('📁 Test 1: Listing all mailboxes...');
        const mailboxes = await client.list();
        console.log(`Found ${mailboxes.length} mailboxes:`);
        mailboxes.forEach(mb => {
            console.log(`  - ${mb.name} (${mb.path})`);
        });
        console.log('');

        // Test 2: Check if "垃圾邮件" mailbox exists
        const spamMailbox = mailboxes.find(mb => 
            mb.name.includes('垃圾邮件') || 
            mb.name.includes('Spam') || 
            mb.name.includes('Junk') ||
            mb.path.includes('垃圾邮件') ||
            mb.path.includes('Spam') ||
            mb.path.includes('Junk')
        );
        
        if (!spamMailbox) {
            console.log('❌ "垃圾邮件" mailbox not found!');
            console.log('Available mailboxes:');
            mailboxes.forEach(mb => console.log(`  - "${mb.name}" (${mb.path})`));
            return;
        }
        
        console.log(`✅ Found spam mailbox: "${spamMailbox.name}" (${spamMailbox.path})\n`);

        // Test 3: Open the spam mailbox
        console.log('📂 Test 3: Opening spam mailbox...');
        await client.mailboxOpen(spamMailbox.path, { readOnly: true });
        console.log('✅ Spam mailbox opened\n');

        // Test 4: Get message count
        console.log('📊 Test 4: Getting message count...');
        const status = await client.status(spamMailbox.path, { messages: true });
        console.log(`Total messages in spam mailbox: ${status.messages}\n`);

        if (status.messages === 0) {
            console.log('⚠️  Spam mailbox is empty, no emails to search');
            return;
        }

        // Test 5: Try server-side search for unseen emails
        console.log('🔍 Test 5: Server-side search for unseen emails...');
        const start5 = Date.now();
        try {
            const searchResults = await client.search({
                seen: false
            });
            const time5 = Date.now() - start5;
            console.log(`✅ Server search for unseen: ${time5}ms (${searchResults ? searchResults.length : 'undefined'} results)`);
            
            if (searchResults && searchResults.length > 0) {
                console.log('🎉 Server search found unseen emails!');
                console.log('First 5 UIDs:', searchResults.slice(0, 5));
            } else {
                console.log('❌ Server search returned no unseen emails');
            }
        } catch (searchError) {
            console.log(`❌ Server search failed: ${searchError.message}`);
        }
        console.log('');

        // Test 6: Try server-side search for seen emails
        console.log('🔍 Test 6: Server-side search for seen emails...');
        const start6 = Date.now();
        try {
            const searchResults6 = await client.search({
                seen: true
            });
            const time6 = Date.now() - start6;
            console.log(`✅ Server search for seen: ${time6}ms (${searchResults6 ? searchResults6.length : 'undefined'} results)`);
            
            if (searchResults6 && searchResults6.length > 0) {
                console.log('🎉 Server search found seen emails!');
                console.log('First 5 UIDs:', searchResults6.slice(0, 5));
            } else {
                console.log('❌ Server search returned no seen emails');
            }
        } catch (searchError) {
            console.log(`❌ Server search failed: ${searchError.message}`);
        }
        console.log('');

        // Test 7: Client-side fallback - fetch all emails and check flags
        console.log('🔄 Test 7: Client-side fallback search...');
        const start7 = Date.now();
        
        const allEmails = [];
        for await (const email of client.fetch({}, { 
            uid: true, 
            envelope: true,
            flags: true
        })) {
            if (email.uid) {
                console.log(`Debug: UID ${email.uid}, flags type: ${typeof email.flags}, flags value:`, email.flags);
                allEmails.push({
                    uid: email.uid,
                    subject: email.envelope?.subject || '',
                    from: email.envelope?.from?.[0]?.address || '',
                    flags: email.flags || []
                });
            }
        }
        
        const time7a = Date.now() - start7;
        console.log(`✅ Fetched ${allEmails.length} emails: ${time7a}ms`);
        
        // Check seen/unseen status
        const unseenEmails = allEmails.filter(email => 
            !email.flags || !email.flags.has('\\Seen')
        );
        
        const seenEmails = allEmails.filter(email => 
            email.flags && email.flags.has('\\Seen')
        );
        
        const time7b = Date.now() - start7;
        console.log(`✅ Client-side analysis: ${time7b}ms`);
        console.log(`📊 Results:`);
        console.log(`  - Unseen emails: ${unseenEmails.length}`);
        console.log(`  - Seen emails: ${seenEmails.length}`);
        console.log(`  - Total emails: ${allEmails.length}`);
        
        if (unseenEmails.length > 0) {
            console.log('\n🎉 Found unseen emails!');
            console.log('First 5 unseen emails:');
            unseenEmails.slice(0, 5).forEach(email => {
                console.log(`  - UID ${email.uid}: "${email.subject}" (from: ${email.from})`);
            });
        } else {
            console.log('\n❌ No unseen emails found');
        }
        
        if (seenEmails.length > 0) {
            console.log('\n📖 Found seen emails:');
            console.log('First 3 seen emails:');
            seenEmails.slice(0, 3).forEach(email => {
                console.log(`  - UID ${email.uid}: "${email.subject}" (from: ${email.from})`);
            });
        }

        // Test 8: Check if there are any emails at all
        console.log('\n📋 Sample emails from spam mailbox:');
        allEmails.slice(0, 5).forEach(email => {
            const isSeen = email.flags.includes('\\Seen');
            console.log(`  - UID ${email.uid}: "${email.subject}" (seen: ${isSeen})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testSpamUnseenSearch().catch(console.error);
