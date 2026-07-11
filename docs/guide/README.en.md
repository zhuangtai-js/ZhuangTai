![ZhuàngTài - 状态](../../assets/header.png)

[![Core Version](https://img.shields.io/npm/v/@zhuangtai-js/core?label=core&style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@zhuangtai-js/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/%40zhuangtai-js%2Fcore?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/@zhuangtai-js/core)
[![CI](https://img.shields.io/github/actions/workflow/status/zhuangtai-js/ZhuangTai/ci.yml?branch=main&label=CI&style=flat&colorA=000000&colorB=000000)](https://github.com/zhuangtai-js/ZhuangTai/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@zhuangtai-js/core?style=flat&colorA=000000&colorB=000000)](../../LICENSE)

<p align="center"><a href="../../README.md">简体中文</a> | English</p>

# ZhuàngTài

Simple, direct state primitives for JavaScript.

Docs: https://zhuangtai.yojigen.cn/en/ · llms.txt: https://zhuangtai.yojigen.cn/llms.txt

ZhuàngTài is a tiny TypeScript state library with a framework-agnostic core and no hidden scheduling.

## Philosophy

ZhuàngTài keeps the API small. `atom`, `computed`, and `createAtom` cover the core cases, and each line of behavior should stay simple enough to replay in your head.

There is no magic. `set` applies immediately, `watch` runs synchronously, equality uses `Object.is`, and object and array updates are handled by reference. If you update immutably, the result stays predictable.

The core does not hide scheduling. There is no batching, debouncing, or transactions inside the core. That complexity belongs in plugins and higher layers.

The kernel stays dependency-free, and `persist`, `freeze`, `immer`, and `sync` are all optional plugins. Framework adapters also live in separate packages, so the core stays clean.

Predictable semantics make code easier for both people and AI to write correctly. Read more on the [Philosophy](https://zhuangtai.yojigen.cn/en/philosophy/) page.

## Highlights

- Zero third-party runtime dependencies in the core.
- Tiny core, see the bundle size badge above.
- Synchronous, predictable semantics.
- TypeScript first.
- Bilingual documentation.
- llms.txt support.

## When to use ZhuàngTài

Best for:

- Small state with predictable synchronous semantics.
- A framework-agnostic core.
- Zero dependencies.
- Composable plugins.

Not for:

- Cases that need built-in batching, async scheduling, or transactions.
- Libraries that should hide scheduling details inside the core.

## Set up with AI

Paste this prompt into any AI coding agent, such as Claude Code, Codex, Cursor, or OpenCode:

```text
Read https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md and follow its steps to install and configure ZhuàngTài in this project.
```

To install our Agent Skills, run:

```bash
npx skills add zhuangtai-js/ZhuangTai
```

That installs our Agent Skills into Claude Code, Codex, OpenCode, Cursor, and 70+ agents. To install a single skill, use:

```bash
npx skills add zhuangtai-js/ZhuangTai --skill zhuangtai
```

## Packages

- `@zhuangtai-js/core`: the zero-runtime-dependency state core.
- `@zhuangtai-js/persist`: persistence plugin for atoms created with `createAtom()`.
- `@zhuangtai-js/react`: React adapter with hooks for atoms and computeds.
- `@zhuangtai-js/freeze`: development-time deep-freeze plugin that guards against accidental mutation of state internals.
- `@zhuangtai-js/immer`: Immer plugin for writing immutable updates by "mutating a draft".
- `@zhuangtai-js/sync`: cross-context sync plugin that syncs atom state across tabs through `BroadcastChannel`.

### Current compatibility

Extension packages declare only verified peer versions. The current release lines target core 0.5.x; because minor releases in the 0.x range may contain breaking changes, the peer ranges do not automatically accept a future core 0.6.0.

| Package release line | `@zhuangtai-js/core` | Other peers |
| --- | --- | --- |
| `@zhuangtai-js/freeze@0.2.x` | `^0.5.0` | — |
| `@zhuangtai-js/immer@0.2.x` | `^0.5.0` | — (Immer is a regular dependency) |
| `@zhuangtai-js/persist@0.3.x` | `^0.5.0` | — |
| `@zhuangtai-js/react@0.2.x` | `^0.5.0` | React `>=18 <20` |
| `@zhuangtai-js/sync@0.2.x` | `^0.5.0` | — |

## Core API

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});

double.get();
double.watch((value, prevValue) => {});
```

## API at a glance

| Export | TypeScript shape | Meaning |
| --- | --- | --- |
| `atom` | `atom(initialValue: RejectFunctionValue<Value>): Atom<Value>` | Creates an atom whose initial value is immediately readable and writable. |
| `computed` | `computed(derive: () => Value): Computed<Value>` | Auto-tracks synchronous dependencies and derives a value from them. |
| `createAtom` | `createAtom(): AtomCreator` | Creates an atom creator that can be extended by plugins. |
| `.use` | `use(plugin: AtomCreatorPlugin<Name, Options, PluginKind>): AtomCreator<OptionsByPlugin & { readonly [Key in Name]: Options }, PluginKind extends "default" ? Kind : PluginKind>` | Installs a plugin on the creator and returns a creator that accepts that plugin's per-atom options. |
| `get()` | `get(): Value` | Reads the current value. |
| `set()` | `set(nextValue: NextValue<Value>): void` | Writes a new value or updater and applies it immediately. |
| `watch()` | `watch(watcher: Watcher<Value>): () => void` | Subscribes to changes and returns an unsubscribe function. |

`@zhuangtai-js/core` intentionally has no third-party runtime dependencies. Framework adapters live in separate packages.

Core semantics: `set` applies immediately, `watch` callbacks run synchronously, equality uses `Object.is`, object and array updates are reference-based, and throwing watchers are isolated from each other. See the [`@zhuangtai-js/core` README](../../packages/core/README.md) for the full semantics list.

## Persistence

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

`@zhuangtai-js/persist` uses synchronous Web Storage-compatible storage. Pass a `storage` option explicitly, or it falls back to `globalThis.localStorage` when available. Custom `storage` objects need to implement `getItem`, `setItem`, and `removeItem`. Updates persist first: only after a successful storage write is the in-memory state committed and watchers notified; if encode or the write fails, the in-memory state stays unchanged. Its default JSON codec supports JSON-serializable values; use a custom codec for values such as `undefined`, functions, or symbols.

## Freeze

```ts
import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";

const atom = createAtom().use(freeze);

const user = atom({ name: "Yuan" });

user.get().name = "Renamed"; // Throws during development: the object is frozen.
user.set((prev) => ({ ...prev, name: "Renamed" })); // The correct immutable update.
```

`@zhuangtai-js/freeze` deep-freezes every value during development. Core detects changes by reference equality, so mutating state internals in place is silently ignored; this plugin makes such accidental mutations throw immediately. It defaults to a no-op when `NODE_ENV === "production"`, and can be toggled explicitly with the `enabled` option.

## Immer

```ts
import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";

const atom = createAtom().use(immer);

const todos = atom([{ text: "a", done: false }]);

// Directly "mutate the draft"; Immer produces a new reference before committing.
todos.set((draft) => {
  draft[0].done = true;
  draft.push({ text: "b", done: false });
});
```

`@zhuangtai-js/immer` runs updater functions through Immer's `produce`, letting you write immutable updates by directly "mutating a draft"; actual changes produce a new reference, while no-op recipes may reuse the previous reference. Concrete values passed directly bypass Immer and behave exactly as in core.

## Sync

```ts
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(sync);

const theme = atom("light", {
  sync: {
    key: "theme",
  },
});

theme.set("dark"); // The same-named atom in other tabs updates to "dark" too.
```

`@zhuangtai-js/sync` synchronizes atom state across same-origin tabs, windows, or workers through `BroadcastChannel`: local updates broadcast after they commit, and incoming broadcasts write straight to the underlying state without re-broadcasting, avoiding echo loops. Pass a custom `channel` and `codec` if needed; under SSR or a runtime without `BroadcastChannel`, it silently degrades to a plain atom, and the default channel never blocks process exit on Node.

If this project helps you, a ⭐ on GitHub is appreciated: https://github.com/zhuangtai-js/ZhuangTai

## AI friendly

- Bilingual docs site.
- llms.txt endpoints: [main entry](https://zhuangtai.yojigen.cn/llms.txt), [full context](https://zhuangtai.yojigen.cn/llms-full.txt), [light context](https://zhuangtai.yojigen.cn/llms-small.txt).
- Agent Skills live in the `skills/` directory and can be installed with `npx skills`.
- MCP server: planned.

Read more on the [AI](https://zhuangtai.yojigen.cn/en/ai/) page.

## License

ZhuàngTài is released under the [ISC License](../../LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
