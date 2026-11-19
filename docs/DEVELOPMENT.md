# Development

## Repository layout

| Directory | Contents |
| --- | --- |
| `src/` | Zotero 7–10 bootstrap, runtime source and manifest |
| `src/icons/` | Plugin icons |
| `scripts/` | Dependency-free Python packaging script |
| `docs/` | Changelog, compatibility record and release notes |
| `tests/` | Runtime harness, overflow tests and verification records |
| `dist/` | Published install packages and checksums |

`updates.json` stays at the repository root to preserve installed plugins' automatic update URL. Existing release downloads remain available.

## Build

Packaging needs Python 3 only:

```sh
python scripts/build.py
```

After editing the runtime source, package and verify:

```sh
python scripts/build.py
node tests/layout.cjs
node tests/features.cjs
python tests/package.py
```

Edit `src/core.js` and `src/features.js` directly. The XPI keeps Zotero's required files at its archive root, regardless of the source directory layout. Packaging produces `dist/tab-manager-1.0.0.xpi`, `dist/SHA256SUMS` and `updates.json`. No transpilation or npm installation is required.

The build workflow verifies syntax, state regressions, package contents and reproducible output. Updating `docs/RELEASE_NOTES.md` triggers the release workflow; existing releases are left unchanged. Runtime tests require Zotero Desktop: see [the test guide](../tests/README.md).

Starting with 1.0.0, installation and updates target Zotero 7–10 only. Zotero 6 users should download [0.6.6](https://github.com/Ueky2000/zotero-tab-manager/releases/tag/v0.6.6); updates and maintenance for that version have ended to reduce maintenance costs. Its historical release assets and verification records remain available.
