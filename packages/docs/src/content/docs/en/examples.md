---
title: Complete Examples
sidebar:
  label: Complete Examples
  order: 4
description: Start with Vanilla JavaScript or React examples and bring ZhuàngTài into a real interface.
---

You do not need to clone the repository just to feel the API. Open the [interactive examples](/en/playground/) and use the counter, task list, and persisted preferences directly.

## Vanilla JavaScript

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
npm install @zhuangtai-js/core
```

The complete Vite Vanilla project is available in [`examples/vite-vanilla`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-vanilla).

## React

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
npm install @zhuangtai-js/core @zhuangtai-js/react
```

The complete Vite React project is available in [`examples/vite-react`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-react).

## Next steps

- Want to click and type first? Open the [interactive examples](/en/playground/).
- Want the complete hooks guide? Read [Using with React](/en/guides/react/).
- Need environment-specific guidance? See [Integrations and Compatibility](/en/integrations/).
