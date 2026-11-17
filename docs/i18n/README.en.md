<p align="center"><img src="../../src/icons/icon-128.png" width="88" height="88" alt="Tab Manager icon"></p>
<h1 align="center">Tab Manager</h1>
<p align="center">Your tabs, in order.</p>

<p align="center"><a href="../../README.md">简体中文</a> | English | <a href="README.ja.md">日本語</a> | <a href="README.ko.md">한국어</a> | <a href="README.it.md">Italiano</a> | <a href="README.fr.md">Français</a></p>

> This translation is AI-generated and may contain inaccuracies. The [Chinese README](../../README.md) is the authoritative version. These translations describe the documentation, not additional interface languages.

<p align="center"><strong>📦 Download:</strong> <a href="https://github.com/Ueky2000/zotero-tab-manager/releases/latest">Zotero plugin XPI</a> · <a href="https://github.com/Ueky2000/zotero-tab-manager/releases">All releases</a> · <a href="#usage">Usage</a></p>

## Why Tab Manager?

Reading often means opening dozens of papers at once. Tabs crowd together, titles get cut off, and it becomes hard to find a paper or remember why you opened it. Tab Manager organizes those tabs around your research.

| Feature | What it does |
| --- | --- |
| 🗂️ Topic groups | Keep papers for a project, method, or reading task together. Close all tabs in a group when you finish. |
| 🎨 Colors and folding | Give groups custom colors and collapse those you are not using. The ungrouped section supports both. |
| ✍️ Personal remarks | Label a tab “Check experiments” or “Has code.” Show the original title, your remark, or both, with group-wide settings. |
| 🔎 Open-tab search | Search remarks, filenames, and original titles, including papers in collapsed groups. Jump directly to a result. |
| 🕒 Suggested closures | Review papers you have not revisited for a while, with days since your last visit. You decide what to close. |
| 💾 Resume reading | Preserve groups, colors, group order, remarks, and collapsed states across restarts. |

Groups and paper tabs share one row. Closing tabs never deletes library items or attachments.

## Installation

1. Open the [latest release](https://github.com/Ueky2000/zotero-tab-manager/releases/latest) and download the **`.xpi`** asset.
2. In Zotero, choose **Tools → Plugins → gear icon → Install Add-on From File**, then select the file. Some versions call the page **Add-ons**.
3. Open a few papers, click **+** in the tab bar to create a group, and drag paper tabs onto its name.

Install over an older version to keep your settings. Restart Zotero if necessary.

## Usage

- **Groups:** Drag a tab onto a group name, or assign it through the tab's context menu. Click a group name to collapse or expand it. Drag group names to reorder groups.
- **Drag and drop:** Insertion markers distinguish joining a group from inserting beside another paper. Hover over a collapsed group for about 600 ms to expand it temporarily; cancelling the drag restores its state.
- **Colors:** Right-click a group to choose a preset or enter a hexadecimal color. This also works for ungrouped tabs.
- **Remarks:** Right-click a paper tab to set its remark and display mode. Use the group's context menu to apply one display mode to current and future members.
- **Search:** Use the search control on the right. Selecting a result expands its group and activates the paper.
- **Suggested closures:** The far-right control lists inactive papers; the default threshold is 7 days and can be changed. It never closes papers automatically. Tracking starts when the plugin begins recording visits.
- **Close group tabs:** The group's context menu closes its reading tabs and preserves group assignments. Dissolving a group removes the grouping instead.

Group menu order: rename, dissolve, color, tab display, close all group tabs.

Version 0.5.1 fixes crowded tabs pushing the toolbar out of view. Tabs scroll horizontally with the mouse wheel, and activating an offscreen tab scrolls it into view.

## Compatibility

One XPI targets **Zotero 6.0–10.0.x**. On 2026-11-17, isolated Windows profiles passed 34 installation/core checks on 6.0.36 and 38 each on 7.0.32, 8.0.4, 9.0.6, and 10.0.8. Zotero 7.0.32 also passed 130 regression checks. macOS, Linux, and other patch versions have not been tested on actual installations. See the [test record](../COMPATIBILITY.md).

## Data and updates

Settings use the library ID and attachment key and stay in the local Zotero profile; they do not sync with your library. Filenames, item titles, and Zotero notes are unchanged. Disabling the plugin restores native tabs and retains settings.

The plugin ID remains `tab-groups@local.zotero` and the preference key remains `extensions.tabGroups.state`, preserving existing settings and visit records. Normal features do not upload paper information; Zotero may access this repository's update manifest and packages according to its add-on update settings.

## Documentation and feedback

[Changelog](../CHANGELOG.md) · [Build instructions](../DEVELOPMENT.md) · [Issues](https://github.com/Ueky2000/zotero-tab-manager/issues)

For bug reports, include your Zotero version, operating system, reproduction steps, and a screenshot. The linked technical documents are currently in their original languages.

[MIT License](../../LICENSE).
