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

默认 codec 使用 `JSON.stringify` 和 `JSON.parse`。默认 codec 只支持 `JSON.stringify` 返回字符串的值；`undefined`、函数和 symbol 会在 encode 时抛错，而不是发送到 channel。需要不同的传输表示时，请传入自定义 codec。

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
- 更新会先在本地同步提交（与 core 一致），提交成功后再把具体值广播给其他上下文。
- 收到远端广播时，会 decode 后直接写入底层状态，不会再次广播（防止回环）。
- `Object.is` 判定为无变化的更新不会广播。
- 收到的广播直接写入底层状态，因此会跳过其他包裹在 `sync` 之上的插件的 `set` 逻辑。
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

Values are encoded with `JSON.stringify` and decoded with `JSON.parse` by default. The default codec only supports values that `JSON.stringify` returns as a string; `undefined`, functions, and symbols throw during encode instead of being sent to the channel. Pass a custom codec when your transport representation needs different behavior.

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
- Updates commit locally and synchronously first (matching core), and only after a successful commit is the concrete value broadcast to other contexts.
- Incoming broadcasts are decoded and written straight to the underlying state; they are not re-broadcast (this prevents echo loops).
- `Object.is` no-op updates are not broadcast.
- Because received broadcasts write straight to the underlying state, they bypass the `set` logic of any other plugin wrapped above `sync`.
- SSR or runtimes without `BroadcastChannel` silently degrade to a plain atom.
- The default `BroadcastChannel` is unref'ed on runtimes that support it (such as Node), so a synced atom never blocks process exit; sync keeps working for the lifetime of the process. An explicitly passed `channel` is managed by the caller.
- `BroadcastChannel` only works across same-origin contexts; it does not cross devices and does not persist. Combine with `@zhuangtai-js/persist` when you need persistence.
- Async channels are not supported.

## License

`@zhuangtai-js/sync` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
