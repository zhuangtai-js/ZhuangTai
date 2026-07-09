---
title: AI Friendly
description: A ZhuàngTài entry point that is easier for people and models to read, search, and plug into.
---

ZhuàngTài is not only meant to feel clear to people, it is also meant to be easy for AI to pick up. This page groups the most useful entry points for LLMs, agents, and automation, so you can feed the docs to a model directly or let an agent wire the library into a project step by step.

## llms.txt

This site serves `https://zhuangtai.yojigen.cn/llms.txt`, which follows the index format from [llmstxt.org](https://llmstxt.org/) and is a good first pass when you want a model to scan the site structure quickly.

If you need fuller context, use `https://zhuangtai.yojigen.cn/llms-full.txt`. It combines the docs into one large file as much as possible, which is useful for broader one-shot understanding.

If you want a smaller context window, use `https://zhuangtai.yojigen.cn/llms-small.txt`. It fits better for quick Q&A, retrieval prefill, and low-cost prompts.

## Agent Skills

The repo ships three skills under `skills/`, covering ZhuàngTài core usage, `zhuangtai-react`, and `zhuangtai-plugins`. You can install them with:

```sh
npx skills add zhuangtai-js/ZhuangTai
```

If you want a single skill only, pass `--skill zhuangtai`. These skills work with Claude Code, Codex, OpenCode, Cursor, and more than 70 agents that support the Skills CLI.

## Set up with AI

Paste this prompt into your agent. It tells the model to read the installation guide first, then follow it to install ZhuàngTài in the current project:

```txt
Read https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md and follow its steps to install and configure ZhuàngTài in this project.
```

## MCP

An MCP server is on the roadmap, but it has not shipped yet. When it lands, it will expose docs and API lookup so agents can query the needed information right inside the session.

## Next steps

- Read [Philosophy](/en/philosophy/) to see why the library looks the way it does.
- Then read [Getting Started](/en/getting-started/) and create your first atom.
- If you are writing agent prompts, feed [Core Concepts](/en/guides/core-concepts/) to the model too.
