# @zhuangtai-js/vue

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的 Vue 3 适配器。

`@zhuangtai-js/vue` 把 `@zhuangtai-js/core` 的 atom 和 computed 暴露为 Vue 的只读 `ComputedRef`，同时保留 core 的同步更新、`Object.is` 相等性和引用语义。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/vue vue
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
```

`@zhuangtai-js/core` 和 `vue` 都是 peer dependency。支持 core `^0.5.0` 和 Vue `>=3.2 <4`。

## 使用

```vue
<script setup lang="ts">
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/vue";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

const [count, setCount] = useAtom(countAtom);
const double = useAtomValue(doubleAtom);
</script>

<template>
  <button @click="setCount((value) => value + 1)">{{ count }} × 2 = {{ double }}</button>
</template>
```

读取型 API 应在组件 `setup()`、`<script setup>`、`effectScope().run()` 或其他活动的 Vue effect scope 内调用。客户端 scope 停止或组件卸载时，adapter 会自动取消 core 订阅；Vue SSR 组件 setup 使用不创建订阅的只读路径。

## API

### `useAtomValue(source)`

读取 `ReadableAtom<Value>`（可写 atom 或 computed），返回只读 `ComputedRef<Value>`。客户端会订阅 core；Vue SSR 组件 setup 只读取当前值，不创建订阅。

```ts
import { effectScope } from "vue";
import { atom } from "@zhuangtai-js/core";
import { useAtomValue } from "@zhuangtai-js/vue";

const countAtom = atom(0);
const scope = effectScope();

scope.run(() => {
  const count = useAtomValue(countAtom);
  countAtom.set(1);
  console.log(count.value); // 1，同步可见
});

scope.stop(); // 自动取消订阅
```

如果没有活动的 effect scope，`useAtomValue` 会在客户端订阅前抛错。返回值是 getter-only computed ref，不是可写 ref。

### `useSetAtom(source)`

返回调用 core `set` 的 setter，不读取或订阅 atom，因此可以在 effect scope 外使用。

```ts
const setCount = useSetAtom(countAtom);

setCount(1);
setCount((value) => value + 1);
```

### `useAtom(source)`

返回只读 computed ref 与 setter 的 tuple。

```ts
const [count, setCount] = useAtom(countAtom);
```

它等价于同时调用 `useAtomValue(source)` 和 `useSetAtom(source)`，因此必须在活动的 effect scope 内调用。

## 语义

- 客户端 `useAtomValue` 先确认存在活动 scope，再读取并调用 core `watch`；订阅 stopper 通过 `onScopeDispose` 注册。Vue SSR 组件 setup 检测到 SSR context 后只调用 `atom.get()`，不调用 core `watch`。
- core `watch` 的初始回调会补齐读取与订阅之间的变化；后续通知会同步写入浅层快照。
- 返回值是只读 `ComputedRef`。adapter 不暴露可写 Vue ref，也不建立可能与 core 分叉的第二份可写状态。
- 浅层快照原样保存对象和数组，不创建深层响应式代理；`.value` 与 core 当前值保持相同引用。
- adapter 不额外比较值。相等性完全由 core 的 `Object.is` 决定，因此 `NaN` 不会重复通知，而 `0` 与 `-0` 是不同值。
- 对象和数组更新仍按引用判断，应使用不可变更新。
- adapter 不添加调度、延迟、批处理或事务，也不捕获或替换 core 与 watcher 抛出的错误。
- Vue 组件渲染仍遵循 Vue 自身的更新调度；这里的“同步”指 core 通知期间 computed ref 的 `.value` 已立即更新。

## SSR

在 `createSSRApp` 配合 `renderToString` 时，读取型 API 是 SSR 只读 API：adapter 读取 `atom.get()` 生成 computed ref，但不会创建 core 订阅。这样是刻意的安全边界，因为 Vue SSR renderer 在渲染完成后不会停止组件 effect scope；adapter 不会留下需要请求级手动清理的订阅。若在组件 setup 之外用手动 `effectScope()` 创建订阅，仍须由应用在请求结束时停止该 scope。应用也仍需自行保证请求之间的 atom 隔离。

## 许可证

`@zhuangtai-js/vue` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

<a id="english"></a>

# @zhuangtai-js/vue

Vue 3 adapter for ZhuàngTài atoms.

`@zhuangtai-js/vue` exposes `@zhuangtai-js/core` atoms and computeds as read-only Vue `ComputedRef` values while preserving core's synchronous updates, `Object.is` equality, and reference semantics.

## Install

```sh
npm install @zhuangtai-js/core @zhuangtai-js/vue vue
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
```

Both `@zhuangtai-js/core` and `vue` are peer dependencies. Core `^0.5.0` and Vue `>=3.2 <4` are supported.

## Usage

```vue
<script setup lang="ts">
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/vue";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

