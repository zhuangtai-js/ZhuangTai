---
title: 为什么是 ZhuàngTài
sidebar:
  label: 为什么是 ZhuàngTài
  order: 2
description: 了解 ZhuàngTài 如何用直接、同步、类型安全的状态原语降低理解和使用成本。
---

ZhuàngTài 提供**面向 JavaScript 库和应用的可预测状态原语**。它关心的是让状态代码保持直接：API 少而清楚，数据流按源码顺序发生，扩展能力按需组合。

## 一眼能读懂的数据流

```ts
const count = atom(0);

count.watch((value, prevValue) => {
  console.log(prevValue, value);
});

count.set(1);
```

这段代码的顺序就是运行顺序：`watch` 注册时立即执行；`set` 立即生效；回调同步完成；相等判断使用 `Object.is`。Core 不隐藏更新时机，也不引入隐式调度。

## 四个核心价值

1. **直接的 `get / set / watch`**：无需依赖框架生命周期，也适合 SDK、Web Components、编辑器、播放器和 Canvas 工具。
2. **自动派生状态**：`computed` 追踪本次求值实际读取的依赖，只在派生值变化时通知。
3. **TypeScript 优先**：公开 API 保持精确推导，让类型系统承担可以静态确认的约束。
4. **按需组合能力**：React、Persist、Sync、Immer 和 Freeze 都位于独立包中，Core 保持零第三方运行时依赖。

## 从可运行示例开始

先在[在线示例](/playground/)中直接操作真实 React 组件，再阅读[核心概念](/guides/core-concepts/)和[集成与兼容性](/integrations/)。
