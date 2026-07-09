---
title: Philosophy
description: ZhuàngTài's core philosophy, centered on simplicity, directness, no magic, and composition.
---

ZhuàngTài keeps its design goals plain. It chooses fewer concepts, fewer surprises, and more predictability. It does not try to solve every state problem at once. Instead, it narrows the core semantics so much that you can read one line of code and run the result in your head.

## Simple and direct

The core API is just `atom`, `computed`, and `createAtom`. You do not need a long vocabulary, and you do not need to jump across multiple abstraction layers. When you see `atom(0)`, you know it is a readable, writable, watchable state unit. When you see `computed(() => count.get() * 2)`, you know it derives a value synchronously.

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);
```

That small surface makes behavior easier to keep in your head, and easier to review quickly.

## No magic

`set` applies immediately, `watch` callbacks run synchronously, equality uses `Object.is`, and object and array updates are reference-based, so you need immutable updates. These rules are direct, with no hidden special cases.

```ts
const count = atom(0);

count.set(1);
count.get(); // 1
```

When the semantics stay stable and explicit, you do not have to guess whether the update happened later, or chase an implicit condition to find the bug.

## No hidden scheduling in core

The core has no batching, no debouncing, and no transactions. Those features can look convenient, but they hide timing and make outcomes harder to predict and debug. ZhuàngTài keeps that complexity in plugins or in the layer above the core.

```ts
count.set(1);
count.set(2);
```

Those are just two immediate updates. What you see is what happens, and you do not need to mentally account for another scheduler while debugging.

## Zero-dependency core plus plugin composition

`@zhuangtai-js/core` has no third-party runtime dependencies. It owns the smallest useful semantics, while `persist`, `freeze`, `immer`, and `sync` stay optional and attach through `createAtom().use()`.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
```

That keeps the core light and lets you add features only when you need them.

## Framework agnostic

The core does not depend on React or any specific framework. It runs anywhere JavaScript runs. The React adapter is a separate package, so framework concerns stay out of the core.

```ts
import { atom } from "@zhuangtai-js/core";

const theme = atom("light");
```

That means you can build your state first, then connect it to different UI layers later, instead of letting a framework shape the core from the start.

## Human and AI readable

Predictable semantics help humans read code, and they help LLMs write correct code too. The less ambiguity a system has, the less context it needs for a correct answer.

```ts
count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});
```

For a more practical page, read [AI Friendly](/en/ai/) and [Core Concepts](/en/guides/core-concepts/).

If you want to start with usage first, read [Getting Started](/en/getting-started/) and [Guides](/en/guides/plugins/).
