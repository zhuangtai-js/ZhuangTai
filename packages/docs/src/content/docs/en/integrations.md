---
title: Integrations and Compatibility
sidebar:
  label: Integrations & Compatibility
  order: 6
description: Understand how ZhuàngTài fits JavaScript, TypeScript, React, and common framework environments.
---

ZhuàngTài Core is independent of UI frameworks. You can create and subscribe to state in plain JavaScript, component libraries, SDKs, or framework applications, then add an adapter only when framework lifecycle integration is useful.

## Support overview

| Environment          | Recommended approach  | Notes                                                                              |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| Vanilla ESM          | Use Core              | Import `@zhuangtai-js/core` directly; Core has no third-party runtime dependencies |
| TypeScript           | Use directly          | Every public package includes type declarations                                    |
| React 18 / 19        | Use the React package | Use `useAtom`, `useAtomValue`, and `useSetAtom` from `@zhuangtai-js/react`         |
| Vite                 | Standard ESM imports  | Vanilla and React projects can use the packages directly                           |
| Astro                | React island or Core  | Use the React adapter in React islands, or Core directly in plain scripts          |
| Next.js              | Client Components     | Use the React adapter and isolate server state per request                         |
| Vue / Svelte / Solid | Core API integration  | Connect `get`, `set`, and `watch` to the framework lifecycle                       |
| Node.js ESM          | Use Core              | Suitable for SDKs, service state, and tooling                                      |
| CommonJS projects    | Import through ESM    | Packages use the ESM-only format; use `import`                                     |

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

These isolation principles apply to every server-rendered environment: global state suits application constants or shared client state, while request-specific mutable state belongs to the request lifecycle.
