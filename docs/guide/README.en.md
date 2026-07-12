![ZhuàngTài](../../assets/header.png)

[![Core Version](https://img.shields.io/npm/v/@zhuangtai-js/core?label=core&style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@zhuangtai-js/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/%40zhuangtai-js%2Fcore?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/@zhuangtai-js/core)
[![CI](https://img.shields.io/github/actions/workflow/status/zhuangtai-js/ZhuangTai/ci.yml?branch=main&label=CI&style=flat&colorA=000000&colorB=000000)](https://github.com/zhuangtai-js/ZhuangTai/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@zhuangtai-js/core?style=flat&colorA=000000&colorB=000000)](../../LICENSE)

<p align="center"><a href="../../README.md">简体中文</a> · English</p>

# ZhuàngTài

Simple, direct state primitives for JavaScript.

ZhuàngTài is a lightweight, TypeScript-first, framework-agnostic state library. `set` applies immediately, `watch` runs synchronously, equality uses `Object.is`, and core has no hidden scheduling.

[Documentation](https://zhuangtai.yojigen.cn/en/) · [llms.txt](https://zhuangtai.yojigen.cn/llms.txt)

## Quick start

```sh
npm install @zhuangtai-js/core
# or
pnpm add @zhuangtai-js/core
```

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);

const stop = count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});

count.set(1);
count.set((value) => value + 1);
double.get(); // 4

stop();
```

`watch` immediately runs once with `(currentValue, undefined)` when subscribed, then runs synchronously whenever the value actually changes. See the [`@zhuangtai-js/core` README](../../packages/core/README.md#english) for complete boundaries and error semantics.

## Core semantics

- `set` applies immediately, without batching or deferring.
- `watch` callbacks run synchronously and return an unsubscribe function.
- Equality uses `Object.is`; equal values do not notify.
- Objects and arrays are compared by reference; use immutable updates.
- Functions cannot be stored directly as atom values; wrap a function in an object when needed.
- `computed` runs its derive synchronously and tracks the dependencies actually read inside it.
- Core has no third-party runtime dependencies, hidden scheduling, transactions, or debouncing.

## Packages

| Package                                                             | Purpose                                                                  | Documentation                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [`@zhuangtai-js/core`](../../packages/core/README.md#english)       | Framework-agnostic state core with zero third-party runtime dependencies | [API reference](https://zhuangtai.yojigen.cn/en/reference/core/)    |
| [`@zhuangtai-js/react`](../../packages/react/README.md#english)     | React 18/19 hooks for atoms and computeds                                | [React guide](https://zhuangtai.yojigen.cn/en/guides/react/)        |
| [`@zhuangtai-js/persist`](../../packages/persist/README.md#english) | Persist atoms with synchronous storage                                   | [API reference](https://zhuangtai.yojigen.cn/en/reference/persist/) |
| [`@zhuangtai-js/freeze`](../../packages/freeze/README.md#english)   | Deep-freeze values during development to catch in-place mutation         | [API reference](https://zhuangtai.yojigen.cn/en/reference/freeze/)  |
| [`@zhuangtai-js/immer`](../../packages/immer/README.md#english)     | Write immutable updates with Immer drafts                                | [API reference](https://zhuangtai.yojigen.cn/en/reference/immer/)   |
| [`@zhuangtai-js/sync`](../../packages/sync/README.md#english)       | Sync across same-origin contexts with `BroadcastChannel`                 | [API reference](https://zhuangtai.yojigen.cn/en/reference/sync/)    |

Plugins are installed on creators made with `createAtom()`:

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
const theme = atom("light", {
  persist: { key: "theme" },
});
```

See [Plugins and composition](https://zhuangtai.yojigen.cn/en/guides/plugins/) for composition and ordering semantics.

### Current compatibility

Extension packages declare only verified peer versions. The current release lines target core 0.5.x; because minor releases in the 0.x range may contain breaking changes, the peer ranges do not automatically accept a future core 0.6.0.

| Package release line          | `@zhuangtai-js/core` | Other peers                       |
| ----------------------------- | -------------------- | --------------------------------- |
| `@zhuangtai-js/freeze@0.2.x`  | `^0.5.0`             | —                                 |
| `@zhuangtai-js/immer@0.2.x`   | `^0.5.0`             | — (Immer is a regular dependency) |
| `@zhuangtai-js/persist@0.3.x` | `^0.5.0`             | —                                 |
| `@zhuangtai-js/react@0.2.x`   | `^0.5.0`             | React `>=18 <20`                  |
| `@zhuangtai-js/sync@0.2.x`    | `^0.5.0`             | —                                 |

## React

```sh
npm install @zhuangtai-js/core @zhuangtai-js/react react
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleAtom);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count} × 2 = {double}
    </button>
  );
}
```

`useAtomValue` also reads computeds. Use `useSetAtom` when only a setter is needed, and use `createAtomHook` or `createComputedHook` for bound hooks. See the [`@zhuangtai-js/react` README](../../packages/react/README.md#english) for complete details.

## API at a glance

| Export or method | Simplified form            | Semantics                                                                           |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `atom`           | `atom(initialValue)`       | Create a readable and writable atom.                                                |
| `computed`       | `computed(derive)`         | Create a read-only derived value with automatic dependency tracking.                |
| `createAtom`     | `createAtom()`             | Create an atom creator that accepts plugins.                                        |
| `.use`           | `creator.use(plugin)`      | Install a creator plugin with a unique ID.                                          |
| `get()`          | `source.get()`             | Read the current value synchronously.                                               |
| `set()`          | `atom.set(valueOrUpdater)` | Commit a concrete value or updater synchronously.                                   |
| `watch()`        | `source.watch(watcher)`    | Invoke immediately and subscribe to later changes; returns an unsubscribe function. |

Use each package README and the documentation reference pages as the source of truth for complete TypeScript types and semantics.

## Philosophy

ZhuàngTài keeps its API small so every line of state code can be reasoned about directly. There is no hidden queue to learn and no uncertainty about when an update happens.

Complexity is composed through independent plugins and framework adapters only when needed. Core keeps only the most direct state primitives. These boundaries make the code easier for people to maintain and for AI agents to generate correctly.

Good fit:

- Small or medium state that needs predictable synchronous semantics.
- A framework-agnostic core with zero third-party runtime dependencies.
- Optional persistence, freezing, Immer updates, or cross-context sync.

Not a good fit:

- Built-in batching, asynchronous scheduling, or transactions are required.
- The state library is expected to hide update timing and scheduling details.

Read more on the [Philosophy](https://zhuangtai.yojigen.cn/en/philosophy/) page.

## Playground, examples, and choosing a model

- [Interactive examples](https://zhuangtai.yojigen.cn/en/playground/): use a counter, task list, and preferences panel to observe real React state updates.
- [Complete examples](https://zhuangtai.yojigen.cn/en/examples/): runnable Vite Vanilla and React projects ready to adapt.
- [Why ZhuàngTài](https://zhuangtai.yojigen.cn/en/why-zhuangtai/): positioning, differentiators, and boundaries.
- [State model comparison](https://zhuangtai.yojigen.cn/en/compare/): an honest comparison of ZhuàngTài, Zustand, and Jotai.
- [Integrations and compatibility](https://zhuangtai.yojigen.cn/en/integrations/): official support, direct usage, SSR boundaries, and environments without an official guide.
- [Reproducible benchmarks](https://zhuangtai.yojigen.cn/en/benchmarks/): pinned versions, programs, results, and limitations.
- [Roadmap](https://zhuangtai.yojigen.cn/en/roadmap/): adoption, integration, and community priorities.

Complete projects live in [`examples/`](../../examples), and measurement programs live in [`benchmarks/`](../../benchmarks). Bring questions and ideas to [Discussions](https://github.com/zhuangtai-js/ZhuangTai/discussions); see [`CONTRIBUTING.md`](../../CONTRIBUTING.md) to contribute.

## AI / agent integration

Give this prompt to Claude Code, Codex, Cursor, OpenCode, or another coding agent:

```text
Please read https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md and follow its steps to install and configure ZhuàngTài in the current project.
```

You can also install the bundled Agent Skills:

```sh
npx skills add zhuangtai-js/ZhuangTai
```

Machine-readable documentation:

- [llms.txt](https://zhuangtai.yojigen.cn/llms.txt): documentation index.
- [llms-full.txt](https://zhuangtai.yojigen.cn/llms-full.txt): complete context.
- [llms-small.txt](https://zhuangtai.yojigen.cn/llms-small.txt): compact context.
- [AI page](https://zhuangtai.yojigen.cn/en/ai/): integration notes.

If ZhuàngTài helps your project, consider starring it on [GitHub](https://github.com/zhuangtai-js/ZhuangTai).

## License

ZhuàngTài is released under the [ISC License](../../LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
