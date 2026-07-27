const { describe, it, expect } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { parseRequest, stringifyRequest } = require('@usebruno/filestore');

const FIXTURE_ROOT = path.resolve(__dirname, '..', '..', '..', 'bruno-tests', 'collection');

const walkBruFiles = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'environments') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkBruFiles(full));
    else if (entry.name.endsWith('.bru') && entry.name !== 'collection.bru' && entry.name !== 'folder.bru') {
      out.push(full);
    }
  }
  return out;
};

// Safety net for `bru request add/edit`: if parse → stringify → parse drifts on any
// real fixture, the write commands would silently corrupt user collections.
// Structural (deep-equal) round-trip is the real correctness bar; byte-identical
// would be nice-to-have but bruno-lang isn't formally promising stable formatting.
describe('bruno-lang request round-trip — structural lock', () => {
  const fixtures = walkBruFiles(FIXTURE_ROOT);

  it('finds a meaningful fixture set', () => {
    expect(fixtures.length).toBeGreaterThan(20);
  });

  it('parseRequest → stringifyRequest → parseRequest is the identity', () => {
    const failures = [];
    for (const file of fixtures) {
      const original = fs.readFileSync(file, 'utf8');
      let firstParse;
      try { firstParse = parseRequest(original, { format: 'bru' }); } catch (err) {
        failures.push({ file: path.relative(FIXTURE_ROOT, file), phase: 'parse-1', error: err.message }); continue;
      }

      let restringified;
      try { restringified = stringifyRequest(firstParse, { format: 'bru' }); } catch (err) {
        failures.push({ file: path.relative(FIXTURE_ROOT, file), phase: 'stringify', error: err.message }); continue;
      }

      let secondParse;
      try { secondParse = parseRequest(restringified, { format: 'bru' }); } catch (err) {
        failures.push({ file: path.relative(FIXTURE_ROOT, file), phase: 'parse-2', error: err.message }); continue;
      }

      // Deep equality — structural identity.
      try { expect(secondParse).toEqual(firstParse); } catch (err) {
        failures.push({
          file: path.relative(FIXTURE_ROOT, file),
          phase: 'compare',
          // Trim the message — jest's deep-equal diff is huge.
          error: err.message.split('\n').slice(0, 4).join('\n')
        });
      }
    }
    if (failures.length) {
      throw new Error(
        `${failures.length} fixtures failed structural round-trip:\n`
        + JSON.stringify(failures.slice(0, 8), null, 2)
        + (failures.length > 8 ? `\n... and ${failures.length - 8} more` : '')
      );
    }
  });
});
