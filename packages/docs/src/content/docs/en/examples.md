---
title: Complete Examples
sidebar:
  label: Complete Examples
  order: 4
description: Start with copy-ready website snippets and real Vite projects that exist in the repository.
---

You do not need to clone the repository just to feel the API. Open the [interactive examples](/en/playground/) and use the real counter, task list, and persisted preferences screens directly.

## Copy-ready website examples

The [interactive examples](/en/playground/) are real React pages running in the documentation site. They include three scenarios you can inspect and copy:

- **Counter**: store a value with `atom` and derive its double with `computed`.
- **Task list**: add, complete, filter, and remove items with immutable new arrays and objects.
- **Preferences**: persist theme and content density, with a fallback when browser storage is unavailable.

The snippets below can be copied into the matching project.

### Vanilla JavaScript

Start here for Core's smallest model: `atom` stores state, `computed` derives state, and `watch` responds synchronously.

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const doubled = computed(() => count.get() * 2);

count.watch((value) => {
  console.log(value, doubled.get());
});

count.set((value) => value + 1);
```

Install Core:

```sh
pnpm add @zhuangtai-js/core
```

### React

The React adapter keeps atoms outside components while providing a component experience close to `useState`.

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";

const count = atom(0);
const doubled = computed(() => count.get() * 2);

export function Counter() {
  const [value, setValue] = useAtom(count);
  const doubledValue = useAtomValue(doubled);

  return (
    <button onClick={() => setValue((current) => current + 1)}>
      {value} · doubled {doubledValue}
    </button>
  );
}
```

Install the React packages:

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

## Runnable Vite projects

Both projects run through the `dev` / `build` scripts in their `package.json`. `vite-vanilla` has no separate `vite.config` file and uses Vite's defaults; `vite-react` uses the configuration file in the repository:

| Project      | Workspace package                    | Start command                                          | Source                                                                                               |
| ------------ | ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Vite Vanilla | `@zhuangtai-js/example-vite-vanilla` | `pnpm --filter @zhuangtai-js/example-vite-vanilla dev` | [`examples/vite-vanilla`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-vanilla) |
| Vite React   | `@zhuangtai-js/example-vite-react`   | `pnpm --filter @zhuangtai-js/example-vite-react dev`   | [`examples/vite-react`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-react)     |

## Framework quick starts

- [React Quick Start](/en/guides/react/)
- [Preact Quick Start](/en/guides/preact/)
- [Vue Quick Start](/en/guides/vue/)
- [Svelte Quick Start](/en/guides/svelte/)
- [Solid Quick Start](/en/guides/solid/)
- [React Native / Expo Quick Start](/en/guides/react-native-expo/)

## Next steps

- Want to click and type first? Open the [interactive examples](/en/playground/).
- Want a framework-specific path? Start with one of the quick starts above.
- Need environment-specific guidance? See [Integrations and Compatibility](/en/integrations/).
