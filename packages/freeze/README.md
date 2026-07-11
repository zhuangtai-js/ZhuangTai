# @zhuangtai-js/freeze

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的开发期深冻结插件。

`@zhuangtai-js/freeze` 扩展来自 `@zhuangtai-js/core` 的 atom creator。core 使用引用相等（`Object.is`）判断变化，因此如果你直接改动状态对象的内部字段，`set` 会认为“没有变化”而静默不通知 watcher。这个插件在开发期对每个值执行深冻结，让这类误改立即抛错，把隐藏的 bug 暴露在最早的位置。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/freeze
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/freeze
```

## 使用

```ts
import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";

const atom = createAtom().use(freeze);

const user = atom({ name: "阿元", tags: ["a"] });

user.get().name = "改名"; // 开发期抛错：对象已被冻结

// 正确做法是用不可变更新替换引用。
user.set((prev) => ({ ...prev, name: "改名" }));
```

## 生产门控

默认情况下，插件只在非生产环境冻结。当 `NODE_ENV === "production"` 时，它不会执行深冻结，也不会为 atom 的 `set` 增加冻结包装。你也可以用 `enabled` 选项显式控制：

```ts
const atom = createAtom().use(freeze);

const state = atom(
  { count: 0 },
  {
    freeze: {
      enabled: true, // 强制开启，忽略 NODE_ENV
    },
  },
);
```

## 语义

- 初始值在 atom 创建前被深冻结（冻结的是同一个引用，不是副本）。
- 每次 `set` 的值在提交给底层状态前被深冻结；updater 函数的返回值也会被冻结。
- 深冻结会递归冻结对象、数组和函数的自有属性，并对循环引用安全终止。
- 已冻结的值会被跳过，不重复处理。
- 关闭冻结时（生产环境或 `enabled: false`），atom 行为与未使用插件完全一致。
- 冻结基于 `Object.freeze`，只在严格模式下对写入抛错；非严格模式下写入会被静默忽略，这是 JavaScript 的固有行为。

## 许可证

`@zhuangtai-js/freeze` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

<a id="english"></a>

# @zhuangtai-js/freeze

Development-time deep-freeze plugin for ZhuàngTài atoms.

`@zhuangtai-js/freeze` extends atom creators from `@zhuangtai-js/core`. Core detects changes by reference equality (`Object.is`), so if you mutate the internals of a state object in place, `set` treats it as "no change" and silently skips notifying watchers. This plugin deep-freezes every value during development so that such accidental mutations throw immediately, surfacing hidden bugs at the earliest point.

## Install

```sh
npm install @zhuangtai-js/core @zhuangtai-js/freeze
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/freeze
```

## Usage

```ts
import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";

const atom = createAtom().use(freeze);

const user = atom({ name: "Yuan", tags: ["a"] });

user.get().name = "Renamed"; // Throws during development: the object is frozen.

// The correct approach is an immutable update that replaces the reference.
user.set((prev) => ({ ...prev, name: "Renamed" }));
```

## Production gating

By default the plugin freezes only outside production. When `NODE_ENV === "production"`, it skips deep freezing and adds no freeze wrapper to the atom's `set`. You can also control it explicitly with the `enabled` option:

```ts
const atom = createAtom().use(freeze);

const state = atom(
  { count: 0 },
  {
    freeze: {
      enabled: true, // Force on, ignoring NODE_ENV.
    },
  },
);
```

## Semantics

- The initial value is deep-frozen before the atom is created (the same reference is frozen, not a copy).
- Every `set` value is deep-frozen before being committed to the underlying state; the return value of an updater function is frozen too.
- Deep freezing recursively freezes the own properties of objects, arrays, and functions, and terminates safely on cyclic references.
- Already-frozen values are skipped and not reprocessed.
- When freezing is disabled (in production or with `enabled: false`), the atom behaves exactly as if the plugin were not used.
- Freezing relies on `Object.freeze`, which only throws on writes in strict mode; in non-strict mode writes are silently ignored, which is inherent JavaScript behavior.

## License

`@zhuangtai-js/freeze` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
