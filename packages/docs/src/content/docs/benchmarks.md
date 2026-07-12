---
title: 可复现基准
sidebar:
  label: 可复现基准
  order: 7
description: 查看 ZhuàngTài、Zustand 与 Jotai 的固定版本测量、方法和限制。
---

最后一次提交结果生成于 **2026-07-12**，环境为 Node.js 24.16.0、darwin-arm64。版本固定为 `@zhuangtai-js/core@0.5.0`、`@zhuangtai-js/react@0.2.0`、`zustand@5.0.14`、`jotai@2.20.1` 和 `esbuild@0.25.11`。

## Bundle size

相同 esbuild 配置：browser ESM、minify、React external，单位为 gzip 字节。

| 入口            | ZhuàngTài | Zustand |   Jotai |
| --------------- | --------: | ------: | ------: |
| Vanilla 基础    |     638 B |   256 B | 2,984 B |
| React 最小      |     793 B |   391 B | 4,081 B |
| 派生 / selector |   1,427 B |   382 B | 2,996 B |

结论是 `Zustand < ZhuàngTài << Jotai`。ZhuàngTài 不能宣传“比 Zustand 更小”。

## 100,000 次基础更新

一个数字状态、一个订阅者、3 次预热、9 次采样、5 个独立进程。下表是每个进程采样中位数的范围：

| 库        |        时间范围 |
| --------- | --------------: |
| Zustand   |   1.18～1.25 ms |
| ZhuàngTài |   1.61～1.67 ms |
| Jotai     | 36.46～37.71 ms |

这只能说明该机器、版本和场景下的同步原语开销，不能推导真实应用渲染性能。ZhuàngTài 不能宣传“比 Zustand 更快”。

## Persist 写入失败

场景：内存初始值为 `0`，调用持久化更新为 `1`，storage 的 `setItem` 抛出 `disk full`。

| 库                      | 最终内存值 |
| ----------------------- | ---------: |
| ZhuàngTài Persist       |          0 |
| Zustand Persist         |          1 |
| Jotai `atomWithStorage` |          1 |

ZhuàngTài 的差异是 **commit-after-write**：先完成编码与存储写入，再提交内存。这是强一致性的取舍，不表示其他库的策略错误。

## 复现

```sh
pnpm install
pnpm build
pnpm --filter @zhuangtai-js/benchmarks benchmark
```

程序和最新 JSON 位于仓库的 [`benchmarks/`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/benchmarks)。CI 只验证程序可运行和结果结构，不使用性能阈值阻塞提交。
