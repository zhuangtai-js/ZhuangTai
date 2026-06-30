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
const double = computed(count, (value) => value * 2);

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
- 函数值与 React state setter 有相同歧义：`set(fn)` 会把 `fn` 当作 updater。如果要存储函数值，请包一层：`set(() => fn)`。
- `computed(...)` 创建时会计算初始值。它只会在有 watcher 时订阅来源，`get()` 会基于当前来源值重新计算。
- 同一个 atom 正在通知 watcher 时，再次 `set()` 该 atom 会抛错。watcher 可以更新其他 atom，但应避免 atom 之间形成循环。

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

插件安装在 creator 上，而不是安装在 atom 实例上。重复安装同一个插件会返回行为相同的 creator。

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
const double = computed(count, (value) => value * 2);

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
- Function values follow the same ambiguity as React state setters: `set(fn)` treats `fn` as an updater. To store a function value, wrap it: `set(() => fn)`.
- `computed(...)` calculates its initial value when it is created. It subscribes to sources only while it has watchers, and `get()` recalculates from the current source values.
- Calling `set()` on an atom while that same atom is notifying watchers throws. Watchers may update other atoms, but avoid cycles between atoms.

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

Plugins are installed on creators, not atom instances. Installing the same plugin more than once returns a creator with the same behavior.

## License

`@zhuangtai-js/core` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