const [count, setCount] = useAtom(countAtom);
const double = useAtomValue(doubleAtom);
</script>

<template>
  <button @click="setCount((value) => value + 1)">{{ count }} × 2 = {{ double }}</button>
</template>
```

Call read APIs inside component `setup()`, `<script setup>`, `effectScope().run()`, or another active Vue effect scope. On the client, the adapter removes the core subscription when the scope stops or the component unmounts; Vue SSR component setup uses a read-only path that creates no subscription.

## API

### `useAtomValue(source)`

Reads a `ReadableAtom<Value>` (a writable atom or a computed) and returns a read-only `ComputedRef<Value>`. On the client it subscribes to core; in Vue SSR component setup it only reads the current value and creates no subscription.

```ts
import { effectScope } from "vue";
import { atom } from "@zhuangtai-js/core";
import { useAtomValue } from "@zhuangtai-js/vue";

const countAtom = atom(0);
const scope = effectScope();

scope.run(() => {
  const count = useAtomValue(countAtom);
  countAtom.set(1);
  console.log(count.value); // 1, visible synchronously
});

scope.stop(); // automatically unsubscribes
```

Without an active effect scope, `useAtomValue` throws before subscribing on the client. The return value is a getter-only computed ref, not a writable ref.

### `useSetAtom(source)`

Returns a setter that calls core `set` without reading or subscribing to the atom, so it can be used outside an effect scope.

```ts
const setCount = useSetAtom(countAtom);

setCount(1);
setCount((value) => value + 1);
```

### `useAtom(source)`

Returns a tuple containing a read-only computed ref and a setter.

```ts
const [count, setCount] = useAtom(countAtom);
```

It is equivalent to calling both `useAtomValue(source)` and `useSetAtom(source)`, so it must be called inside an active effect scope.

## Semantics

- On the client, `useAtomValue` confirms that an active scope exists before reading and calling core `watch`; the subscription stopper is registered with `onScopeDispose`. In Vue SSR component setup, it detects the SSR context and only calls `atom.get()`, never core `watch`.
- Core `watch`'s initial callback closes the read-to-subscribe gap; later notifications synchronously update the shallow snapshot.
- The return value is a read-only `ComputedRef`. The adapter exposes no writable Vue ref and creates no second writable state that could diverge from core.
- The shallow snapshot stores objects and arrays as-is without creating deep reactive proxies; `.value` retains the exact reference held by core.
- The adapter performs no additional value comparison. Equality is entirely core's `Object.is`, so `NaN` does not notify repeatedly while `0` and `-0` are distinct values.
- Object and array updates remain reference-based and should be immutable.
- The adapter adds no scheduling, deferring, batching, or transactions, and it does not catch or replace errors thrown by core or watchers.
- Vue component rendering still follows Vue's own update scheduler. “Synchronous” here means the computed ref's `.value` is already updated during the core notification.

## SSR

With `createSSRApp` and `renderToString`, read APIs are SSR read-only: the adapter reads `atom.get()` into a computed ref without creating a core subscription. This is deliberate because Vue's SSR renderer does not stop the component effect scope after rendering, so the adapter leaves no request-scoped subscription that needs manual cleanup. If an application creates a subscription in a manual `effectScope()` outside component setup, it must still stop that scope at the end of the request. Applications remain responsible for isolating atoms between requests.

## License

`@zhuangtai-js/vue` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
