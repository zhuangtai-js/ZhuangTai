---
title: 选择适合你的状态模型
sidebar:
  label: 状态模型对比
  order: 5
description: 诚实比较 ZhuàngTài、Zustand 与 Jotai 的模型、能力和适用场景。
---

这不是“谁在所有维度都更好”的排行榜。三个库优化的模型不同，正确选择取决于你的约束。

| 关注点     | ZhuàngTài                         | Zustand           | Jotai                                    |
| ---------- | --------------------------------- | ----------------- | ---------------------------------------- |
| 基础模型   | `get / set / watch` 状态原语      | store + selector  | atom 图                                  |
| 默认订阅   | 注册时立即执行，提供新旧值        | 默认不立即执行    | 默认不立即执行，回调内再 `get`           |
| 派生状态   | 同步 `computed`，自动追踪实际读取 | 通常使用 selector | 成熟的 derived atom，支持 async/writable |
| 调度语义   | Core 无隐藏调度                   | 直接 store 更新   | atom store 协调依赖更新                  |
| React      | 独立 adapter，React 18/19         | 成熟的一体化体验  | 成熟的一体化体验与 Suspense 生态         |
| 持久化失败 | 先写后提交，写失败内存不变        | 内存通常已更新    | 内存通常已更新                           |

## 体积和微基准不是 ZhuàngTài 的优势叙事

固定版本、相同 esbuild 配置的当前测量中，Zustand 的最小入口比 ZhuàngTài 更小，基础更新微基准也更快。ZhuàngTài 明显小于该 Jotai 最小场景，并在该同步数字更新微基准中开销更低，但这不是应用性能结论。

因此我们不会宣传“比 Zustand 更小”或“比 Zustand 更快”。ZhuàngTài 的差异是可预测的同步契约、动态 `computed`、明确错误语义，以及 Persist 的先写后提交边界。完整数据、固定版本和复现命令见[基准测试](/benchmarks/)。

## 快速选择

- 你在构建 SDK、库、Web Component、编辑器、播放器或 Canvas 工具，希望状态不依赖 UI 框架：选择 ZhuàngTài。
- 你需要成熟的 store/selector 模型、middleware 与生态集成：选择 Zustand。
- 你需要异步派生、Suspense、可写 derived atom 或丰富 utilities：选择 Jotai。
- 你只是在做局部组件状态：先使用框架自带状态，未必需要任何外部库。
