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

Run `node tests/features.cjs` for settings validation, closed-paper memory, group recreation, workspace persistence, restoration order, duplicate avoidance and missing-item handling. Run `python tests/package.py` to verify package integrity, Zotero 7–10 install/update targets and the absence of retired runtime files.

The state suite also covers optional dissolution after group-close, including failed closes, other windows retaining members, reopening with/without group memory and unchanged saved workspaces. The packaged group suite verifies that toggle through its settings checkbox and uses `nsIDOMWindowUtils.sendMouseEvent` for toolbar popup open/close and mutual-exclusion checks; these are trusted synthesized events, not physical mouse input.

Use `--suite settings` with `prepare-profile.py` to test the native Zotero settings pane, real PDF fixtures, saving/closing/reopening/restoring a workspace and revealing an assigned paper. Wait for `uiReadyPromise` before creating fixtures to avoid racing the native library tree.

Use `--suite groups` to test the real native group popup with distinct fixture attachments opened as unloaded tabs. It checks the seven/eight boundary, horizontal display after pointer/keyboard selection, stable popup rows, numbered multi-column geometry, scrolling, group-count switching, focus colors, vertical insertion decisions, a single tab-bar row, settings persistence, icons and immediate display overrides. This suite does not claim PDF rendering or a physical mouse drag. Native popups require focus; run desktop instances one at a time and test preferences after popup checks to avoid a hidden-window focus transition.

The test-only bootstrap removes remote repository `<message>` notices from update responses in these disposable profiles, retaining the update data. Older Zotero versions can otherwise open an unrelated Word-integration notice that steals focus or blocks window timers. The group suite uses an XPCOM timer to avoid background-window throttling. Neither change is shipped in the production plugin.

Use `--suite workspace` for the 20-document recovery regression. It loads a real PDF before saving, closes all 20 tabs, restores, verifies the active PDF, then selects and parses every other saved PDF. It also checks repeated restoration, existing/newer papers, recreated groups, unchanged snapshots, missing-file handling and the actual failure-details UI. Native timer waits and isolated synthetic data are used throughout.

`compat-harness.js` is packaged directly as `run.js` in the isolated harness. It has no generated copy or transpiler dependency. Current tests target Zotero 7–10; older reports remain as historical records.

`integration.js` contains the broader Zotero 7 regression suite. It is intended for an existing development session with at least two distinct open attachment tabs. Its `runInlineTests(Zotero, Services, coreURL, env)` helper temporarily loads the shared core and restores preferences, selection, tab order and the original installed plugin in `finally`. Pass the URL of `src/core.js` as `coreURL`. The optional `env` supports a host-provided undo hook. It is not shipped in the XPI.

Before a release, also manually check physical drag-and-drop, all color swatches, the rightmost toolbar controls and long search results at normal and enlarged display scaling on each supported OS.
