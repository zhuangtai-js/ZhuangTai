# ZhuàngTài 路线图 / Roadmap

## 中文

路线图表达当前优先级，不是发布日期承诺。Core 的同步语义保持稳定：不会为了追逐功能数量而加入隐藏调度、batching、transaction、debounce 或 scheduler。

### 当前：采用基础

- 完善 Vite Vanilla 与 React 可运行示例。
- 发布 State Lab、诚实对比、集成支持等级和可复现 benchmark。
- 建立 Discussions、Issue/PR 模板、贡献与安全入口。

### 下一步：经过验证的集成

- Next.js App Router fixture：hydration、请求隔离、streaming SSR 边界。
- Astro fixture 与库作者/SDK 示例。
- Node.js 版本矩阵，以及 Bun、Deno 的探索性验证。

### 后续：由真实需求驱动

- 根据早期用户反馈评估 Vue、Svelte、Solid 或 React Native adapter。
- 收集真实项目案例并建立 Showcase。
- 评估调试工具；只有在真实采用阻碍明确时才投入 DevTools。

建议和用例请在 [Discussions](https://github.com/zhuangtai-js/ZhuangTai/discussions) 中提出。

## English

This roadmap communicates current priorities, not release-date commitments. Core's synchronous semantics remain stable: hidden scheduling, batching, transactions, debouncing, or a scheduler will not be added merely to increase feature count.

### Current: adoption foundation

- Maintain runnable Vite Vanilla and React examples.
- Publish the State Lab, honest comparison, integration support levels, and reproducible benchmarks.
- Establish Discussions, issue and PR templates, contribution guidance, and a security entry point.

### Next: verified integrations

- Next.js App Router fixture covering hydration, request isolation, and streaming SSR boundaries.
- Astro fixture and a library-author or SDK example.
- Node.js version matrix plus exploratory Bun and Deno verification.

### Later: driven by real demand

- Evaluate Vue, Svelte, Solid, or React Native adapters from early-user feedback.
- Collect real-world projects and build a Showcase.
- Evaluate debugging tools; invest in DevTools only when a concrete adoption blocker exists.

Share proposals and use cases in [Discussions](https://github.com/zhuangtai-js/ZhuangTai/discussions).
