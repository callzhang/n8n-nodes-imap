const { ImapFlow } = require('imapflow');
const { NodeHtmlMarkdown } = require('node-html-markdown');

// Test credentials
const config = {
  host: 'imap.qiye.aliyun.com',
  port: 993,
  secure: true,
  auth: {
    user: 'derek@stardust.ai',
    pass: 'wTYaIgdcdeLDeG0V'
  }
};

// HTML conversion functions
const nhm = new NodeHtmlMarkdown();

function htmlToMarkdown(html) {
  if (!html) return '';
  return nhm.translate(html);
}

function htmlToText(html) {
  if (!html) return '';
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '\n$1\n')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '\n$1\n')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n');
  return text.trim();
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function testBodyFetching() {
  console.log('🔌 Connecting to IMAP server...');
  const client = new ImapFlow(config);
  
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Open INBOX
    console.log('📁 Opening INBOX...');
    await client.mailboxOpen('INBOX');
    console.log('✅ INBOX opened successfully!');
    
    // Search for recent emails
    console.log('🔍 Searching for recent emails...');
    const searchResult = await client.search({ seen: false }, { uid: true });
    console.log(`Found ${searchResult.length} unread emails`);
    
    if (searchResult.length === 0) {
      console.log('📧 No unread emails found, searching for any recent emails...');
      const allEmails = await client.search({ all: true }, { uid: true });
      console.log(`Found ${allEmails.length} total emails`);
      
      if (allEmails.length === 0) {
        console.log('❌ No emails found in mailbox');
        return;
      }
      
      // Use the most recent email
      searchResult.push(allEmails[allEmails.length - 1]);
    }
    
    // Test with the first email
    const emailUid = searchResult[0];
    console.log(`📧 Testing with email UID: ${emailUid}`);
    
    // Fetch email with body structure
    console.log('📥 Fetching email with body structure...');
    const fetchQuery = {
      uid: true,
      envelope: true,
      bodyStructure: true,
      flags: true
    };
    
    const email = await client.fetchOne(emailUid, fetchQuery);
    console.log('✅ Email fetched successfully!');
    
    // Log envelope info
    console.log('\n📋 Email Envelope:');
    console.log(`  Subject: ${email.envelope?.subject || 'No subject'}`);
    console.log(`  From: ${email.envelope?.from?.[0]?.address || 'No from'}`);
    console.log(`  Date: ${email.envelope?.date || 'No date'}`);
    
    // Log body structure
    console.log('\n🏗️ Body Structure:');
    console.log(JSON.stringify(email.bodyStructure, null, 2));
    
    // Analyze body structure
    if (email.bodyStructure) {
      console.log('\n🔍 Analyzing body structure...');
      
      // Simple body structure analysis
      function analyzeBodyStructure(bodyStructure, partId = '') {
        const parts = [];
        
        if (bodyStructure.type) {
          const currentPart = {
            partId: partId || 'TEXT',
            type: bodyStructure.type,
            subtype: bodyStructure.subtype,
            disposition: bodyStructure.disposition,
            filename: bodyStructure.dispositionParameters?.filename
          };
          parts.push(currentPart);
        }
        
        if (bodyStructure.childNodes) {
          bodyStructure.childNodes.forEach((child, index) => {
            const childPartId = partId ? `${partId}.${index + 1}` : `${index + 1}`;
            parts.push(...analyzeBodyStructure(child, childPartId));
          });
        }
        
        return parts;
      }
      
      const partsInfo = analyzeBodyStructure(email.bodyStructure);
      console.log('📦 Parts found:');
      partsInfo.forEach(part => {
        console.log(`  - Part ${part.partId}: ${part.type}/${part.subtype} (${part.disposition || 'inline'})`);
        if (part.filename) {
          console.log(`    Filename: ${part.filename}`);
        }
      });
      
      // Find text and HTML parts
      const textPart = partsInfo.find(part => part.type === 'text' && part.subtype === 'plain');
      const htmlPart = partsInfo.find(part => part.type === 'text' && part.subtype === 'html');
      
      console.log(`\n📝 Text part: ${textPart ? `Part ${textPart.partId}` : 'Not found'}`);
      console.log(`🌐 HTML part: ${htmlPart ? `Part ${htmlPart.partId}` : 'Not found'}`);
      
      // Try to download content
      if (textPart) {
        console.log('\n📥 Downloading text content...');
        try {
          const textContent = await client.download(emailUid, textPart.partId, { uid: true });
          if (textContent.content) {
            const text = await streamToString(textContent.content);
            console.log('✅ Text content downloaded:');
            console.log(`Length: ${text.length} characters`);
            console.log(`Preview: ${text.substring(0, 200)}...`);
          } else {
            console.log('❌ No text content found');
          }
        } catch (error) {
          console.log(`❌ Error downloading text content: ${error.message}`);
        }
      }
      
      if (htmlPart) {
        console.log('\n📥 Downloading HTML content...');
        try {
          const htmlContent = await client.download(emailUid, htmlPart.partId, { uid: true });
          if (htmlContent.content) {
            const html = await streamToString(htmlContent.content);
            console.log('✅ HTML content downloaded:');
            console.log(`Length: ${html.length} characters`);
            console.log(`Preview: ${html.substring(0, 200)}...`);
            
            // Test conversions
            console.log('\n🔄 Testing conversions...');
            const markdown = htmlToMarkdown(html);
            const text = htmlToText(html);
            
            console.log(`Markdown length: ${markdown.length} characters`);
            console.log(`Text length: ${text.length} characters`);
            console.log(`Markdown preview: ${markdown.substring(0, 200)}...`);
            console.log(`Text preview: ${text.substring(0, 200)}...`);
          } else {
            console.log('❌ No HTML content found');
          }
        } catch (error) {
          console.log(`❌ Error downloading HTML content: ${error.message}`);
        }
      }
      
      // If no specific parts found, try downloading the whole message
      if (!textPart && !htmlPart) {
        console.log('\n📥 No specific parts found, trying to download whole message...');
        try {
          const wholeMessage = await client.download(emailUid, 'TEXT', { uid: true });
          if (wholeMessage.content) {
            const content = await streamToString(wholeMessage.content);
            console.log('✅ Whole message downloaded:');
            console.log(`Length: ${content.length} characters`);
            console.log(`Preview: ${content.substring(0, 500)}...`);
          } else {
            console.log('❌ No whole message content found');
          }
        } catch (error) {
          console.log(`❌ Error downloading whole message: ${error.message}`);
        }
      }
      
    } else {
      console.log('❌ No body structure found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('\n🔌 Closing connection...');
    await client.logout();
    console.log('✅ Connection closed');
  }
}

// Run the test
console.log('🚀 Starting body fetching test...');
testBodyFetching().catch(console.error);
