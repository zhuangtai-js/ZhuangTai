---
title: Integrations and Compatibility
sidebar:
  label: Integrations & Compatibility
  order: 6
description: Distinguish official support, verified compatibility, Core availability, unverified environments, and unsupported formats.
---

We only label an environment “officially supported” or “verified” when there is a concrete implementation or automated fixture. A framework being able to bundle ESM does not prove SSR, hydration, request isolation, and lifecycle behavior.

## Support levels

- **Official support**: maintained public API, documentation, tests, and release commitment.
- **Verified compatibility**: a real fixture or consumer test runs in CI, without necessarily having a dedicated adapter.
- **Core available**: framework-agnostic APIs can be integrated manually, but there is no adapter or complete fixture.
- **Unverified**: insufficient evidence; no compatibility commitment.
- **Unsupported**: the current package format or API cannot be used directly.

| Environment          | Level                  | Evidence and boundary                                                                          |
| -------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| Vanilla ESM          | Official support       | Zero third-party runtime dependencies in Core; Vite Vanilla example is in the workspace and CI |
| TypeScript           | Official support       | TypeScript source, declaration build, API type tests, and strict type checking                 |
| React 18/19          | Official support       | `@zhuangtai-js/react` peer range, adapter tests, and Vite React example                        |
| Chromium             | Verified compatibility | Playwright browser tests                                                                       |
| Node.js ESM          | Verified compatibility | NodeNext packed consumer; CI currently uses Node.js 24                                         |
| Vite                 | Verified compatibility | Vanilla and React production fixtures                                                          |
| Astro                | Core available         | The Docs site bundles Core, but there is no user-facing Astro fixture or adapter yet           |
| Next.js              | Unverified             | Hydration, request isolation, and streaming SSR fixture is still missing                       |
| Vue / Svelte / Solid | Core available         | Manual subscription is possible; no official adapter or fixture                                |
| React Native / Expo  | Unverified             | No device or bundler fixture                                                                   |
| Bun / Deno           | Unverified             | No runtime matrix                                                                              |
| CommonJS `require`   | Unsupported            | Packages are ESM-only and expose only `import` exports                                         |

## Precise SSR statement

The React adapter reuses synchronous `get()` for the server snapshot required by `useSyncExternalStore`. This establishes a server read path, but **does not by itself prove** support for Next.js App Router, hydration consistency, request-scoped state isolation, or streaming SSR.

In an SSR application, a mutable module-level atom shared by every request may leak data across requests. Until a dedicated Next.js fixture lands, create state per request and treat the environment as unverified.

To contribute a fixture, start with the [contributing guide](https://github.com/zhuangtai-js/ZhuangTai/blob/main/CONTRIBUTING.md).
