---
title: Complete Examples
sidebar:
  label: Complete Examples
  order: 4
description: Start ZhuàngTài with runnable Vite Vanilla and React projects.
---

Examples are not snippets copied into documentation. They are real projects in the workspace: dependencies install, type checking runs, and CI produces production builds.

## Vite Vanilla

Start here to understand Core: a counter, a `computed` value, and a synchronous `watch` timeline.

```sh
pnpm install
pnpm --filter @zhuangtai-js/example-vite-vanilla dev
```

The source is in [`examples/vite-vanilla`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-vanilla). Production build:

```sh
pnpm --filter @zhuangtai-js/example-vite-vanilla build
```

## Vite React

Shows Core atoms staying outside components while `useAtom`, `useAtomValue`, and `useSetAtom` connect them to React 18/19.

```sh
pnpm install
pnpm --filter @zhuangtai-js/example-vite-react dev
```

The source is in [`examples/vite-react`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-react).

## Why these two come first

They cover the shortest adoption path: Vanilla proves Core does not depend on a UI framework, while the React example proves the adapter can provide a familiar component experience. SSR frameworks such as Next.js need additional hydration and request-isolation verification, so they will only be marked verified after a dedicated fixture exists.

For a quick semantic experiment, open the [State Lab](/en/playground/). For environment support levels, see [integrations and compatibility](/en/integrations/).
