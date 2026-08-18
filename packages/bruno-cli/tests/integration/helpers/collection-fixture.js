const fs = require('fs');
const os = require('os');
const path = require('path');

// Copies a fixture collection into a throwaway directory so a run can never write
// back into the repo, and returns its path; the caller removes it. Fixtures hold
// real {{var}} references, so a run supplies their values with --env-var.
const createCollectionFixture = (from) => {
  // realpathSync: macOS os.tmpdir() is a symlink; the sandbox resolves __dirname
  // via the realpath, so callers asserting on persisted path values need the same.
  const targetDir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), `bruno-${path.basename(from)}-`))
  );
  fs.cpSync(from, targetDir, { recursive: true });
  return targetDir;
};

module.exports = { createCollectionFixture };
