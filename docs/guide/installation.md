# 安装 ZhuàngTài

<p align="center">简体中文 · <a href="#english">English</a></p>

这份说明帮助使用者和 AI 代理按项目框架选择最小安装集合。先安装 `@zhuangtai-js/core`，只有在需要框架生命周期或插件能力时再添加对应包。

## 给使用者

### 选择需要的包

| 包                      | 用途                                 | 安装命令                                                   |
| ----------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `@zhuangtai-js/core`    | 框架无关状态核心，零第三方运行时依赖 | `pnpm add @zhuangtai-js/core`                              |
| `@zhuangtai-js/react`   | React hooks adapter                  | `pnpm add @zhuangtai-js/core @zhuangtai-js/react react`    |
| React Native / Expo     | 使用 `@zhuangtai-js/react`           | `pnpm add @zhuangtai-js/core @zhuangtai-js/react react`    |
| `@zhuangtai-js/preact`  | Preact hooks adapter                 | `pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact`  |
| `@zhuangtai-js/svelte`  | 标准 Svelte store adapter            | `pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte`  |
| `@zhuangtai-js/vue`     | Vue computed ref adapter             | `pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue`        |
| `@zhuangtai-js/solid`   | Solid accessor adapter               | `pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js` |
| `@zhuangtai-js/persist` | 同步或异步 storage 持久化与版本迁移  | `pnpm add @zhuangtai-js/core @zhuangtai-js/persist`        |
| `@zhuangtai-js/freeze`  | 开发期深冻结                         | `pnpm add @zhuangtai-js/core @zhuangtai-js/freeze`         |
| `@zhuangtai-js/immer`   | Immer 草稿更新                       | `pnpm add @zhuangtai-js/core @zhuangtai-js/immer`          |
| `@zhuangtai-js/sync`    | `BroadcastChannel` 跨同源上下文同步  | `pnpm add @zhuangtai-js/core @zhuangtai-js/sync`           |

把 `pnpm` 换成项目已经使用的包管理器。框架 peer 范围是：React `>=18 <20`、Preact `>=10.9 <11`、Svelte `>=4.2 <6`、Vue `>=3.2 <4`、Solid `>=1.5 <2`；这些 adapter 都要求 `@zhuangtai-js/core ^0.5.0`。

### 框架快速开始

