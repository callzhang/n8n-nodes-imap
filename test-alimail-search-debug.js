const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testAlimailSearchDebug() {
    console.log('🔍 Debugging Alimail search functionality...\n');

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

        // Test 1: Check server capabilities
        console.log('🔧 Test 1: Checking server capabilities...');
        try {
            const capabilities = client.capabilities;
            console.log('Server capabilities:', capabilities);
        } catch (error) {
            console.log('Could not get capabilities:', error.message);
        }
        console.log('');

        // Test 2: Try different mailboxes for "拉勾"
        const mailboxesToTest = ['INBOX', '已发送', '草稿'];

        for (const mailboxName of mailboxesToTest) {
            console.log(`📂 Testing mailbox: ${mailboxName}`);

            try {
                await client.mailboxOpen(mailboxName, { readOnly: true });

                // Get message count
                const status = await client.status(mailboxName, { messages: true });
                console.log(`  Total messages: ${status.messages}`);

                if (status.messages === 0) {
                    console.log(`  ⚠️  Mailbox ${mailboxName} is empty, skipping...\n`);
                    continue;
                }

                // Try server-side search
                try {
                    const searchResults = await client.search({
                        subject: '拉勾'
                    });
                    console.log(`  🔍 Server search for "拉勾": ${searchResults ? searchResults.length : 'undefined'} results`);

                    if (searchResults && searchResults.length > 0) {
                        console.log(`  🎉 Found results in ${mailboxName}!`);
                        console.log(`  First 3 UIDs:`, searchResults.slice(0, 3));
                    }
                } catch (searchError) {
                    console.log(`  ❌ Server search failed: ${searchError.message}`);
                }

                // Try client-side search for first 50 emails
                console.log(`  🔄 Client-side search (first 50 emails)...`);
                const startTime = Date.now();
                const emails = [];
                let count = 0;

                for await (const email of client.fetch({}, {
                    uid: true,
                    envelope: true
                })) {
                    if (email.uid && count < 50) {
                        emails.push({
                            uid: email.uid,
                            subject: email.envelope?.subject || '',
                            from: email.envelope?.from?.[0]?.address || '',
                            to: email.envelope?.to?.[0]?.address || ''
                        });
                        count++;
                    }
                }

                const fetchTime = Date.now() - startTime;
                console.log(`  ✅ Fetched ${emails.length} emails: ${fetchTime}ms`);

                // Search for "拉勾" in subjects
                const matchingEmails = emails.filter(email =>
                    email.subject.includes('拉勾')
                );

                if (matchingEmails.length > 0) {
                    console.log(`  🎉 Client-side found ${matchingEmails.length} results!`);
                    matchingEmails.forEach(email => {
                        console.log(`    - UID ${email.uid}: "${email.subject}"`);
                    });
                } else {
                    console.log(`  ❌ No emails with "拉勾" in subject`);

                    // Check for any emails with "拉" or "勾"
                    const partialMatches = emails.filter(email =>
                        email.subject.includes('拉') || email.subject.includes('勾')
                    );

                    if (partialMatches.length > 0) {
                        console.log(`  🔍 Found ${partialMatches.length} emails with partial matches:`);
                        partialMatches.slice(0, 3).forEach(email => {
                            console.log(`    - UID ${email.uid}: "${email.subject}"`);
                        });
                    }
                }

            } catch (error) {
                console.log(`  ❌ Error with mailbox ${mailboxName}: ${error.message}`);
            }

            console.log('');
        }

        // Test 3: Check if "拉勾" exists in any email content
        console.log('🔍 Test 3: Searching for "拉勾" in email content...');
        await client.mailboxOpen('已发送', { readOnly: true });

        const startTime = Date.now();
        const emails = [];
        let count = 0;

        for await (const email of client.fetch({}, {
            uid: true,
            envelope: true,
            source: true  // Get full email source
        })) {
            if (email.uid && count < 20) { // Limit to 20 for performance
                emails.push({
                    uid: email.uid,
                    subject: email.envelope?.subject || '',
                    source: email.source || ''
                });
                count++;
            }
        }

        const fetchTime = Date.now() - startTime;
        console.log(`✅ Fetched ${emails.length} emails with source: ${fetchTime}ms`);

        // Search for "拉勾" in email source
        const contentMatches = emails.filter(email =>
            email.source.includes('拉勾')
        );

        if (contentMatches.length > 0) {
            console.log(`🎉 Found ${contentMatches.length} emails with "拉勾" in content!`);
            contentMatches.forEach(email => {
                console.log(`  - UID ${email.uid}: "${email.subject}"`);
            });
        } else {
            console.log(`❌ No emails with "拉勾" in content`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testAlimailSearchDebug().catch(console.error);
