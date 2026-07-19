---
title: 在 React Native / Expo 中使用
description: 在 React Native 或 Expo 中直接使用 ZhuàngTài，并用通用异步 storage 持久化偏好。
---

Core 和 `@zhuangtai-js/react` 可以直接用于 React Native / Expo。你不需要 Provider，也不需要 React Native 专用 adapter：状态仍然由 Core atom 管理，组件只通过 React hook 订阅；UI 使用 React Native 的 `View`、`Text` 和 `Pressable`。

`@zhuangtai-js/react` 的兼容范围是 React peer `>=18 <20`。这是 React peer compatibility 的说明，不是对每一种 React Native、Expo 或其他 native renderer 都做了独立测试的声明。本文展示的是 React Native / Expo 的使用路径，而不是对所有 native renderer 的覆盖承诺。

## 安装

在已有的 Expo 或 React Native 项目中安装 Core、React adapter 和持久化插件：

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react @zhuangtai-js/persist
```

如果需要把偏好保存到原生设备，再由应用消费者安装 AsyncStorage：

```sh
npx expo install @react-native-async-storage/async-storage
```

`@react-native-async-storage/async-storage` 是消费者自己的依赖，不是 ZhuàngTài 的依赖。ZhuàngTài 只要求传入一个结构上满足 `getItem`、`setItem` 和 `removeItem` 的 storage；不需要安装或配置 ZhuàngTài 专用的 RN storage 包。

## 1. 从内存计数器开始

下面的完整示例只使用内存状态。`computed` 会从同一个 atom 派生双倍值，`View`、`Text` 和 `Pressable` 都是 React Native 组件；没有 Provider，也没有 React Native adapter。

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";
import { Pressable, Text, View } from "react-native";

const countAtom = atom(0);
const doubledCountAtom = computed(() => countAtom.get() * 2);

export function CounterScreen() {
  const [count, setCount] = useAtom(countAtom);
  const doubledCount = useAtomValue(doubledCountAtom);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Text>Double: {doubledCount}</Text>
      <Pressable onPress={() => setCount((value) => value + 1)}>
        <Text>Increase</Text>
      </Pressable>
      <Pressable onPress={() => setCount(0)}>
        <Text>Reset</Text>
      </Pressable>
    </View>
  );
}
```

Core 的 `set` 立即更新，`watch` 同步运行；React 只负责让订阅当前 atom 的组件重新渲染。对象和数组仍然按引用比较，更新它们时请返回新的对象或数组。

## 2. 用 AsyncStorage 持久化偏好

AsyncStorage 由应用消费者安装和导入，然后直接作为同一个 `persist` 插件的 `storage` 传入。这里没有专用 adapter，也没有把 AsyncStorage 加进 `@zhuangtai-js/persist` 的运行时依赖。

```tsx
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { computed, createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";

type Preferences = {
  theme: "light" | "dark";
  notifications: boolean;
};

const initialPreferences: Preferences = {
  theme: "light",
  notifications: true,
};

const createPersistedAtom = createAtom().use(persist);
const preferencesAtom = createPersistedAtom<Preferences>(initialPreferences, {
  persist: {
    key: "zhuangtai/preferences",
    storage: AsyncStorage,
    onError: (error) => {
      console.warn("[preferences persistence]", error);
    },
  },
});
const themeAtom = computed(() => preferencesAtom.get().theme);

export function PreferencesScreen() {
  const [preferences, setPreferences] = useAtom(preferencesAtom);
  const theme = useAtomValue(themeAtom);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void persist.ready(preferencesAtom).then(
      () => {
        if (active) {
          setHydrated(true);
          setMessage("Preferences restored.");
        }
      },
      (cause: unknown) => {
        if (active) {
          setHydrated(true);
          setError(String(cause));
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  async function flushBeforeLeaving() {
    try {
      await persist.flush(preferencesAtom);
      setMessage("Preferences flushed.");
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function reloadFromStorage() {
    try {
      await persist.rehydrate(preferencesAtom);
      setMessage("Preferences rehydrated.");
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function clearStoredPreferences() {
    try {
      await persist.clear(preferencesAtom);
      setMessage("Stored preferences cleared; the current in-memory value is unchanged.");
    } catch (cause) {
      setError(String(cause));
    }
  }

  return (
    <View>
      {!hydrated ? <Text>Loading saved preferences…</Text> : null}
      <Text>Theme: {theme}</Text>
      <Text>Notifications: {preferences.notifications ? "on" : "off"}</Text>
      <Pressable
        disabled={!hydrated}
        onPress={() =>
          setPreferences((current) => ({
            ...current,
            theme: current.theme === "light" ? "dark" : "light",
          }))
        }>
        <Text>Toggle theme</Text>
      </Pressable>
      <Pressable
        disabled={!hydrated}
        onPress={() =>
          setPreferences((current) => ({
            ...current,
            notifications: !current.notifications,
          }))
        }>
        <Text>Toggle notifications</Text>
      </Pressable>
      <Pressable onPress={flushBeforeLeaving}>
        <Text>Flush before leaving</Text>
      </Pressable>
      <Pressable onPress={reloadFromStorage}>
        <Text>Rehydrate</Text>
      </Pressable>
      <Pressable onPress={clearStoredPreferences}>
        <Text>Clear stored value</Text>
      </Pressable>
      {message ? <Text>{message}</Text> : null}
      {error ? <Text>Persistence error: {error}</Text> : null}
    </View>
  );
}
```

