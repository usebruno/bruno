const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { runCli } = require('../helpers/run-cli');
const { createCollectionFixture } = require('../helpers/collection-fixture');

const FIXTURE_COLLECTION = path.join(__dirname, 'fixtures', 'collection');

const NETWORK_TIMEOUT = 30000;

// Digest credentials must be interpolated before the interceptor hashes them; the endpoint
// answers 200 only for the resolved password, which the fixture's test checks on the response.
describe('CLI run — digest auth credentials are interpolated', () => {
  let collectionDir;

  beforeEach(() => {
    collectionDir = createCollectionFixture(FIXTURE_COLLECTION);
  });

  afterEach(() => {
    fs.rmSync(collectionDir, { recursive: true, force: true });
  });

  it(
    'resolves {{var}} in request-level digest credentials',
    async () => {
      const { code, stdout, stderr } = await runCli(['run', 'request-level.yml', '--env', 'local'], collectionDir);

      expect({ code, stdout, stderr }).toMatchObject({ code: 0 });
    },
    NETWORK_TIMEOUT
  );
});
