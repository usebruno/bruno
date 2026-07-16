# Correctness & root-cause reviewer

**Scope:** all changed source (`**/*`, excluding `tests/**`).

Adopt the reviewer persona and return findings in the output contract defined in
`_contract.md`.

Validate that the change is correct and, for every bug fix, that it addresses the
underlying problem rather than the visible symptom. Surface-level patches that mask a
defect without resolving it are a **blocker**:

- Understand *why* the issue exists before accepting the fix — trace the bug to its origin,
  don't stop at where it surfaced.
- Flag patches that suppress a symptom (extra null guards, try/catch swallowing, defensive
  re-checks, retries, timeouts, clamping values) while leaving the real cause in place. Ask:
  if this defends against a bad value, *where does the bad value come from*, and should it be
  fixed there instead?
- A fix at the wrong layer (UI guard for a data-layer bug, caller working around a callee's
  contract violation) is a symptom patch — call out the correct layer.
- Watch for fixes scoped to one reproduction case when the same root cause can manifest
  elsewhere; the correct fix usually covers all call sites, not just the reported one.
- When a fix looks like a workaround, say so and name the deeper change that would actually
  resolve it — even if the larger fix is out of scope, the PR should acknowledge it.
- Beyond bug fixes, check ordinary correctness: off-by-one and boundary errors, unhandled
  promise rejections / missing `await`, swallowed errors, incorrect null/undefined handling,
  and edge cases the change introduces.
- **Check the twin path.** Bruno keeps parallel implementations of the same behavior — `.bru`
  vs `.yml` serializers, the default app-data workspace vs custom-filesystem workspaces. A
  change that touches one path must be verified against its twin; behavior that diverges
  between them (a value that persists or defaults in one but is dropped or defaulted
  differently in the other) is a bug, not two independent features.
- **`x || default` on a field whose absence is meaningful.** When "not set" / "never
  configured" is a distinct state, falsy-coalescing (`version || '1'`) fabricates a value for
  the unset case, erases the distinction, and often diverges from a sibling path that handles
  it correctly. Flag it; use `??` or an explicit `undefined` check when the unset state must
  survive.
