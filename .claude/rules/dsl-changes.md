---
paths:
  - "packages/bruno-app/**"
  - "packages/bruno-electron/**"
  - "packages/bruno-cli/**"
  - "packages/bruno-lang/**"
  - "packages/bruno-filestore/**"
  - "packages/bruno-schema/**"
  - "packages/bruno-schema-types/**"
  - "packages/bruno-converters/**"
---

# On-Disk DSL & Serialization Changes

Bruno persists everything users create — collections, requests, environments, folders, and
config — as plain-text files on the user's disk and in their Git repos. Two on-disk formats
exist:

- **`.bru`** — the Bru DSL. Read/write goes through the **v2 (ohm-js)** grammar in
  `packages/bruno-lang/v2/src`, via `packages/bruno-filestore/src/formats/bru`
  (`bruToJsonV2` / `jsonToBruV2`). Make all `.bru` changes in v2.
- **`.yml`** — OpenCollection YAML, handled by `packages/bruno-filestore/src/formats/yml`. This is
  the current `DEFAULT_COLLECTION_FORMAT` (canonical: `packages/bruno-filestore/src/constants.ts`,
  duplicated for the renderer in `packages/bruno-app/src/utils/common/constants.js`), so new
  collections are `.yml` unless the user chooses otherwise.
- Plus `bruno.json` (per-collection config, passed through `stringifyCollection`) and `.env` files
  (`parseDotEnv` / `dotenvToJson`).

