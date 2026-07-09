---
title: Core Concepts
description: Learn atoms, computed values, watch semantics, and the smallest ZhuàngTài mental model.
---

ZhuàngTài is small, but its behavior is not fuzzy. Once these ideas click, it becomes easy to decide when to use one atom, when to derive a value, when to split state apart, and when to keep things together.

## What an atom is

`atom()` creates the smallest state unit. It is readable, writable, and watchable.

```ts
import { atom } from "@zhuangtai-js/core";

const count = atom(0);

count.get();
count.set(1);
count.set((value) => value + 1);
```

Think of an atom as a value container with synchronous notifications. It does not depend on React or any other adapter. If you hold the same atom reference, you are looking at the same state.

## Computed values track dependencies automatically

`computed()` derives a read-only value from one or more atoms. You do not list dependencies by hand. ZhuàngTài collects them from the `.get()` calls that actually run inside the derive.

```ts
import { atom, computed } from "@zhuangtai-js/core";

const flag = atom(true);
const a = atom("A");
const b = atom("B");

const label = computed(() => (flag.get() ? a.get() : b.get()));
```

The important part is the branch. When `flag` flips from `true` to `false`, the computed value unsubscribes from `a` and subscribes to `b`. It follows what this run really read, not what it might have read.

Dependency tracking only happens inside the synchronous derive. Reads after `await` or inside `setTimeout()` are not tracked, so the derive should stay synchronous.

## Watch semantics

`watch()` registers a synchronous watcher and immediately calls it once with the current value. The callback receives `value` and `prevValue`, and the return value stops the watcher.

```ts
const stop = count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});

stop();
```

That means a watcher is not “later, maybe sometime.” It runs in the current call stack. On the initial call, `prevValue` is an `undefined` sentinel. For `Atom<T | undefined>`, you cannot use it to tell first notification apart from a previous value that just happened to be `undefined`.

Watchers are isolated from each other. If one watcher throws, the current round still continues for the rest. After every watcher has run, a single error is rethrown as-is, and multiple errors are rethrown inside an `AggregateError`.

## The mental model for `set()`

`set()` applies immediately. There is no hidden batching, no hidden deferring, and no hidden transaction boundary.

```ts
count.set(1);
console.log(count.get()); // 1
```

That is the core mental model: once `set()` returns, the current value is already new. Every later `get()` sees the update.

If you split tightly related values into several atoms and update them one by one, you can observe intermediate combinations. Keep strongly coupled values in the same atom when you need them to move together.

## `Object.is` and immutable updates

ZhuàngTài uses `Object.is` to decide whether something changed. For objects and arrays, that means updates are reference-based. You need to create new objects or new arrays. Mutating the old one in place does not count as a change.

```ts
import { atom } from "@zhuangtai-js/core";

const user = atom({ name: "Yuan", tags: ["core"] });

// Wrong: in-place mutation keeps the same reference.
user.get().name = "Status";
user.set(user.get());

// Right: return a new object and a new array.
user.set((prev) => ({
  ...prev,
  name: "Status",
  tags: [...prev.tags, "docs"],
}));
```

If you mutate in place, `Object.is` sees no change, so watchers do not fire. This is exactly why immutable updates matter.

## Watcher error isolation

Watcher errors are isolated from one another. A bad watcher does not cancel the rest of the notification round. That keeps one failure from hiding unrelated updates.

This pairs well with the rest of the model: `set()` is immediate, `watch()` is synchronous, and the update you just triggered is either visible now or it is a real error. There is no extra scheduler layer in between.

## Next steps

- Read [Plugins & Composition](/en/guides/plugins/) to see how `createAtom()`, `.use(plugin)`, and plugin order work.
- Read [Core reference](/en/reference/core/) for the full API and type list.
