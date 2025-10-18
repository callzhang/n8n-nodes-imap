/**
 * Simple Test for IMAP Enhanced Node
 *
 * Basic functionality test without complex mocking
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Running Simple IMAP Enhanced Node Tests...\n');

// Test 1: Check if main node file exists
function testNodeFileExists() {
  console.log('✅ Test 1: Node file exists');
  const nodeFile = path.join(__dirname, '../dist/nodes/Imap/ImapEnhanced.node.js');
  if (fs.existsSync(nodeFile)) {
    console.log('   ✓ ImapEnhanced.node.js found');
    return true;
  } else {
    console.log('   ✗ ImapEnhanced.node.js not found');
    return false;
  }
}

// Test 2: Check if credentials file exists
function testCredentialsFileExists() {
  console.log('✅ Test 2: Credentials file exists');
  const credFile = path.join(__dirname, '../dist/credentials/ImapCredentials.credentials.js');
  if (fs.existsSync(credFile)) {
    console.log('   ✓ ImapCredentials.credentials.js found');
    return true;
  } else {
    console.log('   ✗ ImapCredentials.credentials.js not found');
    return false;
  }
}

// Test 3: Check if icons exist
function testIconsExist() {
  console.log('✅ Test 3: Icons exist');
  const iconFile = path.join(__dirname, '../dist/nodes/Imap/node-imap-enhanced-icon.svg');
  const altIconFile = path.join(__dirname, '../dist/nodes/Imap/node-imap-enhanced-alt-icon.svg');

  let allExist = true;

  if (fs.existsSync(iconFile)) {
    console.log('   ✓ Main icon found');
  } else {
    console.log('   ✗ Main icon not found');
    allExist = false;
  }

  if (fs.existsSync(altIconFile)) {
    console.log('   ✓ Alt icon found');
  } else {
    console.log('   ✗ Alt icon not found');
    allExist = false;
  }

  return allExist;
}

// Test 4: Check if package.json is valid
function testPackageJson() {
  console.log('✅ Test 4: Package.json is valid');
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    if (packageJson.name === 'n8n-nodes-imap-enhanced') {
      console.log('   ✓ Package name is correct');
    } else {
      console.log('   ✗ Package name is incorrect');
      return false;
    }

    if (packageJson.version) {
      console.log(`   ✓ Version: ${packageJson.version}`);
    } else {
      console.log('   ✗ Version not found');
      return false;
    }

    return true;
  } catch (error) {
    console.log('   ✗ Package.json is invalid:', error.message);
    return false;
  }
}

// Test 5: Check if dist folder structure is correct
function testDistStructure() {
  console.log('✅ Test 5: Dist folder structure');
  const distPath = path.join(__dirname, '../dist');

  if (!fs.existsSync(distPath)) {
    console.log('   ✗ Dist folder not found');
    return false;
  }

  const requiredFiles = [
    'package.json',
    'nodes/Imap/ImapEnhanced.node.js',
    'credentials/ImapCredentials.credentials.js'
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✓ ${file} found`);
    } else {
      console.log(`   ✗ ${file} not found`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

// Test 6: Check if SearchFieldParameters has the right functions
function testSearchFieldParameters() {
  console.log('✅ Test 6: SearchFieldParameters functions');
  try {
    const filePath = path.join(__dirname, '../dist/nodes/Imap/utils/SearchFieldParameters.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for the simplified UTF-8 approach functions
    const hasGetMailboxPath = content.includes('getMailboxPath');
    const hasGetMailboxPathFromNodeParameter = content.includes('getMailboxPathFromNodeParameter');
    const hasLoadMailboxList = content.includes('loadMailboxList');

    if (hasGetMailboxPath) {
      console.log('   ✓ getMailboxPath function found (simplified UTF-8 approach)');
    } else {
      console.log('   ✗ getMailboxPath function not found');
    }

    if (hasGetMailboxPathFromNodeParameter) {
      console.log('   ✓ getMailboxPathFromNodeParameter function found');
    } else {
      console.log('   ✗ getMailboxPathFromNodeParameter function not found');
    }

    if (hasLoadMailboxList) {
      console.log('   ✓ loadMailboxList function found');
    } else {
      console.log('   ✗ loadMailboxList function not found');
    }

    return hasGetMailboxPath && hasGetMailboxPathFromNodeParameter && hasLoadMailboxList;
  } catch (error) {
    console.log('   ✗ Error reading SearchFieldParameters:', error.message);
    return false;
  }
}

// Run all tests
function runTests() {
  const tests = [
    testNodeFileExists,
    testCredentialsFileExists,
    testIconsExist,
    testPackageJson,
    testDistStructure,
    testSearchFieldParameters
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    if (test()) {
      passed++;
    }
    console.log('');
  }

  console.log('📊 Test Results:');
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! The IMAP Enhanced Node is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
  }

  return passed === total;
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);