(`packages/bruno-toml` exists but is **orphaned** — imported nowhere outside its own test and on no
serialization path; a DSL change never needs it. `preferences.json` is app-level electron-store
state under `userData`, not part of a collection's on-disk contract, so it is out of scope here.)

These files outlive the version that wrote them: an older Bruno reads files written by a
newer one, teammates on different versions share the same repo, and users hand-commit these
files. **A change to the on-disk shape is a change to a public contract.** Get it wrong and
you break parsing, corrupt collections, or silently drop user data — on collections you
can't reach to fix.

The in-memory objects that become these files are often assembled far from the serialization
layer — in `bruno-electron` (IPC handlers) or `bruno-app` (Redux) — and handed to
`bruno-filestore`, which can't tell that a field's shape changed upstream. So a DSL-affecting
change can originate in *any* package on the data path, not just the format packages. Treat
this rule as in scope for changes anywhere the collection/request/environment/config object
is built, mutated, or serialized — the serialization packages plus `bruno-app`,
`bruno-electron`, and `bruno-cli`, where these objects are assembled or read/written. Adding a
persisted field in app/electron without wiring it through `bruno-filestore` (both formats) and
`bruno-schema` silently drops or rejects data on save — the exact bug this rule guards against.

## Rules

**Avoid unnecessary DSL changes.** First ask whether the need can be met in memory, in the
UI, or as a derived value without touching the serialized shape at all — most enhancements
can. Only change the on-disk format when the data genuinely must persist.

**Additive and optional only.** A new field must be optional with a safe default, so files
without it still parse and behave. Never rename, remove, repurpose, or retype an existing
field, and never change its semantics — old files and old app versions depend on the
current meaning.

**Round-trip must be lossless.** `parse(stringify(x))` must equal `x`, and `stringify` must
never drop fields it doesn't recognize. A file written by a newer version, opened and
re-saved by an older one, must not lose the newer fields.

**Prove escaping on the written bytes, not in memory.** When a value is embedded in a
delimited block (`.bru` multiline `'''…'''`, annotation args), an in-memory `escape`/`unescape`
round-trip can pass while the on-disk file still corrupts — the parser terminates at the first
re-introduced delimiter. Test `parse(read(serialize(x)))` on the actual bytes, and fuzz across
quote/backslash runs. Escape at single-character granularity: escaping a multi-character
delimiter by splitting on the whole delimiter (`split("'''")`) leaves fragments that recombine
on runs of length ≥ the delimiter; escape the backslash first, then every single delimiter char.
Ref: `escapeMultilineDescription` in `bruno-lang/v2/src/utils.js`.

**New syntax breaks older parsers — not just older fields.** The additive-and-optional rule
protects field-level compat, but adding new `.bru` *syntax* (a new escape form, block delimiter,
or annotation grammar) makes files written by the new version fail to *parse* in older versions,
which have no handling for it. This is a forward-compat break beyond field loss; it needs an
explicit decision and a compatibility path before shipping.

**Descriptions are string-only internally.** Every inline `description` field (headers, params,
assertions, variables, body entries, ...) is stored as a plain `string`. On the **yml** side,
parsers accept a bare string *or* a legacy `{ content }` object on read and normalize to the
string (`formats/yml/common/{headers,variables,assertions,actions}.ts`, `parseEnvironment.ts`,
`body.ts`); writers emit a bare string. This read-accepts-object / write-emits-string asymmetry is
an established convention — not a lossy round-trip — proven by `formats/yml/common/variables.spec.ts`.
The `.bru` side has no `{ content }` handling; it stores descriptions as annotation/textblock
strings straight from the grammar. New inline description-like fields should follow this
string-only shape.

*Exception — `docs` is not string-only.* Collection/folder documentation (`docs`) is written by
the **yml** layer as an **object** `{ content, type: 'text/markdown' }`
(`formats/yml/stringifyCollection.ts`, `stringifyFolder.ts`) and normalized back to a string on
read; the `.bru` side writes it as a plain textblock. So "follow the string-only shape" applies to
inline `description`, *not* to `docs`-style documentation fields — check which family a new field
belongs to before copying either pattern.

**Keep both formats in lockstep.** Any field added or changed must be handled in *both*
`bru` and `yml` — parse and stringify on each side — or the same collection behaves
differently depending on its format. There is **no dedicated `bru`↔`yml` converter**: a request
moves between formats by being parsed in its source format to the shared in-memory object and
re-stringified in the target format (see `SaveTransientRequest` passing `sourceFormat` +
`targetFormat` to `renderer:save-transient-request`). So a field handled in only one format is
**silently dropped** the moment a request is copied/saved from a `.bru` collection into a `.yml`
one (or vice-versa). Pay attention to the *unset* case: a field that defaults or persists one way
in `.bru` and another in `.yml` (e.g. one path returns `''`, the other `'1'`) is a divergence bug.
The default app-data workspace and custom-filesystem workspaces are a second such twin — a value
that persists in one but is silently dropped in the other is the same class of bug. Update every
layer the field touches: `bruno-schema-types` (types), `bruno-schema` (Yup validation),
`bruno-filestore` (both formats), `bruno-converters` (import/export), and the grammar in
`bruno-lang` **v2** if `.bru` syntax itself changes.

**`bruno-schema` (Yup) is not optional — it will reject your field.** The collection/request/
environment Yup schemas are declared `.noUnknown(true).strict()`, and they are validated on the
**save path** (e.g. `itemSchema.validate` / `environmentSchema.validateSync` in
`bruno-app`'s `slices/collections/actions.js` and `bruno-electron`'s `store/global-environments.js`).
A new serialized field that round-trips through filestore but is **not** added to
`packages/bruno-schema` will throw a validation error on save. `bruno-schema` (runtime Yup) and
`bruno-schema-types` (TS types) are distinct and both must be updated.

**When a shape must change, migrate on read — never make users edit files.** Add a
read-time compatibility shim that upgrades the old shape as it is parsed, following the
existing patterns: `ensureAuthV3Rc1BackwardsCompatibility` in `formats/yml/parseItem.ts`,
and the pre-v3 status/statusText swap in `formats/bru/index.ts`. Gate any eventual removal
behind a major version bump and leave a dated `TODO(remove after vN)`.

**Design for scale and consistency.** New keys follow the naming and nesting of the existing
`meta`/section blocks (`meta.name`, `meta.seq`, `meta.type`, `meta.tags`, ...). Prefer
structures that extend cleanly — a keyed list over a positional one, an object over a
widening union — and match how neighbouring fields are already modelled. Note the on-disk
`meta {}` block does **not** map 1:1 to the type: in `bruno-schema-types` those keys are flattened
onto `Item` (`seq`, `name`, `type`, `tags`, `description` directly on the item), and the v2 ohm
grammar treats `meta` as an open dictionary — the four names above are the *modeled* ones, not a
closed set.

**Name properties like they're permanent — because they are.** A DSL key is written once and
effectively forever: renaming it breaks every existing file and forces a compat shim. These
names are also user-facing — people read and hand-edit `.bru`/`.yml` — and are read by AI
agents reasoning over collections. Choose clear, descriptive, fully spelled-out names, with
no cryptic abbreviations or ambiguity, consistent with existing keys, and get it right the
first time. A property name deserves stricter scrutiny than an ordinary variable.

**Test the contract.** Add round-trip tests (parse → stringify → parse) for the new field in
*both* formats, plus a golden fixture of the *old* format that must still parse unchanged. The
paired `parseItem.spec.ts` / `stringifyItem.spec.ts` (and `parse*`/`stringify*` for collection,
folder, environment) next to each serializer in `bruno-filestore/src/formats/yml` are the pattern;
`common/variables.spec.ts` and `common/datatype.spec.ts` show field-level cases.

## A new persisted field — the files it usually touches

Adding a single field tends to span several packages (a `.bru`-centric change lands mostly in
`bruno-lang/v2`):

- `bruno-lang/v2/src` — the `.bru` entry points: `bruToJson.js`, `collectionBruToJson.js`,
  `envToJson.js`, `jsonToBru.js`, `jsonToCollectionBru.js`, `jsonToEnv.js`, plus `utils.js` for
  shared helpers.
- `bruno-filestore/src/formats/yml` — parse **and** stringify for the `.yml` side.
- `bruno-schema/src/collections/index.js` — the Yup schema (skip this and it fails on save).
- `bruno-schema-types/src/collection/item.ts` — the TypeScript type.
- `bruno-converters`, and the collection utils in `bruno-electron` / `bruno-app` that build the object.
- Round-trip specs next to the serializers (`formats/yml/parseItem.spec.ts` + `stringifyItem.spec.ts`).

Find a comparable field already in the code and follow how it's wired before adding yours.

## Before changing the DSL — checklist

- [ ] Change is genuinely necessary (can't be solved in memory / UI)
- [ ] New field is optional with a safe default; nothing renamed, removed, or retyped
- [ ] Handled in both `bru` and `yml`, parse **and** stringify
- [ ] Types (`bruno-schema-types`), Yup schema (`bruno-schema`), and converters updated
- [ ] Old files still parse — read-time compat shim added if the shape changed
- [ ] No new `.bru` syntax that older parsers can't read (or a forward-compat path decided)
- [ ] Any new escaping proven via on-disk reparse + fuzz, escaping single chars not the delimiter
- [ ] `bru`/`yml` (and default vs custom workspace) behave identically, including the unset case
- [ ] Round-trip + old-format fixture tests added
- [ ] Naming/structure consistent with existing blocks and scalable
