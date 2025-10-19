const { ImapFlow } = require('imapflow');
const yaml = require('js-yaml');
const fs = require('fs');

async function testPerformanceFix() {
    console.log('🚀 Testing performance fix for no search criteria...\n');

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

        // Test 2: Simulate the OLD behavior (fetch UIDs, then fetch individually)
        console.log('🐌 Test 2: OLD behavior (fetch UIDs, then fetch individually)...');
        const start2 = Date.now();

        // Step 1: Fetch all UIDs
        const allUids = [];
        for await (const email of client.fetch({}, { uid: true })) {
            if (email.uid) {
                allUids.push(email.uid);
            }
        }
        const time2a = Date.now() - start2;
        console.log(`✅ Step 1 - All UIDs fetched: ${time2a}ms (${allUids.length} emails)`);

        // Step 2: Fetch each email individually (OLD way)
        const start2b = Date.now();
        const emails = [];
        for (let i = 0; i < Math.min(allUids.length, 10); i++) { // Limit to 10 for testing
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
        console.log(`Total OLD time: ${time2a + time2b}ms\n`);

        // Test 3: NEW behavior (fetch all at once)
        console.log('⚡ Test 3: NEW behavior (fetch all at once)...');
        const start3 = Date.now();
        const newEmails = [];
        let count = 0;
        for await (const email of client.fetch({}, {
            uid: true,
            envelope: true,
            flags: true
        })) {
            if (email.uid && count < 10) { // Limit to 10 for testing
                newEmails.push({
                    uid: email.uid,
                    subject: email.envelope?.subject || 'No subject',
                    seen: email.flags?.includes('\\Seen') || false,
                    flagged: email.flags?.includes('\\Flagged') || false
                });
                count++;
            }
        }
        const time3 = Date.now() - start3;
        console.log(`✅ NEW fetch: ${time3}ms (${newEmails.length} emails)\n`);

        // Performance comparison
        console.log('📊 PERFORMANCE COMPARISON:');
        console.log('========================');
        console.log(`OLD approach: ${time2a + time2b}ms for 10 emails`);
        console.log(`NEW approach: ${time3}ms for 10 emails`);

        const improvement = (time2a + time2b) / time3;
        console.log(`\n🚀 NEW approach is ${improvement.toFixed(1)}x faster!`);

        if (improvement > 2) {
            console.log('✅ Significant performance improvement achieved!');
        } else if (improvement > 1.5) {
            console.log('✅ Good performance improvement achieved!');
        } else {
            console.log('⚠️  Performance improvement is minimal');
        }

        console.log(`\n📈 Performance per email:`);
        console.log(`- OLD approach: ${((time2a + time2b) / 10).toFixed(2)}ms per email`);
        console.log(`- NEW approach: ${(time3 / 10).toFixed(2)}ms per email`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.logout();
        console.log('\n🔌 Disconnected');
    }
}

testPerformanceFix().catch(console.error);
