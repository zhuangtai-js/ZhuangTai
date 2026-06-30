# Changelog

All notable changes to ZhuàngTài packages are documented here.

## 0.2.0 - 2026-06-30

### Added

- Added the `docs` Starlight site with Chinese as the default language and English support.
- Added the private `@zhuangtai-js/test` workspace for unit, reliability, and browser smoke tests.
- Added public API type tests for package entrypoints.
- Added build artifact checks for package manifests and built consumer smoke coverage.
- Added automated packed-tarball consumer smoke tests for runtime and TypeScript usage.
- Added a real Chromium browser smoke test for core primitives and `persist` with `localStorage`.

### Changed

- Centralized core and persist tests under `@zhuangtai-js/test` and made package tests exercise public package imports.
- Hid internal atom creator type plumbing from the `@zhuangtai-js/core` package entrypoint.
- Simplified `PersistStorage` so custom storage only needs `getItem` and `setItem`.

### Fixed

- Fixed `computed.watch()` so its initial watcher call reads a fresh derived value after unwatched source changes.
- Prevented atom self-reentrant `set()` calls while the same atom is notifying watchers.
- Made the default persist JSON codec reject values that `JSON.stringify` cannot encode as strings.

## 0.1.0 - 2026-06-30

### Added

- Added `@zhuangtai-js/core` with `atom`, `computed`, and `createAtom`.
- Added `@zhuangtai-js/persist` as an atom creator plugin for synchronous storage persistence.
