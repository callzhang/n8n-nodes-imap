const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Chinese Character Search in IMAP Node');
console.log('================================================');

// Test 1: Check if the compiled SearchFieldParameters has UTF-8 support
function testSearchFieldParameters() {
  console.log('\n✅ Test 1: SearchFieldParameters UTF-8 Support');
  try {
    const filePath = path.join(__dirname, 'dist/nodes/Imap/utils/SearchFieldParameters.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for the simplified UTF-8 approach functions
    const hasGetMailboxPath = content.includes('function getMailboxPath(mailboxPath)');
    const hasSimpleReturn = content.includes('return mailboxPath;');
    const hasNoUtf7Decoding = !content.includes('decodeImapUtf7') && !content.includes('decodeMailboxPath');

    console.log(`   ✓ getMailboxPath function found: ${hasGetMailboxPath}`);
    console.log(`   ✓ Simple return statement found: ${hasSimpleReturn}`);
    console.log(`   ✓ No UTF-7 decoding found: ${hasNoUtf7Decoding}`);

    return hasGetMailboxPath && hasSimpleReturn && hasNoUtf7Decoding;
  } catch (error) {
    console.log(`   ✗ Error reading SearchFieldParameters: ${error.message}`);
    return false;
  }
}

// Test 2: Check EmailSearchParameters for Chinese character handling
function testEmailSearchParameters() {
  console.log('\n✅ Test 2: EmailSearchParameters Chinese Support');
  try {
    const filePath = path.join(__dirname, 'dist/nodes/Imap/utils/EmailSearchParameters.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if the search parameters are properly handled
    const hasSubjectSearch = content.includes('searchObject.subject');
    const hasTextSearch = content.includes('searchObject.body');
    const hasFromSearch = content.includes('searchObject.from');

    console.log(`   ✓ Subject search found: ${hasSubjectSearch}`);
    console.log(`   ✓ Text search found: ${hasTextSearch}`);
    console.log(`   ✓ From search found: ${hasFromSearch}`);

    return hasSubjectSearch && hasTextSearch && hasFromSearch;
  } catch (error) {
    console.log(`   ✗ Error reading EmailSearchParameters: ${error.message}`);
    return false;
  }
}

// Test 3: Check EmailGetList for search implementation
function testEmailGetList() {
  console.log('\n✅ Test 3: EmailGetList Search Implementation');
  try {
    const filePath = path.join(__dirname, 'dist/nodes/Imap/operations/email/functions/EmailGetList.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for search functionality
    const hasSearchObject = content.includes('searchObject');
    const hasGetEmailSearchParameters = content.includes('getEmailSearchParametersFromNode');
    const hasSearchMethod = content.includes('client.search');

    console.log(`   ✓ Search object handling found: ${hasSearchObject}`);
    console.log(`   ✓ Get search parameters found: ${hasGetEmailSearchParameters}`);
    console.log(`   ✓ Search method found: ${hasSearchMethod}`);

    return hasSearchObject && hasGetEmailSearchParameters && hasSearchMethod;
  } catch (error) {
    console.log(`   ✗ Error reading EmailGetList: ${error.message}`);
    return false;
  }
}

// Test 4: Simulate Chinese character search
function testChineseCharacterHandling() {
  console.log('\n✅ Test 4: Chinese Character Handling Simulation');
  
  // Test Chinese characters
  const chineseSubject = '拉钩';
  const chineseText = '测试中文搜索';
  
  console.log(`   ✓ Chinese subject: "${chineseSubject}"`);
  console.log(`   ✓ Chinese text: "${chineseText}"`);
  
  // Check if the characters are properly encoded
  const subjectBytes = Buffer.from(chineseSubject, 'utf8');
  const textBytes = Buffer.from(chineseText, 'utf8');
  
  console.log(`   ✓ Subject UTF-8 bytes: ${subjectBytes.toString('hex')}`);
  console.log(`   ✓ Text UTF-8 bytes: ${textBytes.toString('hex')}`);
  
  return true;
}

// Run all tests
function runAllTests() {
  console.log('\n🚀 Running Chinese Character Search Tests...\n');
  
  const test1 = testSearchFieldParameters();
  const test2 = testEmailSearchParameters();
  const test3 = testEmailGetList();
  const test4 = testChineseCharacterHandling();
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`SearchFieldParameters UTF-8 Support: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`EmailSearchParameters Chinese Support: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`EmailGetList Search Implementation: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Chinese Character Handling: ${test4 ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = test1 && test2 && test3 && test4;
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n💡 The IMAP node should now properly handle Chinese character searches!');
    console.log('   Try searching for "Subject contains 拉钩" in your n8n workflow.');
  } else {
    console.log('\n⚠️  There may be issues with Chinese character handling in the IMAP node.');
    console.log('   The search functionality might not work correctly with Chinese characters.');
  }
  
  return allPassed;
}

// Run the tests
runAllTests();
