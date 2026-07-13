---
title: AI 友好
description: 给人类和模型都更容易读、查、接入的 ZhuàngTài 文档入口。
---

ZhuàngTài 不只想让人读得顺，也想让 AI 更快接上手。这个页面把对 LLM、代理和自动化接入最有用的入口放在一起，方便你直接把文档喂给模型，或者让代理按步骤把库接进项目。

## llms.txt

本网站提供 `https://zhuangtai.yojigen.cn/llms.txt`，它按照 [llmstxt.org](https://llmstxt.org/) 的索引格式整理，适合先让模型快速扫一遍站点结构。

如果你需要更完整的上下文，可以继续用 `https://zhuangtai.yojigen.cn/llms-full.txt`。它把文档尽量合并成一个完整文件，适合做一次性的大范围理解。

如果你只想给模型更小的上下文窗口，可以用 `https://zhuangtai.yojigen.cn/llms-small.txt`。它更适合快速问答、检索前置和低成本提示词。

## Agent Skills

仓库里带了三份技能，放在 `skills/` 下，分别对应 ZhuàngTài 核心用法、`zhuangtai-react` 和 `zhuangtai-plugins`。你可以用下面的命令安装它们：

```sh
npx skills add zhuangtai-js/ZhuangTai
```

如果你想只装某一个技能，也可以传 `--skill zhuangtai`。这些技能可以和 Claude Code、Codex、OpenCode、Cursor 以及 70 多种支持 Skills CLI 的代理一起用。

## 用 AI 一键接入

把下面这段话直接发给代理，它会先读安装文档，再按步骤把 ZhuàngTài 配到当前项目里：

```txt
请阅读 https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md 并按其中的步骤在当前项目中安装并配置 ZhuàngTài。
```

## 下一步

- 先看 [设计理念](/philosophy/) 了解这个库为什么长这样。
- 再看 [快速开始](/getting-started/) 把第一个 atom 跑起来。
- 如果你在写代理提示词，可以顺手把 [核心概念](/guides/core-concepts/) 也喂给模型。
