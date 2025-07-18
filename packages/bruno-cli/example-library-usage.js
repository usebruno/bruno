const { runCollection, BrunoRunner } = require('./src/runner/bruno-runner');
const path = require('path');

/**
 * Example of using Bruno Runner as a library
 * This demonstrates how external applications can use Bruno programmatically
 */

async function exampleUsage() {
  try {
    console.log('=== Bruno Runner Library Example ===\n');

    // Example 1: Basic usage
    console.log('Example 1: Basic collection run');
    const testCollectionPath = path.join(__dirname, 'tests/runner/fixtures/collection-json-from-pathname/collection');
    const basicOptions = {
      collectionPath: testCollectionPath, // Use test collection
      paths: ['./'], // Run all requests in collection
      recursive: true
    };

    console.log('Running with options:', JSON.stringify(basicOptions, null, 2));

    try {
      const result1 = await runCollection(basicOptions);
      console.log('✅ Basic run completed successfully');
      console.log(`   - Total requests: ${result1.summary.totalRequests}`);
      console.log(`   - Passed: ${result1.summary.passedRequests}`);
      console.log(`   - Failed: ${result1.summary.failedRequests}`);
      console.log(`   - Total time: ${result1.totalTime}ms\n`);
    } catch (error) {
      console.log('ℹ️  Basic run failed (expected if no .bru files in current directory)');
      console.log(`   Error: ${error.message}\n`);
    }

    // Example 2: Advanced usage with multiple options
    console.log('Example 2: Advanced configuration');
    const advancedOptions = {
      collectionPath: testCollectionPath,
      paths: ['./'],
      recursive: true,
      testsOnly: false,
      bail: false,
      sandbox: 'developer',
      insecure: false,
      disableCookies: false,
      delay: 500, // 500ms delay between requests
      reporterSkipAllHeaders: false,
      reporterSkipHeaders: ['Authorization', 'Cookie']
    };

    console.log('Running with advanced options:', JSON.stringify(advancedOptions, null, 2));

    try {
      const result2 = await runCollection(advancedOptions);
      console.log('✅ Advanced run completed successfully');
      console.log(`   - Total requests: ${result2.summary.totalRequests}`);
      console.log(`   - Total time: ${result2.totalTime}ms\n`);
    } catch (error) {
      console.log('ℹ️  Advanced run failed (expected if no .bru files in current directory)');
      console.log(`   Error: ${error.message}\n`);
    }

    // Example 3: Multiple runs (demonstrating reusability)
    console.log('Example 3: Multiple runs to demonstrate reusability');

    for (let i = 1; i <= 3; i++) {
      console.log(`Run ${i}:`);
      try {
        const result = await runCollection({
          collectionPath: testCollectionPath,
          paths: ['./'],
          recursive: true
        });
        console.log(`   ✅ Run ${i} completed - ${result.summary.totalRequests} requests processed`);
      } catch (error) {
        console.log(`   ℹ️  Run ${i} failed: ${error.message}`);
      }
    }

    // Example 4: Report generation
    console.log('\nExample 4: Report generation');

    try {
      const result4 = await runCollection({
        collectionPath: testCollectionPath,
        paths: ['./'],
        recursive: true,
        generateReports: {
          json: './example-results.json',
          html: './example-results.html'
        }
      });
      console.log('✅ Report generation completed successfully');
      console.log(`   - Generated JSON and HTML reports`);
      console.log(`   - Total requests: ${result4.summary.totalRequests}`);

      // Clean up generated files
      const fs = require('fs');
      try {
        if (fs.existsSync('./example-results.json')) fs.unlinkSync('./example-results.json');
        if (fs.existsSync('./example-results.html')) fs.unlinkSync('./example-results.html');
        console.log('   - Cleaned up example report files');
      } catch (cleanupError) {
        console.log('   - Note: Could not clean up example files');
      }
    } catch (error) {
      console.log('ℹ️  Report generation failed (expected if no .bru files in current directory)');
      console.log(`   Error: ${error.message}`);
    }

    // Example 5: Event-based API (Newman-like events)
    console.log('\nExample 5: Event-based API with Newman-like events');

    const runner = new BrunoRunner();

    // Set up event listeners
    runner.on('start', (data) => {
      console.log('🚀 Collection started');
      console.log(`   Collection Path: ${data.options.collectionPath}`);
    });

    runner.on('item', (data) => {
      console.log(`📋 Request completed: ${data.item.name}`);
      console.log(`   Progress: ${data.index + 1}/${data.total}`);
      console.log(`   Status: ${data.result.error ? 'FAILED' : 'PASSED'}`);
      if (data.result.response) {
        console.log(`   Response Time: ${data.result.response.responseTime}ms`);
      }
    });

    runner.on('done', (data) => {
      console.log('✅ Collection completed');
      console.log(`   Duration: ${data.duration}ms`);
      if (data.summary) {
        console.log(`   Total Requests: ${data.summary.totalRequests}`);
        console.log(`   Passed: ${data.summary.passedRequests}`);
        console.log(`   Failed: ${data.summary.failedRequests}`);
      }
    });

    try {
      const result5 = await runner.run({
        collectionPath: testCollectionPath,
        paths: ['./'],
        recursive: true
      });
      console.log('✅ Event-based run completed successfully');
    } catch (error) {
      console.log('ℹ️  Event-based run failed (expected if no .bru files in current directory)');
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n=== Library Usage Examples Complete ===');
    console.log('The Bruno Runner library can be called multiple times from external applications!');
    console.log('It now supports report generation in JSON, JUnit, and HTML formats!');
    console.log('It also supports Newman-like events for real-time monitoring!');

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  exampleUsage();
}

module.exports = { exampleUsage };
