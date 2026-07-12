# ZhuàngTài 基准测试 / Benchmarks

## 中文

这里保存可复现的测量程序，不保存营销结论。当前比较固定版本的 ZhuàngTài、Zustand 与 Jotai：

- bundle size：esbuild、浏览器 ESM、minify、React external，记录原始与 gzip 字节数；
- primitive update：一个数字状态、一个订阅者、3 次预热、9 次采样，并在多个独立 Node.js 进程中运行；
- persistence failure：验证写入失败后内存状态是否已经提交。

```sh
pnpm install
pnpm build
pnpm --filter @zhuangtai-js/benchmarks benchmark
```

结果写入 `results/latest.json`。微基准不是应用性能结论；机器、运行时、打包器版本和入口选择都会影响结果。CI 只验证程序可运行和结果结构，不设置性能阈值。

## English

This directory contains reproducible measurement programs, not marketing conclusions. It compares pinned versions of ZhuàngTài, Zustand, and Jotai:

- bundle size: esbuild, browser ESM, minified, React external, recording raw and gzip bytes;
- primitive update: one numeric state, one subscriber, 3 warmups, 9 samples, repeated in independent Node.js processes;
- persistence failure: whether in-memory state has committed after storage throws.

```sh
pnpm install
pnpm build
pnpm --filter @zhuangtai-js/benchmarks benchmark
```

Results are written to `results/latest.json`. Microbenchmarks are not application performance conclusions; hardware, runtime, bundler version, and entry selection all affect the result. CI verifies that the program runs and that the result shape is valid, without performance thresholds.