- [React 快速指南](https://zhuangtai.yojigen.cn/guides/react/)
- [Preact 快速指南](https://zhuangtai.yojigen.cn/guides/preact/)
- [Vue 快速指南](https://zhuangtai.yojigen.cn/guides/vue/)
- [Svelte 快速指南](https://zhuangtai.yojigen.cn/guides/svelte/)
- [Solid 快速指南](https://zhuangtai.yojigen.cn/guides/solid/)
- [React Native / Expo 快速指南](https://zhuangtai.yojigen.cn/guides/react-native-expo/)（Expo 使用 `@zhuangtai-js/react`）

React Native / Expo 应用可以单独安装自己的 storage 实现，例如 AsyncStorage；它只是消费者依赖，不是 ZhuàngTài 包。

需要选择框架 API、处理组件生命周期或 SSR 时，阅读[框架适配器最佳实践](https://zhuangtai.yojigen.cn/guides/framework-adapters/)；需要版本化持久化时，阅读[Persist 参考](https://zhuangtai.yojigen.cn/reference/persist/)。

### 交给 AI 代理

可以先安装仓库附带的 Agent Skills：

```sh
npx skills add zhuangtai-js/ZhuangTai
```

然后把这段提示交给代理：

```text
请阅读 https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md，识别当前项目使用的包管理器与框架，只安装需要的 ZhuàngTài Core、adapter 或插件，并遵守文档中的生命周期、SSR 与不可变更新边界。
```

## 给 AI 代理

1. **识别项目。** 从 lockfile 识别 `pnpm`、npm、Yarn 或 Bun；从依赖、源码扩展名和框架配置识别 React、Preact、Svelte、Vue、Solid、React Native / Expo 或无框架项目。不要仅凭 `.tsx` 区分 React 与 Preact。
2. **选择最小安装集合。** 无框架代码只安装 Core。只有组件需要原生订阅生命周期时才安装 adapter；只有明确需要持久化、冻结、Immer 更新或跨上下文同步时才安装插件。安装 adapter 时同时安装表格中的框架 peer。
3. **使用准确 API。** Core 使用 `atom`、`computed`、`get`、`set`、`watch` 与 `createAtom`。框架 API 如下：
   - React：`useAtomValue`、`useSetAtom`、`useAtom`、`createAtomHook`、`createComputedHook`。
   - Preact：`useAtomValue`、`useSetAtom`、`useAtom`、`createAtomHook`、`createComputedHook`。
   - Svelte：`toReadable`、`toWritable`，返回标准 `svelte/store` 对象。
   - Vue：`useAtomValue`、`useSetAtom`、`useAtom`；读取 API 必须位于活动 effect scope。
   - Solid：`createAtomValue`、`createSetAtom`、`createAtomSignal`；读取 API 必须位于活动 owner。
4. **保留 Core 语义。** `set` 立即生效，`watch` 同步执行，相等性使用 `Object.is`。对象和数组按引用判断，必须用不可变更新。adapter 不添加调度、批处理、延迟或事务。
5. **处理生命周期与 SSR。** 让框架管理订阅清理；手动调用 Svelte `subscribe` 时保留并调用取消函数，手动创建 Vue effect scope 或 Solid root 时负责停止或 dispose。服务端可变 atom 必须按请求创建，不能跨用户共享 module-level 实例。Preact SSR 读取 snapshot 而不订阅；Vue 在 `createSSRApp` 的 `setup()` 中创建的订阅会在 `renderToString` 完成时随组件 scope 自动释放。持久化在浏览器默认使用 `localStorage`，也接受返回 `PromiseLike` 的 storage；服务端应传入合适的 storage，或只在客户端创建持久化 atom。
6. **配置插件。** 插件安装在 `createAtom().use(plugin)` 创建的 creator 上。Persist 的 `version` 必须是正安全整数；`migrations[n]` 同步执行从版本 `n` 到 `n + 1` 的迁移。迁移回调输入来自 storage，始终是 `unknown`，必须先解析或收窄；`definePersistMigration<Value>` 的 `Value` 只约束返回值。
7. **检查项目。** 运行项目已有的格式化、类型检查和测试命令，确认导入路径、peer 依赖和示例代码符合当前框架。
8. **提供后续资料。** 人类文档位于 https://zhuangtai.yojigen.cn ，机器可读入口是 https://zhuangtai.yojigen.cn/llms.txt 和 https://zhuangtai.yojigen.cn/llms-full.txt 。

## 说明

- `@zhuangtai-js/core` 没有第三方运行时依赖。
- 所有插件都必须挂载到 `createAtom()` 创建的 creator。
- `@zhuangtai-js/persist` 支持同步或通用异步 storage；迁移回调保持同步并按版本顺序执行。
- 在框架生命周期之外的服务、SDK、事件处理器或服务器逻辑中，如果不需要框架响应式包装，直接使用 Core。

---

<a id="english"></a>

# Install ZhuàngTài

This guide helps people and AI agents choose the smallest installation for the project framework. Install `@zhuangtai-js/core` first, then add an adapter or plugin only when framework lifecycle integration or an extra capability is needed.

## For people

### Choose the packages you need

| Package                 | Purpose                                                                  | Install command                                            |
| ----------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `@zhuangtai-js/core`    | Framework-agnostic state core with zero third-party runtime dependencies | `pnpm add @zhuangtai-js/core`                              |
| `@zhuangtai-js/react`   | React hooks adapter                                                      | `pnpm add @zhuangtai-js/core @zhuangtai-js/react react`    |
| React Native / Expo     | Uses `@zhuangtai-js/react`                                             | `pnpm add @zhuangtai-js/core @zhuangtai-js/react react`    |
| `@zhuangtai-js/preact`  | Preact hooks adapter                                                     | `pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact`  |
| `@zhuangtai-js/svelte`  | Standard Svelte store adapter                                            | `pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte`  |
| `@zhuangtai-js/vue`     | Vue computed-ref adapter                                                 | `pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue`        |
| `@zhuangtai-js/solid`   | Solid accessor adapter                                                   | `pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js` |
| `@zhuangtai-js/persist` | Sync or async storage persistence and version migration                   | `pnpm add @zhuangtai-js/core @zhuangtai-js/persist`        |
| `@zhuangtai-js/freeze`  | Development-time deep freeze                                             | `pnpm add @zhuangtai-js/core @zhuangtai-js/freeze`         |
| `@zhuangtai-js/immer`   | Immer draft updates                                                      | `pnpm add @zhuangtai-js/core @zhuangtai-js/immer`          |
| `@zhuangtai-js/sync`    | Cross-context sync through `BroadcastChannel`                            | `pnpm add @zhuangtai-js/core @zhuangtai-js/sync`           |

Replace `pnpm` with the package manager already used by the project. Framework peer ranges are React `>=18 <20`, Preact `>=10.9 <11`, Svelte `>=4.2 <6`, Vue `>=3.2 <4`, and Solid `>=1.5 <2`; each adapter also requires `@zhuangtai-js/core ^0.5.0`.

### Framework quick starts

- [React Quick Start](https://zhuangtai.yojigen.cn/en/guides/react/)
- [Preact Quick Start](https://zhuangtai.yojigen.cn/en/guides/preact/)
- [Vue Quick Start](https://zhuangtai.yojigen.cn/en/guides/vue/)
- [Svelte Quick Start](https://zhuangtai.yojigen.cn/en/guides/svelte/)
- [Solid Quick Start](https://zhuangtai.yojigen.cn/en/guides/solid/)
- [React Native / Expo Quick Start](https://zhuangtai.yojigen.cn/en/guides/react-native-expo/) (Expo uses `@zhuangtai-js/react`)

A React Native / Expo app may install its own storage implementation, such as AsyncStorage, separately; it is a consumer dependency, not a ZhuàngTài package.

For framework API selection, component lifecycle, and SSR, read [Framework Adapter Best Practices](https://zhuangtai.yojigen.cn/en/guides/framework-adapters/). For versioned persistence, read the [Persist reference](https://zhuangtai.yojigen.cn/en/reference/persist/).

### Hand the setup to an AI agent

You can first install the repository's Agent Skills:

```sh
npx skills add zhuangtai-js/ZhuangTai
```

Then give the agent this prompt:

```text
Please read https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md, detect the current project's package manager and framework, install only the required ZhuàngTài Core, adapter, or plugins, and follow the documented lifecycle, SSR, and immutable-update boundaries.
```

## For AI agents

1. **Detect the project.** Detect pnpm, npm, Yarn, or Bun from lockfiles. Detect React, Preact, Svelte, Vue, Solid, React Native / Expo, or a framework-free project from dependencies, source extensions, and framework configuration. Do not use `.tsx` alone to distinguish React from Preact.
2. **Choose the smallest installation.** Install only Core for framework-free code. Add an adapter only when components need native subscription lifecycle integration. Add persistence, freeze, Immer, or sync only when that capability is requested. Install the framework peer shown in the table with every adapter.
3. **Use the exact API.** Core provides `atom`, `computed`, `get`, `set`, `watch`, and `createAtom`. Framework APIs are:
   - React: `useAtomValue`, `useSetAtom`, `useAtom`, `createAtomHook`, and `createComputedHook`.
   - Preact: `useAtomValue`, `useSetAtom`, `useAtom`, `createAtomHook`, and `createComputedHook`.
   - Svelte: `toReadable` and `toWritable`, which return standard `svelte/store` objects.
   - Vue: `useAtomValue`, `useSetAtom`, and `useAtom`; read APIs require an active effect scope.
   - Solid: `createAtomValue`, `createSetAtom`, and `createAtomSignal`; read APIs require an active owner.
4. **Preserve Core semantics.** `set` applies immediately, `watch` runs synchronously, and equality uses `Object.is`. Objects and arrays are reference-based and require immutable updates. Adapters add no scheduling, batching, deferring, or transactions.
5. **Handle lifecycle and SSR.** Let the framework own subscription cleanup. Keep and call the unsubscribe function for manual Svelte `subscribe` calls; stop manually created Vue effect scopes and dispose manually created Solid roots. Create mutable server atoms per request instead of sharing module-level instances across users. Preact SSR reads a snapshot without subscribing. Vue subscriptions created inside `createSSRApp` `setup()` are automatically released with the component scope when `renderToString` completes. Persist uses browser `localStorage` by default and also accepts storage methods that return `PromiseLike` values; on the server, pass suitable storage or create the persisted atom only on the client.
6. **Configure plugins.** Install plugins on a creator made with `createAtom().use(plugin)`. Persist `version` must be a positive safe integer. `migrations[n]` synchronously migrates version `n` to `n + 1`. Migration callback input comes from storage and is always `unknown`, so parse or narrow it first; `definePersistMigration<Value>` uses `Value` only to constrain the return value.
7. **Check the project.** Run the project's existing formatter, typecheck, and test commands, and confirm imports, peer dependencies, and examples match the current framework.
8. **Provide follow-up context.** Human documentation is at https://zhuangtai.yojigen.cn . Machine-readable entrypoints are https://zhuangtai.yojigen.cn/llms.txt and https://zhuangtai.yojigen.cn/llms-full.txt .

## Notes

- `@zhuangtai-js/core` has zero third-party runtime dependencies.
- Every plugin must be attached to a creator made with `createAtom()`.
- `@zhuangtai-js/persist` supports synchronous or generic asynchronous storage; migration callbacks remain synchronous and run in version order.
- In services, SDKs, event handlers, or server logic outside framework lifecycle, use Core directly when no framework-reactive wrapper is needed.
