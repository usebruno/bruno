# Bruno Coding Standards

- No diffs unless an actual change is made, the code changes need to be as minimal as possible, avoid making un-necessary whitespace diffs. This is already handled by eslint but make sure you check your code changes before commiting and raising a PR.

## General Style Rules

- Use 2 spaces for indentation. No tabs, just spaces – keeps everything neat and uniform.

- Stick to single quotes for strings. For JSX/TSX attributes, use double quotes (e.g., <svg xmlns="..." viewBox="...">) to follow React conventions.

- Always add semicolons at the end of statements. It's like putting a period at the end of a sentence – clarity matters.

- JSX is enabled, so feel free to use it where it makes sense.

## Punctuation and Spacing

- No trailing commas. Keep it clean, no extra commas hanging around.

- Always use parentheses around parameters in arrow functions. Even for single params – consistency is key.

- For multiline constructs, put opening braces on the same line, and ensure consistency. Minimum 2 elements for multiline.

- No newlines inside function parentheses. Keep 'em tight.

- Space before and after the arrow in arrow functions. `() => {}` is good.

- No space between function name and parentheses. `func()` not `func ()`.

- Semicolons go at the end of the line, not on a new line.

- No strict max length – write readable code, not cramped lines.

- Multiple expressions per line in JSX are fine – flexibility is nice.

Remember, these rules are here to make our codebase harmonious. If something doesn't fit perfectly, let's chat about it. Happy coding! 🚀


## Tests 

- Add tests for any new functionality or meaningful changes. If code is added, removed, or significantly modified, corresponding tests should be updated or created.
 
- Prioritise high-value tests over maximum coverage. Focus on testing behaviour that is critical, complex, or likely to break—don’t chase coverage numbers for their own sake.

- Write behaviour-driven tests, not implementation-driven ones. Tests should validate real expected output and observable behaviour, not internal details or mocked-out logic unless absolutely necessary.

- Minimise mocking unless it meaningfully increases clarity or isolates external dependencies. Prefer real flows where practical; only mock external services, slow systems, or non-deterministic behaviour.

- Keep tests readable and maintainable. Optimise for clarity over cleverness. Name tests descriptively, keep setup minimal, and avoid unnecessary abstraction.

- Aim for tests that fail usefully. When a test fails, it should clearly indicate what behaviour broke and why.

- Cover both the “happy path” and the realistically problematic paths. Validate expected success behaviour, but also validate error handling, edge cases, and degraded-mode behaviour when appropriate.

- Ensure tests are deterministic and reproducible. No randomness, timing dependencies, or environment-specific assumptions without explicit control.

- Avoid overfitting tests to current behaviour if future flexibility matters. Only assert what needs to be true, not incidental details.

- Use consistent patterns and helper utilities where they improve clarity. Prefer shared test utilities over copy-pasted setup code, but only when it actually reduces complexity.

- Tests should be fast enough to run continuously. Avoid long-running operations unless absolutely necessary; prefer lightweight fixtures and isolated units.

### E2E Tests 

When reviewing Electron-specific Playwright tests, treat `<project-root>/tests/**` as the canonical location for specs, typically matching `<project-root>/tests/**/*.spec.{ts,js}`. For broader Playwright workflow guidance, also refer to `docs/playwright-testing-guide.md`.

Goal: rewrite or critique the tests so they are genuinely behavioural, maintainable, and safely parallelizable.

Rules:
1. Tests must verify user-visible behaviour, not implementation details.
   - Prefer assertions on UI state, persisted data, windows, dialogs, filesystem effects, and app-level outcomes.
   - Avoid hardcoded waits, brittle selectors, fake internal state checks, and “click then expect mock called” tests unless the user behaviour is the point.

2. Tests must be Electron-aware.
   - Use Electron app launch patterns correctly.
   - Handle main window, secondary windows, dialogs, menus, native prompts, clipboard, file pickers, and IPC-driven UI behaviour through observable outcomes.
   - Do not reach into app internals unless absolutely necessary for setup or controlled test fixtures.

3. Tests must be parallel-safe.
   - No shared user data directories.
   - No shared ports, files, DBs, caches, clipboard assumptions, or global app state.
   - Each test gets isolated temp paths, unique workspace/project names, and deterministic cleanup.
   - Avoid test ordering assumptions.

4. No hardcoded mess.
   - Replace magic timeouts with event-driven waits.
   - Replace brittle text/index selectors with role, label, test id, or stable user-facing selectors.
   - Replace duplicated setup with fixtures.
   - Replace hardcoded absolute paths with temp dirs.
   - Replace random sleeps with waiting for actual app signals.

5. Every test should follow this shape:
   - Arrange: create isolated fixture state.
   - Act: perform real user actions.
   - Assert: verify observable behavioural outcome.
   - Cleanup: remove isolated resources.

For each test file:
- Identify behavioural vs non-behavioural tests.
- Flag brittle selectors, hardcoded waits, shared state, serial dependencies, and fake assertions.
- Rewrite the tests using Playwright best practices for Electron.
- Make them parallel-ready.
- Explain briefly why each rewrite is better.

## UI Specific instructions 

### React

- Use styled component's theme prop to manage CSS colors and not CSS variables when in the context of a styled component or any react component using the styled component 
- Styled Components are used as wrappers to define both self and children components style, tailwind classes are used specifically for layout based styles. 
- Styled Component CSS might also change layout but tailwind classes shouldn't define colors.
- MUST: Prefer custom hooks for business logic, data fetching, and side-effects.
- MUST: Avoid `useEffect` unless absolutely needed. Prefer derived state, event handlers.
- SHOULD: Memoize only when necessary (`useMemo`/`useCallback`), and prefer moving logic into hooks first.
- MUST: Do not use namespace access for hooks in app code (e.g., `React.useCallback`, `React.useMemo`, `React.useState`). Import hooks directly.
  - Correct: `import { useCallback, useMemo, useState } from "react";`
  - Avoid: `import * as React from "react";` then `React.useCallback(...)`
- Add `data-testid` to testable elements for Playwright
- Co-locate utilities that are truly component-specific next to the component, otherwise place shared items under a common folder
- Avoid mixed controlled and uncontrolled state in React components. A component is either controlled or uncontrolled. State needs a single source of truth instead of being computed by props and then recomputed internally.
- SHOULD: Use derived state variables instead of adding unneeded `React.useState` / `useState` hooks.


## Readability and Abstractions

- Avoid abstractions unless the exact same code is being used in more than 3 places.
- Names for functions need to be concise and descriptive.
- Add in JSDoc comments to add more details to the abstractions if needed.
- Follow functional programming but just enough to be readable, we don't need to go as deep as ADTs and Monads, we want to keep the code pipeline obvious and easy for everyone to read and contribute to.
- Avoid single line abstractions where all that's being done is increasing the call stack with one additional function.
- Add in meaningful comments instead of obvious ones where complex code flow is explained properly.
