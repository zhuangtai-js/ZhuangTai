---
title: 设计理念
description: ZhuàngTài 的核心哲学，强调简单、直接、无魔法和可组合。
---

ZhuàngTài 的设计目标很朴素，少一点概念，少一点惊喜，多一点可预测性。它不是想把所有状态问题都包进去，而是想把核心语义收紧到一个很小的范围里，让你每次读到一行代码时，都能在脑子里直接跑出结果。

## 简单直接

核心 API 只有 `atom`、`computed` 和 `createAtom`。你不用记一套很长的名词表，也不用在多个抽象层之间来回跳。看到 `atom(0)`，你就知道它是一个可读、可写、可监听的状态单元。看到 `computed(() => count.get() * 2)`，你就知道它是在同步派生值。

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);
```

这种小表面让行为更容易装进脑子里，也更容易在代码评审时快速确认对不对。

## 无魔法

`set` 会立即生效，`watch` 回调会同步执行，相等性使用 `Object.is`，对象和数组更新按引用比较，必须用不可变更新。这些规则都很直接，没有藏在暗处的特殊分支。

```ts
const count = atom(0);

count.set(1);
count.get(); // 1
```

当语义稳定且明确时，你不用猜“它是不是晚一点才更新”，也不用追着某个隐式条件去找 bug。

## 核心不加隐藏调度

核心里没有批处理、没有防抖、没有事务。它们看起来像方便，实际上会把时序藏起来，让结果更难预测，也更难排查。ZhuàngTài 选择把这类复杂度留给插件，或者留给更上层的代码。

```ts
count.set(1);
count.set(2);
```

上面这两次写入就是两次立即生效的更新。你看到什么，就发生什么，调试时不用再多算一层调度器。

## 零依赖内核 + 插件组合

`@zhuangtai-js/core` 没有第三方运行时依赖。它负责把最小语义做好，`persist`、`freeze`、`immer`、`sync` 这些能力都通过 `createAtom().use()` 作为可选插件接上去。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
```

这种组合方式让核心保持轻，也让你只在需要时才把功能装进来。

## 框架无关

核心不依赖 React，也不依赖任何具体框架。只要是 JavaScript 能运行的地方，它就能工作。React 适配器是独立包，不会把框架语义揉进核心里。

```ts
import { atom } from "@zhuangtai-js/core";

const theme = atom("light");
```

这意味着你可以先写核心状态，再按需要接到不同界面层，而不是反过来被某个框架拖着走。

## 人和 AI 都易读

可预测的语义不只帮人读代码，也帮 LLM 写对代码。语义越少歧义，越容易在更少上下文里做出正确判断。

```ts
count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});
```

如果你想看一页更偏落地的说明，可以继续读 [AI 友好](/ai/) 和 [核心概念](/guides/core-concepts/)。

如果你想先从使用开始，也可以看 [快速开始](/getting-started/) 和 [指南](/guides/plugins/)。
