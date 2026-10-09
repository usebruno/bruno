## What's New in Bruno v4.2.1

This update includes two improvements to how scripts run in Bruno.

### Security Improvements

* **Symlinks in Safe Mode.** Scripts running in Safe Mode can no longer follow a symlink to reach files outside the collection folder.
* **Stricter script isolation.** Scripts can no longer reach Bruno's internal module loader.

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
