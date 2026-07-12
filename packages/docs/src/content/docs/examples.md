---
title: 完整示例
sidebar:
  label: 完整示例
  order: 4
description: 从 Vanilla JavaScript 或 React 示例开始，把 ZhuàngTài 用进真实界面。
---

如果你想先感受 API，不必克隆仓库：打开[在线示例](/playground/)，直接操作计数器、任务清单和可持久化偏好设置。

## Vanilla JavaScript

适合先理解 Core 的最小模型：`atom` 保存状态，`computed` 派生状态，`watch` 同步响应变化。

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const doubled = computed(() => count.get() * 2);

count.watch((value) => {
  console.log(value, doubled.get());
});

count.set((value) => value + 1);
```

安装 Core：

```sh
npm install @zhuangtai-js/core
```

完整的 Vite Vanilla 工程源码位于 [`examples/vite-vanilla`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-vanilla)。

## React

React adapter 让 atom 保持在组件外部，同时提供接近 `useState` 的组件体验。

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";

const count = atom(0);
const doubled = computed(() => count.get() * 2);

export function Counter() {
  const [value, setValue] = useAtom(count);
  const doubledValue = useAtomValue(doubled);

  return (
    <button onClick={() => setValue((current) => current + 1)}>
      {value} · doubled {doubledValue}
    </button>
  );
}
```

安装 React 所需包：

```sh
npm install @zhuangtai-js/core @zhuangtai-js/react
```

完整的 Vite React 工程源码位于 [`examples/vite-react`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-react)。

## 下一步

- 想直接点击和输入：前往[在线示例](/playground/)。
- 想系统了解 React hooks：阅读 [React 用法](/guides/react/)。
- 想确认目标环境与注意事项：查看[集成与兼容性](/integrations/)。
