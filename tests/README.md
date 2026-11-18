# Runtime tests

Use a **new, disposable profile** for each run. The harness creates synthetic attachment records and closes test tabs. It quits that Zotero process when finished. Never install the test harness in your normal profile.

Prepare a new isolated profile after building the XPI:

```sh
python scripts/build.py
python tests/prepare-profile.py --profile /absolute/path/to/new-test-profile --report /absolute/path/to/report.json
```

Launch the Zotero version to test with these arguments:

```text
-no-remote -profile /absolute/path/to/new-test-profile -purgecaches -ZoteroDebugText
```

Keep the profile and its data directory separate from your normal library. The preparation script refuses an existing profile, disables automatic sync and updates in that profile, and skips automatic Word/LibreOffice integration installation.

The overflow suite opens 60 extra fixture tabs and constrains the tab row to 960, 1280 and 1920 pixels. It verifies fixed toolbar controls, the original library tab, returning from a reader to the library, and selection of offscreen tabs.

The report includes checks for default group order, stable heading width, and restoration of the native library tab on cleanup. Repeat with a fresh profile for each version tested. Successful runtime checks include an actual group-close operation on fixture attachments, native context menus, search result geometry, persisted preferences and enable/disable cleanup.

Run `node tests/layout.cjs` to check old-state migration, preservation of user data, saved manual ordering, insertion of new groups before ungrouped, and name-based heading widths against both generated and modern sources.

Run `node tests/features.cjs` for modern and Firefox 60 settings validation, closed-paper memory, group recreation, workspace persistence, restoration order, duplicate avoidance and missing-item handling.

Use `--suite settings` with `prepare-profile.py` to test the packaged settings UI. On Zotero 7 and later, this opens real PDF fixtures and verifies saving, closing, reopening and restoring a workspace, plus revealing an assigned paper in an overflowing tab strip. Wait for `uiReadyPromise` before creating fixtures to avoid racing the native library tree. On Zotero 6, this suite checks the real legacy settings window only: its PDF renderer can wait indefinitely in a hidden test window, so full PDF restoration there requires an additional visible desktop check. Reports identify this subset as `legacy-settings-only`.

`compat-harness.js` is the source; `harness/run-legacy.js` is generated for Firefox 60 by `scripts/build-legacy.cjs` alongside the production legacy module.

`integration.js` contains the broader Zotero 7 regression suite. It is intended for an existing development session with at least two distinct open attachment tabs. Its `runInlineTests(Zotero, Services, coreURL, env)` helper temporarily loads the shared core and restores preferences, selection, tab order and the original installed plugin in `finally`. Pass the URL of `src/core.js` as `coreURL`. The optional `env` supports a host-provided undo hook. It is not shipped in the XPI.

Before a release, also manually check physical drag-and-drop, all color swatches, the rightmost toolbar controls and long search results at normal and enlarged display scaling on each supported OS.
