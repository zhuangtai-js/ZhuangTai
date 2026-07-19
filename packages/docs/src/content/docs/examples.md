---
title: 完整示例
sidebar:
  label: 完整示例
  order: 4
description: 从可复制的网站片段和真实存在的 Vite 工程开始，把 ZhuàngTài 用进真实界面。
---

如果你想先感受 API，不必克隆仓库：打开[在线示例](/playground/)，直接操作实际页面里的计数器、任务清单和持久化偏好设置。

## 可复制的网站示例

[在线示例](/playground/) 是文档站中真实运行的 React 页面，包含三个可以直接参考和复制的场景：

- **计数器**：用 `atom` 保存值，用 `computed` 派生双倍值。
- **任务清单**：用不可变的新数组和新对象完成添加、完成、筛选和删除。
- **偏好设置**：用 `persist` 保存主题和内容密度，并展示浏览器 storage 不可用时的降级行为。

下面的代码片段可以直接复制到对应项目中。

### Vanilla JavaScript

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
pnpm add @zhuangtai-js/core
```

### React

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
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

## 可运行的 Vite 工程

下表项目都通过 `package.json` 中的 `dev` / `build` 脚本运行。`vite-vanilla` 没有独立的 `vite.config` 文件，直接使用 Vite 默认配置；`vite-react` 使用仓库中的配置文件：

| 工程         | workspace package                    | 启动命令                                               | 源码                                                                                                 |
| ------------ | ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Vite Vanilla | `@zhuangtai-js/example-vite-vanilla` | `pnpm --filter @zhuangtai-js/example-vite-vanilla dev` | [`examples/vite-vanilla`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-vanilla) |
| Vite React   | `@zhuangtai-js/example-vite-react`   | `pnpm --filter @zhuangtai-js/example-vite-react dev`   | [`examples/vite-react`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-react)     |

## 框架快速开始

- [React 快速指南](/guides/react/)
- [Preact 快速指南](/guides/preact/)
- [Vue 快速指南](/guides/vue/)
- [Svelte 快速指南](/guides/svelte/)
- [Solid 快速指南](/guides/solid/)
- [React Native / Expo 快速指南](/guides/react-native-expo/)

## 下一步

- 想直接点击和输入：前往[在线示例](/playground/)。
- 想系统了解某个框架：从上面的 quick start 进入对应指南。
- 想确认目标环境与注意事项：查看[集成与兼容性](/integrations/)。
