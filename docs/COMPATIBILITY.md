# Compatibility record

## Version 0.6.0 — 2026-11-18

The final packaged XPI was installed in fresh isolated Windows profiles, reusing only synthetic test databases. No normal user profile or library was used.

| Runtime | Suite | UI checks | Result |
| --- | --- | ---: | --- |
| Zotero 6.0.36 | Legacy settings window | 7 | PASS |
| Zotero 7.0.32 | Settings, real PDFs and reading workspace | 25 | PASS |
| Zotero 10.0.8 | Settings, real PDFs and reading workspace | 25 | PASS |

The modern UI suite covers the native preferences pane, all seven settings, saving two real PDF tabs, closing all tabs without overwriting the snapshot, recreating a removed group on reopen, disabling automatic memory, restoring while memory is disabled, saved colors/remarks/order/folding, duplicate avoidance, persisted preferences, revealing the selected paper after moving it to a distant group amid 35 extra tabs, and shutdown cleanup.

The legacy UI suite covers the real settings window, its seven controls, preference persistence, workspace button availability and cleanup. **Full PDF reopening/restoration on Zotero 6 is not recorded as a runtime pass:** its renderer waited indefinitely in the hidden test window. An additional visible desktop check is still needed. The shared Firefox 60 implementation passes `node tests/features.cjs`, including closed-paper memory, missing group recreation, workspace restoration, duplicate avoidance, order and missing-item handling. Both source generations also pass the existing 24 layout/state assertions.

Reports: `tests/results/v0.6.0/`. Final XPI SHA256: `5a8bad51e320de39ca2fbc9255c89e6a2920cd309c2bc4cc3e0ebdac66c7adc6`.

Zotero 8/9 were not rerun for this version; earlier results remain below. macOS and Linux remain untested on a running desktop. Zotero 10.0.1 itself has not been runtime-tested.

## Version 0.5.2 — 2026-11-18

The runtime-verified XPI was tested on Windows in new isolated profiles, reusing only the synthetic test databases created during this run to avoid reinstalling bundled translators. No normal user profile or library was used. The test harness is now packaged as an XPI instead of relying on an extension-directory pointer.

| Runtime | XPI / UI checks | Result |
| --- | ---: | --- |
| Zotero 6.0.36 | 42 | PASS |
| Zotero 7.0.32 | 46 | PASS |
| Zotero 10.0.8 | 46 | PASS |

All three passed original-library-tab visibility at 960, 1280 and 1920px, selecting an offscreen paper, returning to the library through native mouse events, fixed toolbar geometry, default group ordering, stable heading width, and restoration of the native tab bar after disabling the plugin. The existing checks for remarks, colors, search, group closing and persistence also passed.

`node tests/layout.cjs` passes 12 assertions for each of the modern and Firefox 60 sources (24 total), including migration of old ungrouped-first settings, retention of assignments/remarks/colors/folding, persistence of subsequent manual reordering, insertion of new groups before ungrouped across restart, and name-based width limits.

Reports: `tests/results/v0.5.2/`. XPI SHA256: `c84d9fd51bde94bf85e1fb908c4e284ea4f0c74c013fbebb284e5305a2837ec4`. Packaged text uses LF newlines to produce the same archive on Windows and Linux.

The 134 successful runtime checks used the pre-normalization package (`115c4f0c5e56d112ddf51488619c53964d3b28505a5007f1ce6473feb71e2919`). All 14 archive members were compared against the published package: icons are byte-identical, and text differs only in CRLF/LF newlines. Both hashes are retained in the summary. Additional hidden-window reruns had intermittent native-popup failures; native popup tests depend on window focus and should be run one instance at a time. These reruns do not replace the successful reports above.

The reported Zotero 10.0.1 native tab component was reviewed at its official source tag. Its official installer URL returned an installer whose internal application version is 10.0.8, so 10.0.1 itself is **not** recorded as a runtime pass. Zotero 8/9 were not rerun for this version; their previous-version results are below. macOS and Linux remain untested on a running desktop.

## Previous validation: version 0.5.1

Test date: 2026-11-17. Host: Windows. Plugin: 0.5.1.

Each isolated run loaded the actual release XPI into a fresh profile with a separate data directory and synthetic PDF fixtures. It verified installation and bootstrap, enable/disable cleanup, group rendering, ungrouped color, folding, ordering, bulk labels, notes, search matching, result geometry, native context-menu extension, saved settings, actual group closing, preserved group assignment, document reveal and the visible suggestions control.

| Runtime | XPI checks | Result |
| --- | ---: | --- |
| Zotero 6.0.36 / Firefox 60 | 34 | PASS |
| Zotero 7.0.32 / Firefox 115 | 38 | PASS |
| Zotero 8.0.4 / Firefox 140 | 38 | PASS |
| Zotero 9.0.6 / Firefox 140 | 38 | PASS |
| Zotero 10.0.8 / Firefox 140 | 38 | PASS |

The existing Zotero 7.0.32 session also passed 130 regression checks of the final shared source, including drag insertion decisions, hover expansion, saved fold state, color menus, group display inheritance, remark search and long-result layout. Those checks restored the previous preferences, selected tab, tab order and installed plugin. Actual close operations used fixtures in the isolated profiles.

The JSON summaries in `tests/results/` contain check names and results only. The release SHA256 is recorded in `dist/SHA256SUMS` and `tests/results/summary.json`.

## Tab overflow regression

Version 0.5.0 failed the native-dropdown visibility check with 60 extra tabs at 960px. Version 0.5.1 passes at 960px, 1280px and 1920px, with the actual XPI on all five runtimes. Checks cover toolbar bounds, internal horizontal scrolling, wheel movement, first/last tab selection, search results and opening the native dropdown where available. Zotero 6 lacks the newer native dropdown, so its run has four fewer checks.

## Scope and limits

- The declared range is Zotero 6.0 through 10.0.x. Individual patch versions outside the table have not all been executed.
- Zotero 10.0.9 is a macOS-only patch according to the [official changelog](https://www.zotero.org/support/changelog). The current Windows release tested here is 10.0.8.
- macOS and Linux have not been tested on a running desktop. They require a release smoke test, especially toolbar spacing, context menus, color swatches and physical drag-and-drop.
- Automated DOM and event tests do not replace a manual visual check under every theme and display scale.
- The plugin uses internal tab APIs. A future Zotero major version must be checked before raising the compatibility maximum.

## Compatibility implementation

`install.rdf` supports Zotero 6; `manifest.json` supports Zotero 7–10. The shared loader waits for the legacy main window without prematurely creating the Zotero service. Zotero 6 uses the generated `core-legacy.js`; newer versions use `core.js`.

The update JSON supplies both `applications.gecko` (Firefox 60.9) and `applications.zotero` (6.999–10.0.x), following the [official migration guide](https://www.zotero.org/support/dev/zotero_7_for_developers#updaterdf_updatesjson).
