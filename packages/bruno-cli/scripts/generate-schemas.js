#!/usr/bin/env node

// Generates JSON Schemas under packages/bruno-cli/schemas/v1/ for the `bru schema`
// command. Mixes two sources:
//
//   1. Auto-generated from @usebruno/schema (Yup) for schemas the @sodaru/yup-to-json-schema
//      converter handles cleanly (today: environment, environments).
//   2. Hand-authored for schemas the converter cannot handle — primarily anything that
//      uses Yup.lazy() for self-referential trees (itemSchema, collectionSchema), or
//      anything not represented in @usebruno/schema (the JSON I/O envelope).
//
// Hand-authored files live under schemas/v1/ already and carry "x-source": "hand-authored".
// This script leaves those untouched and only rewrites schemas marked "x-source": "generated"
// (or those that don't exist yet).
//
// Usage:
//   node scripts/generate-schemas.js           # write/update generated schemas
//   node scripts/generate-schemas.js --check   # verify on-disk matches generator output (CI)

const fs = require('fs');
const path = require('path');
const { convertSchema } = require('@sodaru/yup-to-json-schema');
const { environmentSchema, environmentsSchema } = require('@usebruno/schema');
const { JSON_CONTRACT_VERSION } = require('../src/json/version');

const SCHEMA_DIR = path.resolve(__dirname, '..', 'schemas', `v${JSON_CONTRACT_VERSION}`);

// Walk the converter output and normalise quirks that aren't valid JSON Schema,
// and that don't match the on-disk shape produced by bruno-lang parsers:
//   - { type: [] } → drop (Yup.mixed() emits empty type array; "{}" in JSON Schema means any).
//   - drop "required" arrays everywhere. Yup schemas describe the in-memory model
//     (with synthesised uid, etc.); bruno-lang's parser output is the on-disk shape
//     and lacks those fields. The schemas live as structural hints for agents, not
//     strict validators — agents author payloads that bru request add/edit will then
//     reject precisely if invalid. (PR 5.)
const normalise = (node) => {
  if (Array.isArray(node)) return node.map(normalise);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'type' && Array.isArray(v) && v.length === 0) continue;
      if (k === 'required' && Array.isArray(v)) continue;
      out[k] = normalise(v);
    }
    return out;
  }
  return node;
};

const wrapSchema = ({ kind, title, schema, source }) => ({
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$id': `https://usebruno.com/schemas/v${JSON_CONTRACT_VERSION}/${kind}.json`,
  'x-source': source,
  'x-bruno-contract-version': JSON_CONTRACT_VERSION,
  title,
  ...schema
});

const generated = {
  environment: () => wrapSchema({
    kind: 'environment',
    title: 'Bruno environment',
    source: 'generated',
    schema: normalise(convertSchema(environmentSchema))
  }),
  environments: () => wrapSchema({
    kind: 'environments',
    title: 'Bruno environments (array)',
    source: 'generated',
    schema: normalise(convertSchema(environmentsSchema))
  })
};

const HAND_AUTHORED = ['request', 'collection', 'folder', 'collection-var', 'cli-output'];

const readJsonFile = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJsonFile = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');

const checkMode = process.argv.includes('--check');

const generate = () => {
  if (!fs.existsSync(SCHEMA_DIR)) {
    fs.mkdirSync(SCHEMA_DIR, { recursive: true });
  }

  const drift = [];

  // 1. Generated schemas.
  for (const [kind, build] of Object.entries(generated)) {
    const target = path.join(SCHEMA_DIR, `${kind}.json`);
    const fresh = build();

    if (checkMode) {
      if (!fs.existsSync(target)) {
        drift.push(`${kind}.json missing from disk`);
        continue;
      }
      const onDisk = readJsonFile(target);
      if (JSON.stringify(onDisk) !== JSON.stringify(fresh)) {
        drift.push(`${kind}.json is stale — re-run scripts/generate-schemas.js`);
      }
    } else {
      writeJsonFile(target, fresh);
      console.log(`  wrote ${path.relative(process.cwd(), target)}`);
    }
  }

  // 2. Hand-authored schemas: must exist and be syntactically valid JSON.
  for (const kind of HAND_AUTHORED) {
    const target = path.join(SCHEMA_DIR, `${kind}.json`);
    if (!fs.existsSync(target)) {
      const msg = `${kind}.json (hand-authored) missing from disk`;
      if (checkMode) drift.push(msg);
      else throw new Error(msg + ` — add it under ${SCHEMA_DIR}`);
      continue;
    }
    let parsed;
    try {
      parsed = readJsonFile(target);
    } catch (err) {
      const msg = `${kind}.json is not valid JSON: ${err.message}`;
      if (checkMode) drift.push(msg);
      else throw new Error(msg);
      continue;
    }
    if (parsed['x-source'] !== 'hand-authored') {
      const msg = `${kind}.json missing "x-source": "hand-authored" marker`;
      if (checkMode) drift.push(msg);
      else throw new Error(msg);
    }
  }

  if (checkMode) {
    if (drift.length) {
      console.error('Schema drift detected:');
      for (const d of drift) console.error(`  - ${d}`);
      process.exit(1);
    }
    console.log('Schemas are in sync.');
    return;
  }

  console.log(`\nDone. ${Object.keys(generated).length} generated, ${HAND_AUTHORED.length} hand-authored verified.`);
};

try {
  generate();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
