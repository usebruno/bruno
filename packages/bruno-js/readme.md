# bruno-js

Provides the script, test, vars and assert runtimes.

### Publish to Npm Registry
```bash
npm publish --access=public
```

## Script API JSDoc

The JSDoc on the classes scripts can reach (`bru`, `req`, `res`, the header, cookie and gRPC
lists) is the single source of the script API reference and of the editor's autocomplete and
hover docs. Its readers are people writing pre-request, post-response, test and gRPC hook
scripts, not contributors: describe what a script sees and can do, not how the class works.

### What every public member needs

- **A one-line summary**, then an optional longer description after a blank line. The summary is
  the text shown in the autocomplete dropdown; the description appears on hover and in the docs.
- **Typed tags:** `@param {type} name - text` and `@returns {type} text`. Types come only from
  these tags (the files are not type-checked), so an untyped `@param` documents an `any`.
- **`@category`**, which groups members in the docs, for example `Environment`, `Runtime variables`,
  `Cookies`, `Runner`, `Headers`, `Body`. Lists use `Read`, `Search`, `Iteration`, `Transform`
  and `Write`.
- **`@example`** on the main methods, written as script code (`bru.setEnvVar('token', t);`).

A member without a summary is left out of the reference and the autocomplete, and the generator
lists it in a warning. A member without a `@category` is kept, under its type's default section.
A global also needs `@context`; without it, the global is left out the same way.

### Hiding members

- **`@internal`** on anything scripts must not call: host-facing state (`envVariables`,
  `scriptedRequestEntries`, the dirty flags) and helpers such as `__safeParseJSON`.
- **`@protected`** on the `_`-prefixed hooks subclasses share (`_getItems`, `_assertWritable`).
  `#private` members never surface.

### Custom tags

| Tag | Meaning |
|---|---|
| `@runtime nodevm` | The member exists only in Developer Mode; the QuickJS shims in `src/sandbox/quickjs/shims/` (Safe Mode) don't expose it. |
| `@context <name…>` | The member exists only in these script contexts: `pre-request`, `post-response`, `tests`, `grpc:before-call-start`, `grpc:before-message-send`, `grpc:after-message-receive`, `grpc:after-call-end`. A member without it is available wherever its parent is. |

### Patterns

- **Members assigned outside the class body** (`runRequest`, `getTestResults`, `grpc`): declare
  them in the constructor without a value, so the declaration documents them and nothing changes
  at runtime:
  ```js
  /**
   * Runs another request of the collection and resolves with its response.
   * @type {(requestPathName: string) => Promise<object>}
   * @category Requests
   */
  this.runRequest;
  ```
  Runtime flags set from method bodies (`this.nextRequest = …`) are declared the same way, with
  `/** @internal @type {…} */`.
- **Helper objects built in the constructor** (`runner`, `utils`, the cookie jar): describe them
  with a `@typedef {object}` and one `@property` per function. Each property's text is its summary.
- **Read-only views:** a list that is read-only in some place (`res.headerList`) is typed with an
  `@typedef {Omit<HeaderList, 'add' | …>}` that drops the write methods. The kept members keep
  their docs.
- **Generic list bases:** `ReadOnlyPropertyList` is `@template T`, and each list names its item
  shape with `@extends {ReadOnlyPropertyList<Header>}`, so inherited methods document
  `all(): Header[]` rather than `object[]`. Write base-class docs so they read correctly for every
  list ("the entry with the given key", not "the header").
- **Optional trailing arguments behind a rest parameter** (`reduce(fn, ...rest)`): give the method
  a `@type {(fn: …, initialValue?: *, context?: *) => *}` and describe the parameters with
  untyped `@param name - text` lines. JSDoc `@overload` loses the optional markers.

### Regenerating

`npm run generate:script-api` (from the repo root) reads the JSDoc, starting from the globals in
`types/globals.d.ts`, and writes two files:

- `types/script-api.d.ts`, the API reference's input. It is committed: run the generator after
  changing the script API's JSDoc, and CI fails when it is stale.
- `bruno-app/src/utils/codemirror/generated/script-api-manifest.json`, the editor's autocomplete
  and hover data. It is not committed: CI and `npm run setup` generate it before bruno-app is
  built. Without it the app still builds, and script editors offer no API hints or docs.

The run fails on a misspelled `@context` or `@runtime` value, a public `_`-prefixed member
that is documented but not marked `@internal` or `@protected`, an unresolved type name, or a type
from outside bruno-js that the API exposes.

`npm run docs:script-api` builds the HTML API reference from `types/script-api.d.ts` into
`docs-dist/script-api/` with TypeDoc (`typedoc.json`). `scripts/typedoc-script-api-plugin.mjs`
turns the `@context` and `@runtime` tags into sentences for the reader.
