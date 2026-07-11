# @zhuangtai-js/sync

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的跨上下文同步插件。

`@zhuangtai-js/sync` 扩展来自 `@zhuangtai-js/core` 的 atom creator。它通过 `BroadcastChannel` 在同源的多个标签页、窗口或 worker 之间同步 atom 状态：本地更新提交后广播出去，收到远端广播时直接写入底层状态而不再二次广播，从而避免回环。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/sync
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/sync
```

## 使用

```ts
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(sync);

const theme = atom("light", {
  sync: {
    key: "theme",
  },
});

theme.get();
theme.set("dark"); // 其他标签页里的同名 atom 也会更新为 "dark"。
```

## Channel

同步默认使用按 `key` 命名的 `BroadcastChannel`。自定义 `channel` 需要实现 `postMessage` 和 `addEventListener("message", ...)`，与 `BroadcastChannel` 的同名方法保持一致。

```ts
const channel = new BroadcastChannel("count");

const count = atom(0, {
  sync: {
    key: "count",
    channel,
  },
});
```

如果省略 `channel`，插件会使用 `new BroadcastChannel(key)`。在 SSR 或不支持 `BroadcastChannel` 的运行时中，atom 会静默降级为普通 atom，不进行同步，也不会报错。

## Codec

默认 codec 使用 `JSON.stringify` 和 `JSON.parse`，并在 encode 前做 fail-fast 校验：

- `NaN`、`±Infinity` 以及嵌套中的非有限数字会同步抛错，而不会静默变成 `null` 再广播。
- 无效 `Date`（`getTime()` 非有限）会同步抛错，而不会静默变成 `null` 再广播。
- 顶层 `undefined`、函数和 symbol 会在 encode 时抛错，而不是发送到 channel。

需要不同的传输表示时，请传入自定义 codec。

```ts
const count = atom(0, {
  sync: {
    key: "count",
    codec: {
      encode: (value) => String(value),
      decode: (rawValue) => Number(rawValue),
    },
  },
});
```

## 语义

- 省略 `sync` 选项时，atom 保持不变。
- 本地更新会先 encode，成功后再同步提交内存（与 core 一致）并广播已编码的载荷；encode 失败时内存不变、不广播。
- 收到远端广播时，会 decode 后直接写入底层状态，不会再次广播（防止回环）。
- 远端 decode 失败（坏 JSON、自定义 codec 抛错等）会被隔离：不更新本地状态、不抛出到事件回调外，并 `console.error` 一条带包名前缀的诊断信息。
- `Object.is` 判定为无变化的更新不会广播。
- 默认 JSON codec 拒绝非有限数字和无效 `Date`，避免 JSON 把它们静默变成 `null`。
- 收到的广播直接写入底层状态，因此会跳过其他包裹在 `sync` 之上的插件的 `set` 逻辑。推荐 `createAtom().use(persist).use(sync)`，让远端写入仍经过内层 `persist`。
- SSR 或没有 `BroadcastChannel` 的运行时会静默降级为普通 atom。
- 默认创建的 `BroadcastChannel` 在 Node 等支持 `unref` 的运行时中不会阻止进程退出；进程存活期间同步照常工作。显式传入的 `channel` 由调用方自行管理。
- `BroadcastChannel` 只在同源上下文间工作，不跨设备、不做持久化；需要持久化请搭配 `@zhuangtai-js/persist`。
- 不支持异步 channel。

## 许可证

`@zhuangtai-js/sync` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

<a id="english"></a>

# @zhuangtai-js/sync

Cross-context sync plugin for ZhuàngTài atoms.

`@zhuangtai-js/sync` extends atom creators from `@zhuangtai-js/core`. It synchronizes atom state across same-origin tabs, windows, or workers through `BroadcastChannel`: local updates broadcast after they commit, and incoming broadcasts write straight to the underlying state without re-broadcasting, avoiding echo loops.

## Install

```sh
npm install @zhuangtai-js/core @zhuangtai-js/sync
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/sync
```

## Usage

```ts
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(sync);

const theme = atom("light", {
  sync: {
    key: "theme",
  },
});

theme.get();
theme.set("dark"); // The same-named atom in other tabs updates to "dark" too.
```

## Channel

Synchronization uses a `BroadcastChannel` named after `key` by default. Custom `channel` objects need to implement `postMessage` and `addEventListener("message", ...)`, matching the methods of the same name on `BroadcastChannel`.

```ts
const channel = new BroadcastChannel("count");

const count = atom(0, {
  sync: {
    key: "count",
    channel,
  },
});
```

If `channel` is omitted, the plugin uses `new BroadcastChannel(key)`. Under SSR or a runtime without `BroadcastChannel`, the atom silently degrades to a plain atom with no sync and no error.

## Codec

Values are encoded with `JSON.stringify` and decoded with `JSON.parse` by default, with fail-fast checks before encode:

- `NaN`, `±Infinity`, and nested non-finite numbers throw synchronously instead of being silently turned into `null` and broadcast.
- Invalid `Date` values (`getTime()` is non-finite) throw synchronously instead of being silently turned into `null` and broadcast.
- Top-level `undefined`, functions, and symbols throw during encode instead of being sent to the channel.

Pass a custom codec when your transport representation needs different behavior.

```ts
const count = atom(0, {
  sync: {
    key: "count",
    codec: {
      encode: (value) => String(value),
      decode: (rawValue) => Number(rawValue),
    },
  },
});
```

## Semantics

- Omitting `sync` options leaves the atom unchanged.
- Local updates encode first; only after a successful encode does the value commit locally (synchronously, matching core) and get broadcast as the already-encoded payload. If encode fails, memory stays unchanged and nothing is broadcast.
- Incoming broadcasts are decoded and written straight to the underlying state; they are not re-broadcast (this prevents echo loops).
- Remote decode failures (bad JSON, custom codec errors, etc.) are isolated: local state is unchanged, the error does not escape the message handler, and a package-prefixed diagnostic is written with `console.error`.
- `Object.is` no-op updates are not broadcast.
- The default JSON codec rejects non-finite numbers and invalid `Date` values so JSON cannot silently turn them into `null`.
- Because received broadcasts write straight to the underlying state, they bypass the `set` logic of any other plugin wrapped above `sync`. Prefer `createAtom().use(persist).use(sync)` so remote writes still flow through inner `persist`.
- SSR or runtimes without `BroadcastChannel` silently degrade to a plain atom.
- The default `BroadcastChannel` is unref'ed on runtimes that support it (such as Node), so a synced atom never blocks process exit; sync keeps working for the lifetime of the process. An explicitly passed `channel` is managed by the caller.
- `BroadcastChannel` only works across same-origin contexts; it does not cross devices and does not persist. Combine with `@zhuangtai-js/persist` when you need persistence.
- Async channels are not supported.

## License

`@zhuangtai-js/sync` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
