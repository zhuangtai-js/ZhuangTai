# AI Agent Guidelines

This file is for AI agents and maintainers working on this repository. Do not put internal maintenance or release instructions in `README.md`; the README should contain only externally useful project information.

## Communication

- When reasoning about this repository and when replying to the user, always use Simplified Chinese (简体中文).


## Project Identity

- Display name: `ZhuàngTài`
- Chinese name: `状态`
- Slogan: `Simple, direct state primitives for JavaScript.`
- Chinese slogan for images: `简单、直接的 JavaScript 状态原语。`

## Package Rules

- The npm scope is `@zhuangtai-js`.
- Publishable packages must live under `packages/*`.
- Publishable package names must use `@zhuangtai-js/*`.
- The root package must stay `private: true` and must never be published.
- `@zhuangtai-js/core` must have no third-party runtime dependencies.
- Future adapters should use scoped package names, for example `@zhuangtai-js/react`.

Do not use these package names:

- `@zhuangtai/*`
- `zhuangtai`
- `@zhuangtai/core`

## Documentation Rules

- All public-facing documentation must have both Chinese and English versions.
- Chinese is the primary version and should be written first.
- English documentation should mirror the Chinese version's meaning, structure, and public API details.
- This applies to README files, package docs, changelogs, docs site pages, release notes, and future guides/reference docs.
- If a document cannot be translated in the same change, leave an explicit follow-up note instead of silently adding single-language documentation.

## Core Semantics

Keep the core API simple and direct:

- `set` applies immediately.
- `watch` callbacks run synchronously.
- Equality uses `Object.is`.
- Object and array updates are reference-based; callers should use immutable updates.
- Do not add hidden scheduling to core.
- Do not add batching, deferring, debouncing, or transactions to core unless explicitly requested.

## Release Channels

Publishable workspace packages are released through npm dist-tags:

- `dev`: debugging builds. Versions must look like `0.2.0-dev.0`; npm tag is `dev`; GitHub Release is a prerelease.
- `beta`: usable preview builds. Versions must look like `0.2.0-beta.0`; npm tag is `beta`; GitHub Release is a prerelease.
- `stable`: stable builds. Versions must look like `0.2.0`; npm tag is `latest`; GitHub Release is a normal release.

The release script must reject channel/version mismatches. Dev and beta releases must never publish to the default `latest` install path.

Workspace package versions are independent. Do not force all publishable packages to share the same version. For example, `@zhuangtai-js/core` may release `0.3.0` or `0.3.1` while `@zhuangtai-js/persist` remains on `0.2.1`.

Each publishable package owns its changelog at `packages/<name>/CHANGELOG.md`. GitHub Release notes must come from the matching package changelog entry for the exact package version being released.

## Maintainer Release Flow

1. Update the target workspace package version.
2. Run local verification.
3. Merge through CI.
4. Open GitHub Actions > npm Publish.
5. Select the release `channel`.
6. Run with `dry_run: true` first.
7. If the dry run is correct, rerun with `dry_run: false`.
8. Confirm npm shows the new `@zhuangtai-js/*` package version and GitHub has the expected release or prerelease.

## Verification

Run these before considering release automation or package changes complete:

```sh
pnpm check
pnpm release:test
pnpm release:dry-run -- --channel stable
```

For prerelease validation, use package versions matching the selected channel before running a `dev` or `beta` dry run.

## GitHub Actions

- Use `actions/checkout@v7`.
- Use `actions/setup-node@v6`.
- Use `pnpm/action-setup@v6`.
- npm publish workflow uses npm Trusted Publishing through GitHub OIDC; do not use a long-lived `NPM_TOKEN`.
- Keep the npm publish workflow protected by the `npm-production` environment.
- npm publish workflow needs `contents: write` for GitHub Release creation and `id-token: write` for npm Trusted Publishing.

## Repository References

- GitHub repository: `zhuangtai-js/ZhuangTai`
- SSH remote: `git@github.com:zhuangtai-js/ZhuangTai.git`
- npm registry: `https://registry.npmjs.org/`

Avoid stale references to old repository or package names.
