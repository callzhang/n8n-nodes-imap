// @ts-nocheck
import { ImapFlow } from 'imapflow';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

/**
 * N8N Node Behavior Integration Tests
 * Tests the complete n8n node execution flow across providers
 */
describe('N8N Node Behavior Tests', () => {
    jest.setTimeout(60000); // 60 seconds timeout for all tests in this suite
    let secrets: any;

    beforeAll(() => {
        // Load credentials
        try {
            const secretsFile = fs.readFileSync('secrets.yaml', 'utf8');
            secrets = yaml.load(secretsFile);
        } catch (error) {
            console.warn('secrets.yaml not found, skipping integration tests');
        }
    });

    describe.each([
        ['Alimail', 'alimail', '垃圾邮件'],
        ['Gmail', 'gmail', 'INBOX']
    ])('%s N8N Node Behavior', (providerName, configKey, testMailbox) => {
        let client: ImapFlow;

        beforeAll(async () => {
            if (!secrets || !secrets[configKey]) {
                console.warn(`${providerName} credentials not found, skipping tests`);
                return;
            }

            const [host, port] = secrets[configKey].host.split(':');
            client = new ImapFlow({
                host: host,
                port: parseInt(port),
                secure: true,
                auth: {
                    user: secrets[configKey].user,
                    pass: secrets[configKey].password,
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

        test('should simulate n8n node execution flow', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            // Simulate n8n node parameters
            const mailboxPath = testMailbox;
            const searchObject = { seen: false };
            const includeParts = ['MarkdownContent', 'TextContent', 'HtmlContent'];
            const limit = 8;

            // Step 1: Open mailbox
            await client.mailboxOpen(mailboxPath, { readOnly: true });
            expect(client.mailbox).toBeDefined();

            // Step 2: Build fetch query (like n8n does)
            const fetchQuery = {
                uid: true,
                envelope: true,
                flags: true,
                bodyStructure: true,
                source: true  // Added because content parts are requested
            };

            // Step 3: Server-side search
            const searchResults = await client.search(searchObject);
            expect(searchResults).toBeDefined();
            expect(Array.isArray(searchResults)).toBe(true);

            if (searchResults.length === 0) {
                console.warn(`No emails found in ${providerName}, skipping remaining tests`);
                return;
            }

            // Step 4: Individual email fetching (with fix)
            const emailsList = [];
            let totalCount = 0;

            for (const uid of searchResults) {
                if (totalCount >= limit) break;

                try {
                    // FIXED: Remove { uid: true } parameter
                    const email = await client.fetchOne(uid, fetchQuery);
                    if (email) {
                        (email as any).mailboxPath = mailboxPath;
                        emailsList.push(email);
                        totalCount++;
                    }
                } catch (fetchError) {
                    console.warn(`Failed to fetch UID ${uid}: ${(fetchError as Error).message}`);
                }
            }

            expect(emailsList.length).toBeGreaterThan(0);

            // Step 5: Email processing (like n8n does)
            const returnData = [];
            for (const email of emailsList) {
                const item_json = {
                    seq: email.seq,
                    uid: email.uid,
                    mailboxPath: (email as any).mailboxPath,
                    envelope: email.envelope,
                    labels: email.flags,
                    size: email.size
                };

                // Add content if available
                if (email.source) {
                    (item_json as any).hasSource = true;
                    (item_json as any).sourceLength = email.source.length;
                }

                returnData.push({
                    json: item_json
                });
            }

            expect(returnData.length).toBeGreaterThan(0);
            expect(returnData[0].json.uid).toBeDefined();
            expect(returnData[0].json.envelope).toBeDefined();
        });

        test('should handle search with no results gracefully', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            await client.mailboxOpen(testMailbox, { readOnly: true });

            // Search for something that likely won't exist
            const searchResults = await client.search({
                seen: false,
                from: 'nonexistent@example.com'
            });

            expect(searchResults).toBeDefined();
            // Alimail may return false instead of empty array
            expect(Array.isArray(searchResults) || searchResults === false).toBe(true);
            // Should handle empty results gracefully
        });

        test('should verify content inclusion', async () => {
            if (!client) {
                console.warn(`${providerName} client not available, skipping test`);
                return;
            }

            await client.mailboxOpen(testMailbox, { readOnly: true });

            const searchResults = await client.search({ seen: false });
            if (searchResults.length === 0) {
                console.warn(`No emails found in ${providerName}, skipping content test`);
                return;
            }

            const fetchQuery = {
                uid: true,
                envelope: true,
                flags: true,
                bodyStructure: true,
                source: true
            };

            const email = await client.fetchOne(searchResults[0], fetchQuery);
            expect(email).toBeDefined();
            expect(email?.source).toBeDefined();
            expect(email?.source?.length).toBeGreaterThan(0);
        });
    });
});
