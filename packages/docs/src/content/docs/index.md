---
title: ZhuàngTài 状态
description: ZhuàngTài 是一个轻量、直接、无隐藏调度的 TypeScript 状态库。
template: splash
hero:
  tagline: 轻量、同步、可预测的状态原语。
  actions:
    - text: 快速开始
      link: /getting-started/
      icon: right-arrow
      variant: primary
    - text: Core 参考
      link: /reference/core/
      icon: document
---

ZhuàngTài 提供框架无关的状态核心和持久化插件，适合需要明确同步语义的小型状态场景。

## 特性

- `@zhuangtai-js/core`：零运行时依赖的 `atom` 与 `computed`。
- `@zhuangtai-js/persist`：面向同步 Web Storage 风格存储的持久化插件。
- 无隐藏调度：`set()` 立即生效，`watch()` 同步触发。
