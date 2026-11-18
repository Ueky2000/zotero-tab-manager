# Changelog

## 0.5.2 — 2026-11-18

- Place ungrouped papers after named groups by default. Migrate the old layout once while preserving the relative order of named groups; subsequent manual group ordering remains persistent.
- Size group headings by their names, with a bounded width that no longer grows with the number of open papers.
- Keep Zotero's original library tab visible to the left of the grouped strip, independent of native overflow detection, including Zotero 10.0.1.
- Verify returning to the library after scrolling through many tabs, plus fixed controls at 960, 1280 and 1920 pixel widths.

## 0.5.1 — 2026-11-17

- Fix many open tabs pushing Zotero's native tab dropdown and Tab Manager's search and suggestions outside the window.
- Keep overflow inside a horizontally scrollable document strip and reserve space for the right toolbar.
- Reveal the selected paper when switching to an offscreen tab, including search results.
- Keep the legacy Zotero 6 action buttons in the tab row.
- Add regression coverage with 60 additional tabs at 960, 1280 and 1920 pixel widths.

## 0.5.0 — 2026-11-16

- Support one install package for Zotero 6–10.
- Wait for Zotero 6's main window before initializing the legacy bootstrap.
- Generate a Firefox 60 compatible module from the shared source.
- Adapt XUL element creation, window discovery, title formatting and toolbar labels across versions.
- Use layout spacing and focus selectors available in Firefox 60; keep search cards separated on current versions.
- Preserve existing plugin identity and local settings.
- Include reproducible packaging, update metadata, build CI and a compatibility test record.

## 0.4.1

- Set tab label display mode for a whole group.
- Fix overlapping search results and wrapping of long tab notes.

## Earlier versions

Inline colored tab groups, folding, drag and drop, group ordering, inactivity suggestions, tab notes and open-tab search.
