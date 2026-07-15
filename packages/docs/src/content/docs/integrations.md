---
title: 集成与兼容性
sidebar:
  label: 集成与兼容性
  order: 6
description: 了解 ZhuàngTài Core、官方框架 adapter、peer 范围与 SSR 边界。
---

`@zhuangtai-js/core` 不依赖 UI 框架。普通 JavaScript、SDK、服务器模块与共享数据层可以直接使用 Core；组件需要框架原生订阅和自动清理时，再在 UI 边界添加 adapter。

## 环境与推荐入口

| 环境                      | 推荐入口               | 说明                                                      |
| ------------------------- | ---------------------- | --------------------------------------------------------- |
| Vanilla ESM / Node.js ESM | `@zhuangtai-js/core`   | 直接使用 `atom`、`computed`、`get`、`set`、`watch`        |
| React                     | `@zhuangtai-js/react`  | `useAtomValue`、`useSetAtom`、`useAtom` 与绑定 hook       |
| Preact                    | `@zhuangtai-js/preact` | Preact hooks 与 `preact/compat` 的 `useSyncExternalStore` |
| Svelte                    | `@zhuangtai-js/svelte` | `toReadable`、`toWritable` 标准 `svelte/store` 对象       |
| Vue                       | `@zhuangtai-js/vue`    | 只读 `ComputedRef`、setter 与 effect-scope cleanup        |
| Solid                     | `@zhuangtai-js/solid`  | `Accessor`、setter、客户端 owner cleanup 与 SSR snapshot  |
| CommonJS 项目             | 通过 ESM 引入          | 发布包采用 ESM-only 格式，请使用 `import`                 |

完整生命周期与 SSR 用法见[框架适配器最佳实践](/guides/framework-adapters/)。

## 当前兼容矩阵

下面的发布线与 peer 范围直接对应各 package manifest。0.x 包不会自动接受未声明的未来 Core minor 或框架 major。

| 包发布线                      | `@zhuangtai-js/core` | 其他 peer                    |
| ----------------------------- | -------------------- | ---------------------------- |
| `@zhuangtai-js/freeze@0.2.x`  | `^0.5.0`             | —                            |
| `@zhuangtai-js/immer@0.2.x`   | `^0.5.0`             | —（Immer 是普通 dependency） |
| `@zhuangtai-js/persist@0.5.x` | `^0.5.0`             | —                            |
| `@zhuangtai-js/preact@0.1.x`  | `^0.5.0`             | Preact `>=10.9 <11`          |
| `@zhuangtai-js/react@0.2.x`   | `^0.5.0`             | React `>=18 <20`             |
| `@zhuangtai-js/solid@0.1.x`   | `^0.5.0`             | Solid `>=1.5 <2`             |
| `@zhuangtai-js/svelte@0.1.x`  | `^0.5.0`             | Svelte `>=4.2 <6`            |
| `@zhuangtai-js/sync@0.2.x`    | `^0.5.0`             | —                            |
| `@zhuangtai-js/vue@0.1.x`     | `^0.5.0`             | Vue `>=3.2 <4`               |

Core 当前发布线是 `@zhuangtai-js/core@0.5.x`。插件与 adapter 的版本相互独立，不需要保持相同版本号。

## SSR 与请求隔离

所有服务端渲染环境都需要先决定 atom 属于哪个生命周期：

- 请求或用户相关的可变 atom 必须按请求创建，不能共享服务器 module-level 实例。
- 客户端 hydration 初始值应与服务端输出一致。
- Preact SSR 读取 snapshot，不建立 Core 订阅。
- Svelte adapter 使用标准 store contract；状态隔离取决于底层 atom 的创建位置。
- Vue SSR 的 `renderToString` 路径只读取 `atom.get()` snapshot，不安装 Core watcher；只有客户端活动 effect scope 中的读取 API 才订阅，并由 scope cleanup 释放。
- Solid 标准 SSR 通过公开 `isServer` 信号只读取 snapshot，不要求 owner，也不建立 Core watcher；客户端订阅才绑定到 owner，手动客户端 root 必须显式 dispose。
- `@zhuangtai-js/persist` 默认访问 `localStorage`。服务端应传入明确的同步 storage，或只在客户端创建持久化 atom。

订阅 cleanup 与状态隔离是两件事：自动取消 watcher 不能阻止一个 module-level atom 在请求之间共享值。

## Core 与 adapter 的边界

状态模型可以放在框架无关模块中，并在不同 UI 边界包装成不同 adapter。Core 的 `Object.is`、同步 `watch` 与引用语义不会因框架而改变；对象和数组仍应使用不可变更新。

如果代码不需要模板、组件重渲染或框架自动清理，就直接使用 Core，避免无意义的响应式包装。
