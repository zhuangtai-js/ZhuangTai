## 变更说明 / Summary

<!-- 中文优先；请同步补充英文摘要。 / Chinese first; include the matching English summary. -->

## 为什么需要 / Motivation

## 验证证据 / Verification evidence

- [ ] `pnpm check`
- [ ] 与改动相关的手动验证 / Manual verification for the changed surface
- [ ] 公开文档已中英文同步 / Public documentation is mirrored in Chinese and English

## 兼容性检查 / Compatibility checklist

- [ ] 未改变 `set` 立即生效与 `watch` 同步执行语义 / Immediate `set` and synchronous `watch` semantics remain unchanged
- [ ] 未向 Core 引入第三方运行时依赖 / No third-party runtime dependency was added to Core
- [ ] 未引入隐藏调度、batching、transaction 或 debounce / No hidden scheduling, batching, transactions, or debouncing were introduced
- [ ] 不适用 / Not applicable
