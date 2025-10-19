const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testSlowPerformance() {
    console.log('🐌 Testing slow performance issue...\n');

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

        await client.mailboxOpen('INBOX', { readOnly: true });

        // Test 1: Get message count
        console.log('📊 Getting message count...');
        const status = await client.status('INBOX', { messages: true });
        console.log(`Total messages: ${status.messages}\n`);

        // Test 2: Simulate the current "no search criteria" behavior
        console.log('🐌 Test 2: Current behavior (fetch all UIDs, then fetch each individually)...');
        const start2 = Date.now();

        // Step 1: Fetch all UIDs (this is fast)
        const allUids = [];
        for await (const email of client.fetch({}, { uid: true })) {
            if (email.uid) {
                allUids.push(email.uid);
            }
        }
        const time2a = Date.now() - start2;
        console.log(`✅ Step 1 - All UIDs fetched: ${time2a}ms (${allUids.length} emails)`);

        // Step 2: Fetch each email individually (this is SLOW)
        const start2b = Date.now();
        const emails = [];
        for (let i = 0; i < Math.min(allUids.length, 20); i++) { // Limit to 20 for testing
            const uid = allUids[i];
            const email = await client.fetchOne(uid, {
                uid: true,
                envelope: true,
                flags: true
            });
            if (email) {
                emails.push({
                    uid: email.uid,
                    subject: email.envelope?.subject || 'No subject',
                    seen: email.flags?.includes('\\Seen') || false,
                    flagged: email.flags?.includes('\\Flagged') || false
                });
            }
        }
        const time2b = Date.now() - start2b;
        console.log(`✅ Step 2 - Individual fetch: ${time2b}ms (${emails.length} emails)`);
        console.log(`Total time: ${time2a + time2b}ms\n`);

        // Test 3: Optimized approach - fetch all at once
        console.log('⚡ Test 3: Optimized approach (fetch all at once)...');
        const start3 = Date.now();
        const optimizedEmails = [];
        for await (const email of client.fetch({}, {
            uid: true,
            envelope: true,
            flags: true
        })) {
            if (email.uid) {
                optimizedEmails.push({
                    uid: email.uid,
                    subject: email.envelope?.subject || 'No subject',
                    seen: email.flags?.includes('\\Seen') || false,
                    flagged: email.flags?.includes('\\Flagged') || false
                });
            }
        }
        const time3 = Date.now() - start3;
        console.log(`✅ Optimized fetch: ${time3}ms (${optimizedEmails.length} emails)\n`);

        // Performance comparison
        console.log('📊 PERFORMANCE COMPARISON:');
        console.log('========================');
        console.log(`Current approach: ${time2a + time2b}ms for 20 emails`);
        console.log(`Optimized approach: ${time3}ms for ${optimizedEmails.length} emails`);
        console.log(`\n📈 Performance per email:`);
        console.log(`- Current (20 emails): ${((time2a + time2b) / 20).toFixed(2)}ms per email`);
        console.log(`- Optimized (${optimizedEmails.length} emails): ${(time3 / optimizedEmails.length).toFixed(2)}ms per email`);

        const improvement = ((time2a + time2b) / 20) / (time3 / optimizedEmails.length);
        console.log(`\n🚀 Optimized approach is ${improvement.toFixed(1)}x faster per email!`);

        if (time2b > 5000) {
            console.log('\n⚠️  WARNING: Individual fetching is very slow!');
            console.log('   This is why the node runs slowly without search criteria.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testSlowPerformance().catch(console.error);
