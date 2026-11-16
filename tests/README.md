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

The overflow suite opens 60 extra fixture tabs and constrains the tab row to 960, 1280 and 1920 pixels. It verifies fixed toolbar controls and selection of offscreen tabs.

The resulting report contains 34 checks on Zotero 6 and 38 on Zotero 7–10. Repeat with a fresh profile for each major version. Successful runtime checks include an actual group-close operation on fixture attachments, native context menus, search result geometry, persisted preferences and enable/disable cleanup.

`compat-harness.js` is the source; `harness/run-legacy.js` is generated for Firefox 60 by `scripts/build-legacy.cjs` alongside the production legacy module.

`integration.js` contains the broader Zotero 7 regression suite. It is intended for an existing development session with at least two distinct open attachment tabs. Its `runInlineTests(Zotero, Services, coreURL, env)` helper temporarily loads the shared core and restores preferences, selection, tab order and the original installed plugin in `finally`. Pass the URL of `src/core.js` as `coreURL`. The optional `env` supports a host-provided undo hook. It is not shipped in the XPI.

Before a release, also manually check physical drag-and-drop, all color swatches, the rightmost toolbar controls and long search results at normal and enlarged display scaling on each supported OS.
