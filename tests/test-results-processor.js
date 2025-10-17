/**
 * Test Results Processor
 *
 * Processes test results and generates reports
 */

const fs = require('fs');
const path = require('path');

module.exports = function processTestResults(results) {
  console.log('📊 Processing test results...');

  // Create test results directory
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: results.numTotalTests,
    passedTests: results.numPassedTests,
    failedTests: results.numFailedTests,
    skippedTests: results.numPendingTests,
    successRate: ((results.numPassedTests / results.numTotalTests) * 100).toFixed(2) + '%',
    duration: results.startTime ? Date.now() - results.startTime : 0,
    testSuites: results.numTotalTestSuites,
    passedSuites: results.numPassedTestSuites,
    failedSuites: results.numFailedTestSuites,
  };

  // Write summary to file
  fs.writeFileSync(
    path.join(resultsDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  // Generate detailed results
  const detailedResults = {
    summary,
    testResults: results.testResults.map(testResult => ({
      testFilePath: testResult.testFilePath,
      numFailingTests: testResult.numFailingTests,
      numPassingTests: testResult.numPassingTests,
      numPendingTests: testResult.numPendingTests,
      numTodoTests: testResult.numTodoTests,
      perfStats: testResult.perfStats,
      failureMessages: testResult.failureMessages,
    })),
  };

  // Write detailed results to file
  fs.writeFileSync(
    path.join(resultsDir, 'detailed-results.json'),
    JSON.stringify(detailedResults, null, 2)
  );

  // Generate HTML report
  const htmlReport = generateHtmlReport(summary, results);
  fs.writeFileSync(
    path.join(resultsDir, 'report.html'),
    htmlReport
  );

  console.log(`✅ Test results processed and saved to ${resultsDir}`);
  console.log(`📈 Success Rate: ${summary.successRate}`);
  console.log(`⏱️  Duration: ${summary.duration}ms`);

  return results;
};

function generateHtmlReport(summary, results) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMAP Enhanced Node Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .stat.passed { background: #d4edda; }
        .stat.failed { background: #f8d7da; }
        .stat.skipped { background: #fff3cd; }
        .success-rate { font-size: 24px; font-weight: bold; color: #28a745; }
        .failure-rate { font-size: 24px; font-weight: bold; color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 IMAP Enhanced Node Test Results</h1>
        <p>Generated on: ${new Date(summary.timestamp).toLocaleString()}</p>
    </div>

    <div class="stats">
        <div class="stat passed">
            <h3>✅ Passed</h3>
            <div class="success-rate">${summary.passedTests}</div>
        </div>
        <div class="stat failed">
            <h3>❌ Failed</h3>
            <div class="failure-rate">${summary.failedTests}</div>
        </div>
        <div class="stat skipped">
            <h3>⏭️ Skipped</h3>
            <div>${summary.skippedTests}</div>
        </div>
        <div class="stat">
            <h3>📊 Success Rate</h3>
            <div class="success-rate">${summary.successRate}</div>
        </div>
    </div>

    <div class="stats">
        <div class="stat">
            <h3>⏱️ Duration</h3>
            <div>${summary.duration}ms</div>
        </div>
        <div class="stat">
            <h3>📁 Test Suites</h3>
            <div>${summary.testSuites}</div>
        </div>
        <div class="stat">
            <h3>🧪 Total Tests</h3>
            <div>${summary.totalTests}</div>
        </div>
    </div>

    <h2>Test Results</h2>
    <ul>
        ${results.testResults.map(testResult => `
            <li>
                <strong>${testResult.testFilePath}</strong>
                <ul>
                    <li>Passed: ${testResult.numPassingTests}</li>
                    <li>Failed: ${testResult.numFailingTests}</li>
                    <li>Skipped: ${testResult.numPendingTests}</li>
                    <li>Duration: ${testResult.perfStats.end - testResult.perfStats.start}ms</li>
                </ul>
            </li>
        `).join('')}
    </ul>
</body>
</html>
  `;
}
