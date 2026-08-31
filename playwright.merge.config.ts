import { defineConfig } from '@playwright/test';

/** Reporter config for `playwright merge-reports` after sharded CI runs. */
export default defineConfig({
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }]
  ]
});
