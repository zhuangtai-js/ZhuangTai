# @zhuangtai-js/core

简单、直接的 JavaScript 状态原语。

`@zhuangtai-js/core` 是 ZhuàngTài 的框架无关核心。它没有第三方运行时依赖，也不会隐藏调度行为。

## 安装

```sh
pnpm add @zhuangtai-js/core
```

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

## 语义

- `set` 立即生效。
- `watch` 回调同步执行。
- 相等性使用 `Object.is`。
- 对象和数组更新按引用比较；请使用不可变更新。
- 不支持把函数作为 atom 值：`set(fn)` 会把 `fn` 当作 updater。定义 atom 时传入函数类型会产生类型错误；如需存储函数，请包一层对象，例如 `atom({ fn })`。
- watcher 回调相互隔离：某个 watcher 抛错不会中断本轮通知，其余 watcher 仍会收到本次更新。全部通知完成后，若只有一个错误则原样抛出；多个错误会包进 `AggregateError` 抛出。
- 在通知期间新增的 watcher 会立即以 `(currentValue, undefined)` 触发一次，但不会加入本轮正在进行的广播快照。
- 初始 `watch` 回调的 `prevValue` 是 `undefined` 哨兵值。对 `Atom<T | undefined>` 而言，无法据此区分“首次通知”与“上一个值恰好是 `undefined`”。
- 同一个 atom 正在通知 watcher 时，再次 `set()` 该 atom 会抛错。watcher 可以更新其他 atom，但应避免 atom 之间形成循环。
- `computed(...)` 创建时会计算初始值。它只会在有 watcher 时订阅来源，`get()` 会基于当前来源值重新计算。
- `computed(...)` 会从 derive 内部实际调用的 `.get()` 自动发现依赖。订阅集合来自真实读取结果，所以不会出现声明的来源和实际读取的来源不一致。
- 条件分支下的依赖会自动切换。`computed(() => flag.get() ? a.get() : b.get())` 这类写法会在 `flag` 翻转时自动退订旧分支并订阅新分支。
- 跟踪只会发生在同步的 derive 里。`await` 之后或 `setTimeout` 里的读取不会被追踪，derive 应该保持同步。
- 嵌套 computed 会隔离依赖。外层在 `inner.get()` 上只依赖 `inner` 本身，不会把 inner 内部的源状态透传到外层。
- 多来源 `computed` 是同步快照，而非事务一致：逐个更新多个来源、或在 watcher 中更新其他来源时，可能观察到中间的组合值。需要保持一致的值请放进同一个 atom。
- `computed` 用 `Object.is` 比较来源值与派生结果。若 derive 每次都返回新的对象或数组，会被判定为已变化并可能重复通知；需要抑制通知时请返回引用稳定的值。

## Creator 插件

当你需要一个可被插件扩展的 atom creator 时，使用 `createAtom()`。默认的 `atom()` 导出保持未扩展状态，只接收初始值。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const count = atom(0, {
  persist: {
    key: "count",
  },
});
```

插件安装在 creator 上，而不是安装在 atom 实例上。在同一个 creator 链上重复安装相同的 plugin ID 会同步抛出 `TypeError`。

## 许可证

`@zhuangtai-js/core` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

# @zhuangtai-js/core

Simple, direct state primitives for JavaScript.

`@zhuangtai-js/core` is the framework-agnostic core of ZhuàngTài. It has no third-party runtime dependencies and no hidden scheduling.

## Install

```sh
pnpm add @zhuangtai-js/core
```

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

## Semantics

- `set` applies immediately.
- `watch` callbacks run synchronously.
- Equality uses `Object.is`.
- Object and array updates are reference-based; use immutable updates.
- Function values are not supported as atom values: `set(fn)` treats `fn` as an updater, and passing a function type when defining an atom is a type error. To store a function, wrap it in an object, e.g. `atom({ fn })`.
- Watcher callbacks are isolated: a throwing watcher does not interrupt the current round of notifications, and the remaining watchers still receive the update. After every watcher has run, a single error is rethrown as-is, and multiple errors are rethrown wrapped in an `AggregateError`.
- A watcher added during notification is immediately invoked once with `(currentValue, undefined)`, but it does not join the broadcast snapshot currently in progress.
- The `prevValue` of the initial `watch` callback is an `undefined` sentinel. For an `Atom<T | undefined>` this cannot be used to distinguish the first notification from a previous value that happened to be `undefined`.
- Calling `set()` on an atom while that same atom is notifying watchers throws. Watchers may update other atoms, but avoid cycles between atoms.
- `computed(...)` calculates its initial value when it is created. It subscribes to sources only while it has watchers, and `get()` recalculates from the current source values.
- `computed(...)` auto-discovers dependencies from the `.get()` calls actually made inside the derive. The subscription set comes from real reads, so the declared sources can never disagree with the sources actually read.
- Dependencies under conditional branches switch automatically. A derive like `computed(() => flag.get() ? a.get() : b.get())` unsubscribes from the old branch and subscribes to the new one when `flag` flips.
- Tracking only happens inside the synchronous derive. Reads after an `await` or inside `setTimeout` are not tracked; keep the derive synchronous.
- Nested computeds isolate dependencies. Through `inner.get()` the outer computed depends only on `inner` itself; inner source states are not passed through to the outer computed.
- A multi-source `computed` is a synchronous snapshot, not a transactional consistency boundary: updating several sources one by one, or updating other sources from within a watcher, can expose intermediate combinations. Keep tightly coupled values in the same atom.
- `computed` compares source values and derived results with `Object.is`. If the derive returns a new object or array every time, it is treated as changed and may notify repeatedly; return a reference-stable value when you need to suppress notifications.

## Creator plugins

Use `createAtom()` when you want an atom creator that can be extended by plugins. The default `atom()` export stays unextended and takes only the initial value.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const count = atom(0, {
  persist: {
    key: "count",
  },
});
```

Plugins are installed on creators, not atom instances. Installing the same plugin ID more than once on a creator chain throws a synchronous `TypeError`.

## License

`@zhuangtai-js/core` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
