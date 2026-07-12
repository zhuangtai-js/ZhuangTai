---
title: Reproducible Benchmarks
sidebar:
  label: Reproducible Benchmarks
  order: 7
description: Review pinned-version measurements, methods, and limitations for ZhuàngTài, Zustand, and Jotai.
---

The latest committed result was generated on **2026-07-12** with Node.js 24.16.0 on darwin-arm64. Versions are pinned to `@zhuangtai-js/core@0.5.0`, `@zhuangtai-js/react@0.2.0`, `zustand@5.0.14`, `jotai@2.20.1`, and `esbuild@0.25.11`.

## Bundle size

Same esbuild configuration: browser ESM, minified, React external. Values are gzip bytes.

| Entry              | ZhuàngTài | Zustand |   Jotai |
| ------------------ | --------: | ------: | ------: |
| Vanilla base       |     638 B |   256 B | 2,984 B |
| Minimal React      |     793 B |   391 B | 4,081 B |
| Derived / selector |   1,427 B |   382 B | 2,996 B |

The result is `Zustand < ZhuàngTài << Jotai`. ZhuàngTài cannot claim to be smaller than Zustand.

## 100,000 primitive updates

One numeric state, one subscriber, 3 warmups, 9 samples, and 5 independent processes. The table shows the range of each process's sample median:

| Library   |     Time range |
| --------- | -------------: |
| Zustand   |   1.18–1.25 ms |
| ZhuàngTài |   1.61–1.67 ms |
| Jotai     | 36.46–37.71 ms |

This only describes synchronous primitive overhead for this machine, version set, and scenario. It does not establish real application rendering performance. ZhuàngTài cannot claim to be faster than Zustand.

## Persistence write failure

Scenario: memory starts at `0`; a persisted update sets `1`; storage `setItem` throws `disk full`.

| Library                 | Final memory value |
| ----------------------- | -----------------: |
| ZhuàngTài Persist       |                  0 |
| Zustand Persist         |                  1 |
| Jotai `atomWithStorage` |                  1 |

ZhuàngTài's difference is **commit-after-write**: encoding and storage complete before memory commits. This is a strong-consistency tradeoff, not a claim that other strategies are incorrect.

## Reproduce

```sh
pnpm install
pnpm build
pnpm --filter @zhuangtai-js/benchmarks benchmark
```

The program and latest JSON live in [`benchmarks/`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/benchmarks). Use these numbers to understand state-model tradeoffs rather than as an absolute ranking for every application workload.
