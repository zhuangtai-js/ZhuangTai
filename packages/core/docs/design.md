# @zhuangtai/core Design

ZhuangTai has two kinds of state: original state and derived state.

## Atom

An atom is original state. You can read it, change it, and watch it.

```ts
const count = atom(0);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});
```

## Computed

A computed atom is derived state. You can read it and watch it, but you cannot set it directly.

```ts
const count = atom(1);
const double = computed(count, (value) => value * 2);

double.get();
double.watch((value, prevValue) => {});
```

## Watch

`watch` runs immediately with the current value and `undefined` as `prevValue`. Later changes call the watcher with the new value and the previous value.

```ts
count.watch((value, prevValue) => {
  console.log(value, prevValue);
});
```

The returned function stops the watcher.

```ts
const stop = count.watch(() => {});
stop();
```

## Equality

`Object.is` decides whether a value changed. Equal values do not notify watchers.

## Scheduling

Core updates are synchronous and direct.

- `set` applies the new value immediately.
- `watch` callbacks run immediately when the value changes.
- Core does not batch, defer, debounce, or hide intermediate updates.

Higher-level adapters can integrate with framework-specific scheduling, but core keeps the state model simple and predictable.

## Non-goals

The core package does not include framework adapters, proxies, providers, middleware, persistence, async resources, or selectors.
