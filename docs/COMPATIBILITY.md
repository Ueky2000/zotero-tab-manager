# Compatibility record

## Version 0.6.3 — 2026-11-18

The packaged group suite uses isolated synthetic attachment libraries to verify numbered single/two/three-column popups, bounded scrolling, active horizontal tabs after mouse and keyboard selection, stable list nodes, group-count thresholds, display overrides, settings labels/icons and cleanup. Zotero 6 additionally exercises the actual add-on manager preferences command. It does not claim physical drag-and-drop, PDF rendering coverage for this release, or tests on macOS/Linux. The shared state/workspace regressions pass for both modern and Firefox 60 sources; the 0.6.2 real-PDF recovery record remains below.

Zotero 6 needs a separate block scroller around its grid to respect the native popup height limit. Popup rows are reconciled by tab ID so asynchronous title changes do not replace a focused/pressed row. Its add-on manager options command routes only this plugin's settings URL to the existing settings window, with the original function restored on shutdown.

Final reports are recorded in `tests/results/v0.6.3/` with the installation-package SHA-256.

| Runtime | Checks | Result |
| --- | ---: | --- |
| Zotero 6.0.36 | 35 | PASS |
| Zotero 7.0.32 | 34 | PASS |
| Zotero 10.0.8 | 34 | PASS |

## Version 0.6.2 — 2026-11-18

The published 0.6.1 XPI failed a new 20-document Zotero 7 regression: it returned `opened: 20` and no failures, but did not pass the complete distinct-tab check. This reproduces unreliable recovery/counting; it is not a claim to reproduce the user's exact 18-error count. The baseline failure is retained in `tests/results/v0.6.2/0.6.1-baseline-7.json`.

The fix follows native session recovery: validate/load item metadata, create unloaded tabs synchronously, verify each document's actual tab, and let native selection load the active PDF. It avoids creating every live reader through `Reader.open()` and treats unavailable files as explicit per-paper errors.

| Final runtime | Coverage | Checks | Result |
| --- | --- | ---: | --- |
| Zotero 7.0.32 | All 20 restored PDFs actually loaded | 32 | PASS |
| Zotero 10.0.8 | All 20 restored PDFs actually loaded | 32 | PASS |
| Zotero 6.0.36 | Native 20-tab restoration and error UI | 11 | PASS |

The modern runs open and parse an actual one-page PDF, save 20 distinct attachments in two groups, close all tabs, restore all 20, verify groups/remarks/folding, load the restored active PDF, restore again without duplication, and then select/load every other restored PDF. They also preserve an existing saved paper plus an unrelated newer paper, recreate both removed groups, verify that the snapshot remains unchanged, and test an intentionally unavailable attachment with the actual failure-details settings UI.

Zotero 6 runs the native-tab and error-handling subset without claiming PDF rendering. Synthetic files/libraries and fresh isolated profiles were used; only synthetic databases were reused. The earlier failed baseline and the final passing reports are retained. Test-only suppression of unrelated remote notices remains enabled.

Modern and Firefox 60 feature tests now cover 20-tab restoration without calling live-reader creation, actual tab-count verification, false-success rejection, missing files, missing items and metadata-loading compatibility. Both generations also pass all 24 layout/state assertions.

Final XPI SHA256: `5642540ddc0a6a8380810b3cc5f461038358f5e98394d8a4acd4dd9b57675ac0`. Reports: `tests/results/v0.6.2/`. Zotero 8/9 and macOS/Linux desktops were not rerun for this release.

## Version 0.6.1 — 2026-11-18

The final XPI passed 15 focused UI checks on each of Zotero 6.0.36, 7.0.32 and 10.0.8 (45 total), using isolated Windows profiles and synthetic libraries.

These checks use eight distinct real attachment records opened as unloaded tabs. They verify the default threshold of seven, vertical list geometry, a single tab-bar row, preserved right-click/drag handlers, mouse focus without an outline, keyboard focus in the group color, vertical insertion decisions, closing from eight to seven papers, threshold changes and persistence, repeated open/close, all eight compact settings controls, editing the threshold from the actual settings UI, and cleanup.

The test-only harness strips remote repository message notices while retaining update data, so an unrelated native Word-integration upgrade dialog cannot take focus. It also uses a native timer to avoid background-window throttling. These changes are not shipped in the production plugin. Earlier hidden-window attempts encountered native dialogs, focus loss and reader waits; they are not counted as final passes.

An earlier candidate's failed full-PDF missing-group reopen report is retained as `7.0.32-first-attempt.json`, with that candidate's hash in the summary. The subsequent late-item-identifier fix is covered by modern and Firefox 60 feature tests. Both generations also pass the 24 layout/state assertions.

**Limits:** the final focused suite does not verify PDF rendering, a physical mouse drag, or full reading-workspace restoration. Previous full workspace validation is recorded under 0.6.0 below. Zotero 8/9 were not rerun for this version; macOS/Linux desktop rendering remains untested.

Reports: `tests/results/v0.6.1/`. Final XPI SHA256: `a864ff342439092696a93e4db3fa2d974e1fed91659d434daa7c92dba75f4392`.

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
