const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testAlimailChineseSearch() {
    console.log('🔍 Testing Alimail Chinese search for "拉勾" in "已发送" mailbox...\n');

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

        // Test 2: Check if "已发送" mailbox exists
        const sentMailbox = mailboxes.find(mb =>
            mb.name.includes('已发送') ||
            mb.name.includes('Sent') ||
            mb.path.includes('已发送') ||
            mb.path.includes('Sent')
        );

        if (!sentMailbox) {
            console.log('❌ "已发送" mailbox not found!');
            console.log('Available mailboxes:');
            mailboxes.forEach(mb => console.log(`  - "${mb.name}" (${mb.path})`));
            return;
        }

        console.log(`✅ Found sent mailbox: "${sentMailbox.name}" (${sentMailbox.path})\n`);

        // Test 3: Open the sent mailbox
        console.log('📂 Test 3: Opening sent mailbox...');
        await client.mailboxOpen(sentMailbox.path, { readOnly: true });
        console.log('✅ Sent mailbox opened\n');

        // Test 4: Get message count
        console.log('📊 Test 4: Getting message count...');
        const status = await client.status(sentMailbox.path, { messages: true });
        console.log(`Total messages in sent mailbox: ${status.messages}\n`);

        // Test 5: Try server-side search for "拉勾"
        console.log('🔍 Test 5: Server-side search for "拉勾"...');
        const start5 = Date.now();
        try {
            const searchResults = await client.search({
                subject: '拉勾'
            });
            const time5 = Date.now() - start5;
            console.log(`✅ Server search: ${time5}ms (${searchResults.length} results)`);

            if (searchResults.length > 0) {
                console.log('🎉 Server search found results!');
                console.log('First 5 UIDs:', searchResults.slice(0, 5));
            } else {
                console.log('❌ Server search returned 0 results');
            }
        } catch (searchError) {
            console.log(`❌ Server search failed: ${searchError.message}`);
        }
        console.log('');

        // Test 6: Try server-side search for "拉"
        console.log('🔍 Test 6: Server-side search for "拉"...');
        const start6 = Date.now();
        try {
            const searchResults6 = await client.search({
                subject: '拉'
            });
            const time6 = Date.now() - start6;
            console.log(`✅ Server search for "拉": ${time6}ms (${searchResults6.length} results)`);

            if (searchResults6.length > 0) {
                console.log('🎉 Server search for "拉" found results!');
                console.log('First 5 UIDs:', searchResults6.slice(0, 5));
            } else {
                console.log('❌ Server search for "拉" returned 0 results');
            }
        } catch (searchError) {
            console.log(`❌ Server search for "拉" failed: ${searchError.message}`);
        }
        console.log('');

        // Test 7: Try server-side search for "勾"
        console.log('🔍 Test 7: Server-side search for "勾"...');
        const start7 = Date.now();
        try {
            const searchResults7 = await client.search({
                subject: '勾'
            });
            const time7 = Date.now() - start7;
            console.log(`✅ Server search for "勾": ${time7}ms (${searchResults7.length} results)`);

            if (searchResults7.length > 0) {
                console.log('🎉 Server search for "勾" found results!');
                console.log('First 5 UIDs:', searchResults7.slice(0, 5));
            } else {
                console.log('❌ Server search for "勾" returned 0 results');
            }
        } catch (searchError) {
            console.log(`❌ Server search for "勾" failed: ${searchError.message}`);
        }
        console.log('');

        // Test 8: Client-side fallback - fetch all emails and search
        console.log('🔄 Test 8: Client-side fallback search...');
        const start8 = Date.now();

        const allEmails = [];
        for await (const email of client.fetch({}, {
            uid: true,
            envelope: true
        })) {
            if (email.uid) {
                allEmails.push({
                    uid: email.uid,
                    subject: email.envelope?.subject || '',
                    from: email.envelope?.from?.[0]?.address || '',
                    to: email.envelope?.to?.[0]?.address || ''
                });
            }
        }

        const time8a = Date.now() - start8;
        console.log(`✅ Fetched ${allEmails.length} emails: ${time8a}ms`);

        // Search for "拉勾" in subjects
        const matchingEmails = allEmails.filter(email =>
            email.subject.includes('拉勾')
        );

        const time8b = Date.now() - start8;
        console.log(`✅ Client-side search: ${time8b}ms (${matchingEmails.length} results)`);

        if (matchingEmails.length > 0) {
            console.log('🎉 Client-side search found results!');
            console.log('Matching emails:');
            matchingEmails.slice(0, 5).forEach(email => {
                console.log(`  - UID ${email.uid}: "${email.subject}"`);
            });
        } else {
            console.log('❌ Client-side search found no results');

            // Show some sample subjects to debug
            console.log('\n📋 Sample subjects from sent mailbox:');
            allEmails.slice(0, 10).forEach(email => {
                console.log(`  - UID ${email.uid}: "${email.subject}"`);
            });
        }
        console.log('');

        // Test 9: Check if there are any emails with Chinese characters
        console.log('🔤 Test 9: Checking for Chinese characters in subjects...');
        const chineseEmails = allEmails.filter(email =>
            /[\u4e00-\u9fff]/.test(email.subject)
        );
        console.log(`Found ${chineseEmails.length} emails with Chinese characters in subject`);

        if (chineseEmails.length > 0) {
            console.log('Sample Chinese subjects:');
            chineseEmails.slice(0, 5).forEach(email => {
                console.log(`  - UID ${email.uid}: "${email.subject}"`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testAlimailChineseSearch().catch(console.error);
