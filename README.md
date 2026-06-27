![ZhuàngTài - 状态](./assets/header.png)

# ZhuàngTài 状态

Simple, direct state primitives for JavaScript.

ZhuàngTài is a tiny TypeScript state library with a framework-agnostic core and no hidden scheduling.

## Packages

- `@zhuangtai/core`: the zero-runtime-dependency store core.
- `@zhuangtai/react`: planned React adapter, not implemented yet.

## Core API

```ts
import { atom, computed } from "@zhuangtai/core";

const count = atom(0);
const double = computed(count, (value) => value * 2);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});

double.get();
double.watch((value, prevValue) => {});
```

## Development

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm check
```

`@zhuangtai/core` intentionally has no third-party runtime dependencies. Framework adapters live in separate packages.
