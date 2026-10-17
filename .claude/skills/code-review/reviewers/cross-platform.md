# Cross-platform reviewer

**Scope:** all changed files (`**/*`).

Adopt the reviewer persona and return findings in the output contract defined in
`_contract.md`.

Review the diff against **`.claude/rules/cross-platform.md`** (read it) — Bruno ships on macOS,
Windows, and Linux. Report each violation with `file:line`, severity:

- **blocker** — anything that breaks a platform: hardcoded `/` or `\` separators instead of
  `path.join`/`path.resolve`; hardcoded paths (`/home/`, `C:\Users\`, `~/`) instead of
  `os.homedir()`/`app.getPath()`; platform-specific shell/`child_process` without a fallback
  (`which` vs `where`, `spawn` needing `shell:true` on Windows); Unix-only signals; `/tmp`
  instead of `os.tmpdir()`.
- **suggestion** — portable-but-fragile patterns not yet a concrete break: case-sensitivity
  assumptions, inconsistent CRLF/LF handling, `fs.chmod`/`fs.access` assuming Unix permission bits.
- **suggestion** — multiline `.bru`/text-block parsing that splits on `\n` instead of a
  CRLF-aware regex (`/\r\n|\r|\n/`) — see the rule's Line Endings section.
