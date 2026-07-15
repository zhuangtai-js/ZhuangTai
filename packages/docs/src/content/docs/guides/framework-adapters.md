---
title: 选择框架适配器
description: 用一页选择 React、Preact、Vue、Svelte 或 Solid 的 ZhuàngTài adapter，并快速进入对应指南。
---

如果组件需要框架原生订阅、响应式读取和生命周期清理，就选择对应的 ZhuàngTài adapter；否则直接使用 `@zhuangtai-js/core`。

## 先选安装目标

- **直接使用 Core**：状态位于 SDK、数据层、命令、事件处理器或服务端模块，不需要框架渲染生命周期。
- **使用 framework adapter**：组件需要在 atom 变化时更新，并让框架负责订阅和清理。
- **保持同一状态模型**：把 `atom` 和 `computed` 放在框架无关的 state module，只在 UI 边界接入 adapter。

所有 adapter 都要求 `@zhuangtai-js/core ^0.5.0`。adapter 不增加批处理、延迟、事务或新的相等性判断；Core 的 `set` 立即生效，`watch` 同步执行，相等性使用 `Object.is`。

## 共同原则

### 读写权限按组件职责选择

- **只读**：展示派生值时使用 read-only API，例如 `useAtomValue`、`toReadable` 或 `createAtomValue`。
- **只写**：命令按钮只需要 setter 时使用 setter-only API，避免建立不必要的订阅。
- **读写**：表单或计数器同时需要当前值和更新函数时使用 read-write API。

### 对象和数组使用不可变更新

Core 按引用判断对象和数组。不要原地修改再传回同一个引用；使用对象展开、新数组或 `map` 返回新值：

```ts
counterAtom.set((state) => ({
  ...state,
  history: [...state.history, state.count + 1],
}));
```

### 让框架管理生命周期

使用组件、hook、store、effect scope 或 owner 提供的清理边界。手动订阅时保存取消函数；手动创建 Vue `effectScope()` 或 Solid `createRoot()` 时，在边界结束调用 `scope.stop()` 或 `dispose()`。SSR 为每个请求创建独立的可变 atom/store，不要共享服务器 module scope 状态。

## 框架卡片

### React

使用 `@zhuangtai-js/react` 的 `useAtomValue`、`useSetAtom` 和 `useAtom`；它通过 React 的 `useSyncExternalStore` 对接 Core。先看 [React 快速指南](/guides/react/)，再查 [React 参考](/reference/react/)。

### Preact

使用 `@zhuangtai-js/preact` 的原生 hooks 和 `preact/compat` snapshot bridge。先看 [Preact 快速指南](/guides/preact/)，再查 [Preact 参考](/reference/preact/)。

### Vue

使用 `@zhuangtai-js/vue` 的 `useAtomValue`、`useSetAtom` 和 `useAtom`；读取 API 在 `setup()` 或活动 effect scope 中运行。先看 [Vue 快速指南](/guides/vue/)，再查 [Vue 参考](/reference/vue/)。

### Svelte

使用 `@zhuangtai-js/svelte` 的 `toReadable` 和 `toWritable` 转为标准 `svelte/store`。先看 [Svelte 快速指南](/guides/svelte/)，再查 [Svelte 参考](/reference/svelte/)。

### Solid

使用 `@zhuangtai-js/solid` 的 `createAtomValue`、`createSetAtom` 和 `createAtomSignal`；客户端读取 API 绑定当前 owner。先看 [Solid 快速指南](/guides/solid/)，再查 [Solid 参考](/reference/solid/)。

## 快速对比

| 框架   | package                | 只读              | 只写            | 读写               | 生命周期边界             |
| ------ | ---------------------- | ----------------- | --------------- | ------------------ | ------------------------ |
| React  | `@zhuangtai-js/react`  | `useAtomValue`    | `useSetAtom`    | `useAtom`          | React component          |
| Preact | `@zhuangtai-js/preact` | `useAtomValue`    | `useSetAtom`    | `useAtom`          | Preact component         |
| Vue    | `@zhuangtai-js/vue`    | `useAtomValue`    | `useSetAtom`    | `useAtom`          | effect scope / component |
| Svelte | `@zhuangtai-js/svelte` | `toReadable`      | `atom.set`      | `toWritable`       | store subscription       |
| Solid  | `@zhuangtai-js/solid`  | `createAtomValue` | `createSetAtom` | `createAtomSignal` | owner / `createRoot`     |

## 下一步

- 选择一个 [框架快速指南](/guides/react/)，复制最小 counter，再替换成自己的 state module。
- 回到 [Core 概念](/guides/core-concepts/) 了解同步 `get`、`set`、`watch` 和 `computed`。
- 需要 reload 后恢复状态时，阅读 [Persist 参考](/reference/persist/)。
