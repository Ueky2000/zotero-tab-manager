# Compatibility record

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
