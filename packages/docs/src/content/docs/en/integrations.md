---
title: Integrations and Compatibility
sidebar:
  label: Integrations & Compatibility
  order: 6
description: Understand how ZhuàngTài fits JavaScript, TypeScript, React, and common framework environments.
---

ZhuàngTài Core is independent of UI frameworks. You can create and subscribe to state in plain JavaScript, component libraries, SDKs, or framework applications, then add an adapter only when framework lifecycle integration is useful.

## Support overview

| Environment          | Support               | Guidance                                                                                 |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| Vanilla ESM          | Official              | Use `@zhuangtai-js/core` directly; Core has no third-party runtime dependencies          |
| TypeScript           | Official              | Every public package includes type declarations                                          |
| React 18 / 19        | Official              | Use `useAtom`, `useAtomValue`, and `useSetAtom` from `@zhuangtai-js/react`               |
| Vite                 | Ready to use          | Import the ESM packages normally in Vanilla or React projects                            |
| Astro                | Ready to use          | Use the React adapter inside React islands, or Core directly in plain scripts            |
| Next.js              | Mind the SSR boundary | Client Components can use the React adapter; server state should be isolated per request |
| Vue / Svelte / Solid | Core available        | Integrate manually with `get`, `set`, and `watch`; no official adapter yet               |
| Node.js ESM          | Ready to use          | Import with `import` for SDKs, service state, and tooling                                |
| React Native / Expo  | No official guide yet | The API does not depend on the DOM, but there is no dedicated integration guide yet      |
| Bun / Deno           | No official guide yet | The ESM API is portable, but there is no formal runtime support commitment yet           |
| CommonJS `require`   | Unsupported           | Packages are ESM-only; use `import`                                                      |

## React and Astro

A React island in Astro uses the adapter just like a regular React application:

```astro
---
import Counter from "../components/Counter.tsx";
---

<Counter client:load />
```

Inside `Counter.tsx`, use `@zhuangtai-js/react` normally. If a page does not need React, Core's `atom` and `watch` can be used from a regular module or script instead.

## Next.js and server rendering

The React adapter integrates through `useSyncExternalStore`. Client Components can use it normally, but an SSR application must still decide who owns each state instance:

- Page-wide client state can live in a client module.
- Mutable state associated with a request or user should be created per request, not shared through one module-level atom.
- Browser APIs such as `localStorage` should only be accessed in the client environment.

A complete Next.js guide is still planned. Until then, treat request isolation as part of your application architecture rather than something a global atom handles automatically.
