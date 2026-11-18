# Changelog

## 0.6.3 — 2026-11-18

- Number vertical entries, adapt large lists to two or three columns within the window, and use translucent group colors on hover.
- Show the active document as a horizontal tab; keep popup rows stable during selection for drag support.
- Add a configurable group-count threshold (default 7) that switches all groups to vertical lists when exceeded. Keep the active paper horizontal.
- Apply default display changes immediately to current groups and open documents without changing remarks or saved workspaces.
- Simplify Tools → Tab Manager to save/restore actions with matching colored icons in the menu and settings buttons; remove settings from the suggestions menu.
- Clarify settings labels and always enable drag-hover expansion. Retain Zotero 6 settings through the add-on manager's options button.

## 0.6.2 — 2026-11-18

- Fix unreliable bulk reading-workspace restoration on Zotero 7. Restore native unloaded tabs first, loading each PDF when selected, instead of constructing every reader at once.
- Load item metadata before restoration, including a Zotero 6 compatibility path. Confirm that each restored document actually has a tab before counting success.
- Retain existing saved and newer documents, restore groups/order/remarks/folding, and leave the saved snapshot unchanged.
- Report unavailable files and other failures by paper and reason in an expandable settings section.
- Add a 20-document regression that verifies every restored PDF loads on Zotero 7 and 10, plus native-tab restoration on Zotero 6.

## 0.6.1 — 2026-11-18

- Remove the fixed blue focus outline during pointer interaction. Preserve the selected tab's group-colored border and bottom stripe.
- Use the group color for keyboard focus, including Firefox 60's compatible focus-ring selector. Keep drag-and-drop join indicators visible.
- Compact the settings pane: place controls beside their labels, shorten option names, move secondary hints to tooltips and remove repetitive explanatory paragraphs.
- Show a group's papers in a vertical popup when its count exceeds a configurable threshold (default 7); keep the tab bar on one line. Preserve selection, closing, context menus and drag targets in the list.
- Restore group memory when an opening tab receives its item identifier after its first render.

## 0.6.0 — 2026-11-18

- Add a native Zotero 7–10 preferences pane and a compatible settings window for Zotero 6, accessible from Tools → Tab Manager.
- Centralize group counts, hover expansion, ungrouped color, default label display and stale-tab suggestions.
- Make closed-paper group memory optional. Recreate missing groups when enabled; leave currently open papers in place when switching it off.
- Save and restore a reading workspace, including papers, groups, order, colors, remarks, display modes, folding and selection. Keep newer papers open, skip duplicates and report missing items.
- Reveal the active paper after assigning it to another group, including groups outside the visible tab strip.

## 0.5.2 — 2026-11-18

- Place ungrouped papers after named groups by default. Migrate the old layout once while preserving the relative order of named groups; subsequent manual group ordering remains persistent.
- Size group headings by their names, with a bounded width that no longer grows with the number of open papers.
- Keep Zotero's original library tab visible to the left of the grouped strip, independent of native overflow detection, including Zotero 10.0.1.
- Verify returning to the library after scrolling through many tabs, plus fixed controls at 960, 1280 and 1920 pixel widths.
- Normalize packaged text line endings so Windows and Linux builds produce the same XPI hash.

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
