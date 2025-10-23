// @ts-nocheck
import { ImapFlow } from 'imapflow';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

/**
 * Multi-provider integration tests
 * Tests the fetchOne uid parameter fix across different email providers
 */
describe('Multi-Provider Integration Tests', () => {
    jest.setTimeout(60000); // 60 seconds timeout for all tests in this suite
    let secrets: any;
    let providers: Array<{
        name: string;
        config: any;
        testMailbox: string;
        testSearch: any;
    }>;

    beforeAll(() => {
        // Load credentials
        try {
            const secretsFile = fs.readFileSync('secrets.yaml', 'utf8');
            secrets = yaml.load(secretsFile);
        } catch (error) {
            console.warn('secrets.yaml not found, skipping integration tests');
            return;
        }

        providers = [
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
    });

    describe.each([
        ['Alimail', 'alimail'],
        ['Gmail', 'gmail']
    ])('%s Provider Tests', (providerName, configKey) => {
        let client: ImapFlow;
        let providerConfig: any;

        beforeAll(async () => {
            if (!secrets || !secrets[configKey]) {
                console.warn(`${providerName} credentials not found, skipping tests`);
                return;
            }

            providerConfig = secrets[configKey];
            const [host, port] = providerConfig.host.split(':');

            client = new ImapFlow({
                host: host,
                port: parseInt(port),
                secure: true,
                auth: {
                    user: providerConfig.user,
                    pass: providerConfig.password,
                },
                logger: false
            });

            try {
                await client.connect();
                console.log(`✅ Connected to ${providerName}`);
            } catch (error) {
                console.warn(`❌ Failed to connect to ${providerName}: ${(error as Error).message}`);
                throw error;
            }
        });

        afterAll(async () => {
            if (client) {
                try {
                    await client.logout();
                    console.log(`🔌 Disconnected from ${providerName}`);
                } catch (error) {
                    // Ignore logout errors
                }
            }
        });

        test('should connect successfully', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }
            expect(client.authenticated).toBe(true);
        });

        test('should open mailbox successfully', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            const testMailbox = providerName === 'Alimail' ? '垃圾邮件' : 'INBOX';
            await client.mailboxOpen(testMailbox, { readOnly: true });
            expect(client.mailbox).toBeDefined();
        });

        test('should perform search successfully', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            const testMailbox = providerName === 'Alimail' ? '垃圾邮件' : 'INBOX';
            await client.mailboxOpen(testMailbox, { readOnly: true });

            const searchResults = await client.search({ seen: false });
            expect(searchResults).toBeDefined();
            expect(Array.isArray(searchResults)).toBe(true);
        });

        test('should fetch email without uid parameter (fix test)', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            const testMailbox = providerName === 'Alimail' ? '垃圾邮件' : 'INBOX';
            await client.mailboxOpen(testMailbox, { readOnly: true });

            const searchResults = await client.search({ seen: false });
            if (!searchResults || searchResults.length === 0) {
                console.warn(`No emails found in ${providerName}, skipping fetch test`);
                return;
            }

            const testUid = searchResults[0];
            const sourceQuery = {
                uid: true,
                envelope: true,
                flags: true,
                bodyStructure: true,
                source: true
            };

            // This should work with the fix
            const email = await client.fetchOne(testUid, sourceQuery);
            expect(email).toBeDefined();
            expect(email?.envelope).toBeDefined();
            expect(email?.envelope?.subject).toBeDefined();
        });

        test('should reproduce the uid parameter bug', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            const testMailbox = providerName === 'Alimail' ? '垃圾邮件' : 'INBOX';
            await client.mailboxOpen(testMailbox, { readOnly: true });

            const searchResults = await client.search({ seen: false });
            if (!searchResults || searchResults.length === 0) {
                console.warn(`No emails found in ${providerName}, skipping bug reproduction test`);
                return;
            }

            const testUid = searchResults[0];
            const sourceQuery = {
                uid: true,
                envelope: true,
                flags: true,
                bodyStructure: true,
                source: true
            };

            // This should fail with the bug (uid parameter causes issues)
            const email = await client.fetchOne(testUid, sourceQuery, { uid: true });
            // The bug causes this to return null or false
            expect(email).toBeFalsy(); // Accepts both null and false
        });

        test('should fetch multiple emails successfully', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            const testMailbox = providerName === 'Alimail' ? '垃圾邮件' : 'INBOX';
            await client.mailboxOpen(testMailbox, { readOnly: true });

            const searchResults = await client.search({ seen: false });
            if (!searchResults || searchResults.length === 0) {
                console.warn(`No emails found in ${providerName}, skipping multiple fetch test`);
                return;
            }

            const sourceQuery = {
                uid: true,
                envelope: true,
                flags: true,
                bodyStructure: true,
                source: true
            };

            const emails = [];
            for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
                const uid = searchResults[i];
                const email = await client.fetchOne(uid, sourceQuery);
                if (email) {
                    emails.push(email);
                }
            }

            expect(emails.length).toBeGreaterThan(0);
        });

        test('should include source content in fetch', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            const testMailbox = providerName === 'Alimail' ? '垃圾邮件' : 'INBOX';
            await client.mailboxOpen(testMailbox, { readOnly: true });

            const searchResults = await client.search({ seen: false });
            if (!searchResults || searchResults.length === 0) {
                console.warn(`No emails found in ${providerName}, skipping source content test`);
                return;
            }

            const testUid = searchResults[0];
            const sourceQuery = {
                uid: true,
                envelope: true,
                flags: true,
                bodyStructure: true,
                source: true
            };

            const email = await client.fetchOne(testUid, sourceQuery);
            expect(email).toBeDefined();
            expect(email?.source).toBeDefined();
            expect(email?.source?.length).toBeGreaterThan(0);
        });
    });
});
