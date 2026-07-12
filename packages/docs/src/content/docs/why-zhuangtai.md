---
title: 为什么是 ZhuàngTài
sidebar:
  label: 为什么是 ZhuàngTài
  order: 2
description: 了解 ZhuàngTài 的定位、差异与适用边界。
---

ZhuàngTài 是**面向 JavaScript 库和应用的可预测状态原语**。它不试图成为“更小的 Zustand”或“功能更多的 Jotai”，而是把同步、直接、可组合的状态行为做成一组容易推理的基础件。

## 它优化的不是 API 数量

```ts
const count = atom(0);

count.watch((value, prevValue) => {
  console.log(prevValue, value);
});

count.set(1);
```

这段代码的顺序就是运行顺序：`watch` 注册时立即执行；`set` 立即生效；回调同步完成；相等判断使用 `Object.is`。Core 没有隐藏 batching、transaction、debounce 或 scheduler。

## 四个值得选择它的理由

1. **直接的 `get / set / watch`**：无需依赖框架生命周期，也适合 SDK、Web Components、编辑器、播放器和 Canvas 工具。
2. **同步派生图**：`computed` 自动追踪实际读取的依赖，派生值未变化时不通知。
3. **显式错误语义**：watcher 会全部执行后再汇总抛错；错误不会悄悄改变调用顺序。
4. **持久化提交边界**：Persist 先写存储，成功后才提交内存；失败时内存不会领先于存储。

## 什么时候不应该选择它

- 需要成熟的 selector 中间件生态、Redux DevTools 工作流或大量现成 Zustand 集成时，优先评估 Zustand。
- 需要异步派生 atom、Suspense、可写派生状态或丰富 utilities 时，优先评估 Jotai。
- 需要 Vue、Svelte、Solid 或 React Native 的官方 adapter 时，请先查看[集成与兼容性](/integrations/)；不要把“Core 可能可用”当成“官方支持”。

继续查看[状态模型对比](/compare/)和[可复现基准](/benchmarks/)，了解证据和限制。