### 启动时的 loading UI

异步 `getItem` 还没有完成时，atom 已经用 `initialPreferences` 创建，所以首屏可以稳定地显示默认偏好。示例用 `persist.ready(preferencesAtom)` 结束 loading 状态；你也可以在应用启动边界等待它，再渲染依赖已恢复数据的页面。若 hydration 失败，保留可用的内存值，同时把错误交给日志、错误提示或重试 UI。

## 异步 persistence 的语义

### initialValue 先于 hydration

当 storage 的 `getItem` 返回 Promise 时，`createPersistedAtom(initialValue, ...)` 会立即返回 atom，并先暴露 `initialValue`。异步读取完成后才会尝试恢复存储值；`persist.ready(atom)` 等待当前 hydration 完成。不要在创建 atom 后假设第一次 `get()` 已经是设备上的值。

### 本地更新赢过迟到的读取

如果 hydration 还在进行时用户已经调用 `set`，这个本地 revision 会优先。迟到的旧 storage 值不会覆盖用户刚写入的内存值，插件会把最新本地值写回 storage。这让启动阶段可以安全地接受用户操作，但依然建议在 UI 上用 loading 状态标记“恢复中”。

### 写入按调用顺序排队

`set` 和 watcher 仍然同步；异步 `setItem` 不会让 Core 变成异步 API。每次写入会按 `set` 的逻辑顺序排队，即使某次写入失败，后续写入也会继续执行。失败会被保留，之后通过 `onError` 报告，并由 `persist.flush(atom)` 暴露给调用方。

### 生命周期控制

| 方法                      | 用途                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `persist.ready(atom)`     | 等待最新一代 hydration；读取、迁移或迁移写回失败时会 reject。                           |
| `persist.flush(atom)`     | 等待 hydration、controller 操作和排队写入；如果有保留的写入失败，会 reject 第一个失败。 |
| `persist.rehydrate(atom)` | 开始新一代读取；旧一代迟到的结果不会覆盖新一代或本地更新。                              |
| `persist.clear(atom)`     | 等待 hydration 和排队写入后调用 `removeItem`；不会重置内存中的 atom 值。                |

把 `ready` 放在启动/loading 边界，把 `flush` 放在离开页面、切后台或需要确认写入完成的边界；用户主动刷新时调用 `rehydrate`，需要删除持久化 key 时调用 `clear`。对这些返回 Promise 的控制方法都应使用 `try/catch`，而不是让 rejected Promise 变成未处理错误。

### 推荐的 onError 边界

把 `onError` 用于日志、遥测或统一错误上报，并在 `ready`、`flush`、`rehydrate`、`clear` 的调用处捕获 Promise。异步写入失败不应静默吞掉；如果应用允许用户继续使用内存状态，可以显示“仅本次会话”的提示，并提供重试或重新加载操作。

## 什么时候同步 storage 更合适

如果运行时已经有可靠的同步 storage，而且你希望 atom 在创建期间就完成恢复、避免启动 loading 边界，同步 storage 更简单。浏览器中的 `localStorage`、测试中的内存 Map 或一个明确的同步持久化实现都适合这种场景。React Native / Expo 的原生持久化通常是异步的，因此 AsyncStorage 路径应把 hydration 当作明确的启动生命周期，而不是偷偷加入 Core 的调度。

## 下一步

- 阅读 [Core 概念](/guides/core-concepts/) ，理解 `atom`、`computed`、同步 `set` 和 `watch`。
- 阅读 [React 参考](/reference/react/) ，查看 `useAtom`、`useAtomValue` 和 setter-only hook。
- 阅读 [Persist 参考](/reference/persist/) ，查看 storage 契约、迁移和 controller 的完整 API。
- 返回 [框架适配器对比](/guides/framework-adapters/) ，比较不同 UI 框架的使用边界。
