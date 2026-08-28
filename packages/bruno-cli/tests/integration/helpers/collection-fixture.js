const fs = require('fs');
const os = require('os');
const path = require('path');

// Copies a fixture collection into a throwaway directory so a run can never write
// back into the repo, and returns its path; the caller removes it. Fixtures hold
// real {{var}} references, so a run supplies their values with --env-var.
const createCollectionFixture = (from) => {
  // macOS os.tmpdir() is a symlink; the CLI's __dirname is derived from
  // collection.pathname (set from process.cwd(), which is realpath'd), so
  // realpath the fixture dir here to keep persisted path assertions matching.
  const targetDir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), `bruno-${path.basename(from)}-`))
  );
  fs.cpSync(from, targetDir, { recursive: true });
  return targetDir;
};

module.exports = { createCollectionFixture };
