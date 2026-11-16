# Development

## Repository layout

| Directory | Contents |
| --- | --- |
| `src/` | Zotero bootstrap, shared source, generated legacy module and install manifests |
| `src/icons/` | Plugin icons |
| `scripts/` | Build scripts and the pinned Babel dependency |
| `docs/` | Changelog, compatibility record and release notes |
| `tests/` | Runtime harness, overflow tests and verification records |
| `dist/` | Published install packages and checksums |

`updates.json` stays at the repository root to preserve installed plugins' automatic update URL. Existing release downloads remain available.

## Build

Packaging needs Python 3 only:

```sh
python scripts/build.py
```

After editing `src/core.js`, regenerate the Firefox 60 module and package:

```sh
npm --prefix scripts install --ignore-scripts --no-audit --no-fund
npm --prefix scripts run build
```

Edit `src/core.js`, never `src/core-legacy.js` directly. The XPI keeps Zotero's required files at its archive root, regardless of the source directory layout. Packaging produces `dist/tab-manager-0.5.1.xpi`, `dist/SHA256SUMS` and `updates.json`.

The build workflow verifies syntax and generated files. Updating `docs/RELEASE_NOTES.md` triggers the release workflow; existing releases are left unchanged. Runtime tests require Zotero Desktop: see [the test guide](../tests/README.md).
