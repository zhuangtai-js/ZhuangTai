---
title: AI Friendly
description: A ZhuàngTài entry point that is easier for people and models to read, search, and plug into.
---

ZhuàngTài is not only meant to feel clear to people, it is also meant to be easy for AI to pick up. This page groups the most useful entry points for LLMs, agents, and automation, so you can feed the docs to a model directly or let an agent wire the library into a project step by step.

## llms.txt

This site serves `https://zhuangtai.yojigen.cn/llms.txt`, which follows the index format from [llmstxt.org](https://llmstxt.org/) and is a good first pass when you want a model to scan the site structure quickly.

If you need fuller context, use `https://zhuangtai.yojigen.cn/llms-full.txt`. It combines the docs into one large file as much as possible, which is useful for broader one-shot understanding.

If you want a smaller context window, use `https://zhuangtai.yojigen.cn/llms-small.txt`. It fits better for quick Q&A, retrieval prefill, and low-cost prompts.

## Key boundaries for LLMs

- SSR: Create an independent `atom/store` for every SSR request; never share mutable state across requests.
- Persist: migration input comes from storage and is always `unknown`; parse and narrow it first. Run migrations synchronously, one version at a time; if the durable write fails, do not commit the new in-memory state.
- Choice: use `@zhuangtai-js/core` directly without framework rendering lifecycle or reactive bridging; use a framework adapter in components when automatic re-rendering, subscriptions, and lifecycle cleanup are needed.
- The four framework adapters are `@zhuangtai-js/preact`, `@zhuangtai-js/svelte`, `@zhuangtai-js/vue`, and `@zhuangtai-js/solid`. The four Agent Skills are `zhuangtai`, `zhuangtai-react`, `zhuangtai-plugins`, and `zhuangtai-framework-adapters`.

### 给模型的关键边界

- SSR：每个 SSR 请求创建独立的 `atom/store`，避免跨请求共享可变状态。
- Persist：migration 输入来自 storage，始终视为 `unknown`，先解析并收窄；迁移按版本同步、逐步执行；durable write 失败时不提交新的内存状态。
- 选择：不需要框架渲染生命周期或响应式桥接时直接使用 `@zhuangtai-js/core`；组件需要自动重渲染、订阅和生命周期清理时使用 framework adapter。
- 四个 framework adapter 是 `@zhuangtai-js/preact`、`@zhuangtai-js/svelte`、`@zhuangtai-js/vue`、`@zhuangtai-js/solid`；四个 Agent Skills 是 `zhuangtai`、`zhuangtai-react`、`zhuangtai-plugins`、`zhuangtai-framework-adapters`。

## Agent Skills

The repo ships four skills under `skills/`, covering ZhuàngTài core usage, `zhuangtai-react`, `zhuangtai-plugins`, and `zhuangtai-framework-adapters`. You can install them with:

```sh
npx skills add zhuangtai-js/ZhuangTai
```

If you want a single skill only, pass `--skill zhuangtai`. These skills work with Claude Code, Codex, OpenCode, Cursor, and more than 70 agents that support the Skills CLI.

## Set up with AI

Paste this prompt into your agent. It tells the model to read the installation guide first, then follow it to install ZhuàngTài in the current project:

```txt
Read https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md and follow its steps to install and configure ZhuàngTài in this project.
```

## Next steps

- Read [Philosophy](/en/philosophy/) to see why the library looks the way it does.
- Then read [Getting Started](/en/getting-started/) and create your first atom.
- If you are writing agent prompts, feed [Core Concepts](/en/guides/core-concepts/) to the model too.
