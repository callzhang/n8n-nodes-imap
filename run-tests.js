#!/usr/bin/env node

/**
 * Test runner for IMAP Enhanced Node tests
 * Runs all tests and provides a comprehensive report
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const tests = [
    {
        name: 'fetchOne UID Parameter Test',
        file: 'test-fetchone-uid-parameter.js',
        description: 'Tests the fetchOne uid parameter issue and fix'
    },
    {
        name: 'N8N Node Behavior Test',
        file: 'test-n8n-node-behavior.js',
        description: 'Tests the complete n8n node behavior flow'
    },
    {
        name: 'Regression Test',
        file: 'test-regression-fetchone-uid.js',
        description: 'Regression test to prevent future issues'
    },
    {
        name: 'Multi-Provider Test',
        file: 'test-multi-provider.js',
        description: 'Tests both Alimail and Gmail providers'
    }
];

async function runTest(testFile) {
    return new Promise((resolve) => {
        exec(`node ${testFile}`, (error, stdout, stderr) => {
            resolve({
                success: !error,
                stdout,
                stderr,
                error
            });
        });
    });
}

async function runAllTests() {
    console.log('🧪 Running IMAP Enhanced Node Tests\n');
    console.log('=====================================\n');

    // Check if secrets.yaml exists
    if (!fs.existsSync('secrets.yaml')) {
        console.log('❌ secrets.yaml not found!');
        console.log('📝 Please copy secrets.yaml.template to secrets.yaml and fill in your credentials.');
        console.log('   cp secrets.yaml.template secrets.yaml');
        console.log('   # Then edit secrets.yaml with your actual credentials\n');
        return [];
    }

    const results = [];
    let totalTests = 0;
    let passedTests = 0;

    for (const test of tests) {
        console.log(`🔍 Running ${test.name}...`);
        console.log(`   ${test.description}\n`);

        const testPath = path.join(__dirname, test.file);
        const result = await runTest(testPath);

        if (result.success) {
            console.log(`✅ ${test.name} - PASSED\n`);
            passedTests++;
        } else {
            console.log(`❌ ${test.name} - FAILED\n`);
            if (result.stderr) {
                console.log(`Error: ${result.stderr}\n`);
            }
        }

        results.push({
            name: test.name,
            success: result.success,
            stdout: result.stdout,
            stderr: result.stderr
        });

        totalTests++;
    }

    // Summary
    console.log('📊 Test Summary');
    console.log('===============');
    console.log(`Total test suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed!');
        console.log('✅ The IMAP Enhanced Node is working correctly.');
        console.log('✅ The fetchOne uid parameter issue has been resolved.');
        console.log('✅ The n8n node should now return data correctly.');
    } else {
        console.log('⚠️  Some tests failed.');
        console.log('❌ Please review the failed tests and fix any issues.');
    }

    return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests, tests };
