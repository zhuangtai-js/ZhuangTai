# @zhuangtai-js/svelte

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的 Svelte 适配器。

`@zhuangtai-js/svelte` 把 `@zhuangtai-js/core` 的 atom 和 computed 转换为标准 Svelte store。它直接桥接 core 的同步 `watch` 与 Svelte store contract，不引入调度、批处理或 runes。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/svelte svelte
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
```

`@zhuangtai-js/core` 和 `svelte` 都是 peer dependency。支持 core `^0.5.0`，以及 Svelte 4.2 及以上版本和 Svelte 5。

## 使用

```svelte
<script lang="ts">
  import { atom, computed } from "@zhuangtai-js/core";
  import { toReadable, toWritable } from "@zhuangtai-js/svelte";

  const countAtom = atom(0);
  const count = toWritable(countAtom);
  const double = toReadable(computed(() => countAtom.get() * 2));
</script>

<button on:click={() => count.update((value) => value + 1)}>
  {$count} × 2 = {$double}
</button>
```

转换后的对象是普通 Svelte store，可以用于 `$store` 自动订阅，也可以传给 `derived`、`get`、`readonly` 等 `svelte/store` API。

## API

### `toReadable(source)`

将 core 的 `ReadableAtom<Value>`（可写 atom 或 computed）转换为 Svelte `Readable<Value>`。

```ts
import { computed } from "@zhuangtai-js/core";
import { toReadable } from "@zhuangtai-js/svelte";

const double = toReadable(computed(() => countAtom.get() * 2));
```

### `toWritable(source)`

将 core 的可写 `Atom<Value>` 转换为 Svelte `Writable<Value>`。

```ts
import { atom } from "@zhuangtai-js/core";
import { toWritable } from "@zhuangtai-js/svelte";

const countAtom = atom(0);
const count = toWritable(countAtom);

count.set(1);
count.update((value) => value + 1);
```

`set` 接收具体值并直接调用 core `set`。`update` 将 updater 交给 core `set`，因此 updater 总是接收执行时的最新值。

## 语义

- `subscribe` 只通过 core 的 `watch` 订阅。由于 `watch` 会同步发送当前值，subscriber 会在订阅时同步且仅同步运行一次。
- 初始 subscriber 运行前不会调用 invalidator；后续每次通知都会先调用可选 invalidator，再调用 subscriber。
- `subscribe` 返回 core `watch` 提供的 stopper；调用后立即停止后续通知。
- 所有通知与写入都保持同步，不添加调度、延迟、批处理或事务。
- adapter 不自行比较值。相等性完全由 core 的 `Object.is` 决定；对象和数组仍按引用判断，应使用不可变更新。
- adapter 不捕获或替换 core 与 subscriber 抛出的错误，错误传播语义保持不变。
- adapter 不使用 runes，也不创建跨 atom 的共享状态。

## 许可证

`@zhuangtai-js/svelte` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

<a id="english"></a>

# @zhuangtai-js/svelte

Svelte adapter for ZhuàngTài atoms.

`@zhuangtai-js/svelte` converts `@zhuangtai-js/core` atoms and computeds into standard Svelte stores. It bridges core's synchronous `watch` directly to the Svelte store contract, without adding scheduling, batching, or runes.

## Install

```sh
npm install @zhuangtai-js/core @zhuangtai-js/svelte svelte
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
```

Both `@zhuangtai-js/core` and `svelte` are peer dependencies. Core `^0.5.0` and Svelte 4.2+ and 5 are supported.

## Usage

```svelte
<script lang="ts">
  import { atom, computed } from "@zhuangtai-js/core";
  import { toReadable, toWritable } from "@zhuangtai-js/svelte";

  const countAtom = atom(0);
  const count = toWritable(countAtom);
  const double = toReadable(computed(() => countAtom.get() * 2));
</script>

<button on:click={() => count.update((value) => value + 1)}>
  {$count} × 2 = {$double}
</button>
```

The converted objects are ordinary Svelte stores. They work with `$store` auto-subscriptions and can be passed to `derived`, `get`, `readonly`, and other `svelte/store` APIs.

## API

### `toReadable(source)`

Converts a core `ReadableAtom<Value>` (a writable atom or a computed) into a Svelte `Readable<Value>`.

```ts
import { computed } from "@zhuangtai-js/core";
import { toReadable } from "@zhuangtai-js/svelte";

const double = toReadable(computed(() => countAtom.get() * 2));
```

### `toWritable(source)`

Converts a writable core `Atom<Value>` into a Svelte `Writable<Value>`.

```ts
import { atom } from "@zhuangtai-js/core";
import { toWritable } from "@zhuangtai-js/svelte";

const countAtom = atom(0);
const count = toWritable(countAtom);

count.set(1);
count.update((value) => value + 1);
```

`set` accepts a concrete value and calls core `set` directly. `update` passes its updater to core `set`, so the updater always receives the latest value at execution time.

## Semantics

- `subscribe` subscribes only through core `watch`. Because `watch` synchronously emits the current value, the subscriber runs synchronously exactly once during subscription.
- The invalidator is not called before the initial subscriber run. Every later notification calls the optional invalidator before the subscriber.
- `subscribe` returns the stopper provided by core `watch`; calling it immediately stops later notifications.
- All notifications and writes remain synchronous. No scheduling, deferring, batching, or transactions are added.
- The adapter performs no value comparison. Equality is entirely core's `Object.is`; objects and arrays remain reference-based and should be updated immutably.
- The adapter does not catch or replace errors thrown by core or subscribers, preserving their propagation semantics.
- The adapter uses no runes and creates no shared state across atoms.

## License

`@zhuangtai-js/svelte` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
