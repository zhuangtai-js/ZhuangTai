import { describe, expect, it, vi } from "vitest";

import { atom, computed, createAtom } from "../src/index.js";
import type { Atom, AtomCreatorPlugin, StopWatch, Watcher } from "../src/index.js";

describe("atom reliability", () => {
  it("notifies multiple watchers in registration order", () => {
    const state = atom(0);
    const calls: string[] = [];

    state.watch(() => calls.push("a"));
    state.watch(() => calls.push("b"));
    calls.length = 0;

    state.set(1);

    expect(calls).toEqual(["a", "b"]);
  });

  it("uses the latest value for consecutive updater sets", () => {
    const state = atom(0);

    state.set((value) => value + 1);
    state.set((value) => value + 1);

    expect(state.get()).toBe(2);
  });

  it("keeps the current notification snapshot when a watcher stops itself", () => {
    const state = atom(0);
    const calls: string[] = [];
    let stopA: StopWatch = noop;

    stopA = state.watch(() => {
      calls.push("a");
      stopA();
    });
    state.watch(() => calls.push("b"));
    calls.length = 0;

    state.set(1);
    state.set(2);

    expect(calls).toEqual(["a", "b", "b"]);
  });

  it("keeps stopped watchers in the current snapshot but omits them later", () => {
    const state = atom(0);
    const calls: string[] = [];
    let stopB: StopWatch = noop;

    state.watch(() => {
      calls.push("a");
      stopB();
    });
    stopB = state.watch(() => calls.push("b"));
    calls.length = 0;

    state.set(1);
    state.set(2);

    expect(calls).toEqual(["a", "b", "a"]);
  });

  it("immediately calls newly added watchers without adding them to the active snapshot", () => {
    const state = atom(0);
    const calls: string[] = [];
    let addB = true;

    state.watch((value, prevValue) => {
      calls.push(`a:${value}:${String(prevValue)}`);

      if (value === 1 && addB) {
        addB = false;
        state.watch((nestedValue, nestedPrevValue) => {
          calls.push(`b:${nestedValue}:${String(nestedPrevValue)}`);
        });
      }
    });
    calls.length = 0;

    state.set(1);
    state.set(2);

    expect(calls).toEqual(["a:1:0", "b:1:undefined", "a:2:1", "b:2:1"]);
  });

  it("allows a watcher to synchronously re-enter set", () => {
    const state = atom(0);
    const calls: Array<readonly [number, number | undefined]> = [];

    state.watch((value, prevValue) => {
      calls.push([value, prevValue]);

      if (value === 1) {
        state.set(2);
      }
    });
    calls.length = 0;

    state.set(1);

    expect(state.get()).toBe(2);
    expect(calls).toEqual([
      [1, 0],
      [2, 1],
    ]);
  });

  it("uses nested synchronous notification order when a watcher re-enters set", () => {
    const state = atom(0);
    const calls: string[] = [];

    state.watch((value) => {
      calls.push(`a:${value}`);

      if (value === 1) {
        state.set(2);
      }
    });
    state.watch((value) => calls.push(`b:${value}`));
    calls.length = 0;

    state.set(1);

    expect(calls).toEqual(["a:1", "a:2", "b:2", "b:2"]);
  });

  it("propagates watcher errors after updating state and before later watchers run", () => {
    const state = atom(0);
    const laterWatcher = vi.fn<Watcher<number>>();

    state.watch((value) => {
      if (value === 1) {
        throw new Error("watch failed");
      }
    });
    state.watch(laterWatcher);
    laterWatcher.mockClear();

    expect(() => state.set(1)).toThrow("watch failed");
    expect(state.get()).toBe(1);
    expect(laterWatcher).not.toHaveBeenCalled();
  });

  it("deduplicates the same watcher function by Set identity", () => {
    const state = atom(0);
    const watcher = vi.fn<Watcher<number>>();
    const stopA = state.watch(watcher);
    const stopB = state.watch(watcher);
    watcher.mockClear();

    state.set(1);
    stopA();
    state.set(2);
    stopB();

    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(1, 0);
  });

  it("treats a direct function value as an updater", () => {
    const state = atom<unknown>(oldFunction);

    state.set(newFunction);

    expect(state.get()).toBe("new");
  });

  it("stores function values when an updater returns the function", () => {
    const state = atom<() => string>(oldFunction);

    state.set(() => newFunction);

    expect(state.get()).toBe(newFunction);
  });
});

describe("createAtom plugin reliability", () => {
  it("runs later-used plugins as outer wrappers around earlier plugins", () => {
    const calls: string[] = [];
    const a = createTransformPlugin("a", "-a", calls);
    const b = createTransformPlugin("b", "-b", calls);
    const createState = createAtom().use(a).use(b);

    const state = createState("x");

    expect(state.get()).toBe("x-b-a");
    expect(calls).toEqual(["b:create", "a:create", "a:after-next", "b:after-next"]);
  });

  it("passes only each plugin's namespaced options", () => {
    type Options = { readonly value: number };
    const seen: unknown[] = [];
    const a: AtomCreatorPlugin<"a", Options> = {
      id: "a",
      create(context) {
        seen.push(["a", context.options]);
        return context.next(context.initialValue);
      },
    };
    const b: AtomCreatorPlugin<"b", Options> = {
      id: "b",
      create(context) {
        seen.push(["b", context.options]);
        return context.next(context.initialValue);
      },
    };

    createAtom().use(a).use(b)(1, { a: { value: 1 }, b: { value: 2 } });

    expect(seen).toEqual([
      ["b", { value: 2 }],
      ["a", { value: 1 }],
    ]);
  });

  it("deduplicates plugins by id even when plugin objects differ", () => {
    const firstCreate = vi.fn<<Value>(state: Atom<Value>) => Atom<Value>>((state) => state);
    const secondCreate = vi.fn<<Value>(state: Atom<Value>) => Atom<Value>>((state) => state);
    const first: AtomCreatorPlugin<"same", Record<never, never>> = {
      id: "same",
      create(context) {
        return firstCreate(context.next(context.initialValue));
      },
    };
    const second: AtomCreatorPlugin<"same", Record<never, never>> = {
      id: "same",
      create(context) {
        return secondCreate(context.next(context.initialValue));
      },
    };

    createAtom().use(first).use(second)(1);

    expect(firstCreate).toHaveBeenCalledOnce();
    expect(secondCreate).not.toHaveBeenCalled();
  });

  it("allows plugins to wrap set/get/watch while preserving watcher stop semantics", () => {
    const wrapped: AtomCreatorPlugin<"wrapped", Record<never, never>> = {
      id: "wrapped",
      create(context) {
        const state = context.next(context.initialValue * 2);

        return {
          get: () => state.get() + 1,
          set(nextValue) {
            state.set((prevValue) => {
              const visiblePrevValue = prevValue + 1;
              return typeof nextValue === "function"
                ? nextValue(visiblePrevValue) - 1
                : nextValue - 1;
            });
          },
          watch(watcher) {
            return state.watch((value, prevValue) => watcher(value + 1, prevValue?.valueOf() + 1));
          },
        };
      },
    };
    const state = createAtom().use(wrapped)(1);
    const watcher = vi.fn<Watcher<number>>();

    const stop = state.watch(watcher);
    watcher.mockClear();
    state.set(10);
    stop();
    state.set(20);

    expect(state.get()).toBe(20);
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(10, 3);
  });
});

describe("computed reliability", () => {
  it("does not subscribe to sources until watched while get remains fresh", () => {
    const source = atom(1);
    const watchSpy = vi.spyOn(source, "watch");
    const double = computed(source, (value) => value * 2);

    expect(watchSpy).not.toHaveBeenCalled();
    expect(double.get()).toBe(2);

    source.set(2);

    expect(double.get()).toBe(4);
    expect(watchSpy).not.toHaveBeenCalled();
  });

  it("subscribes to a source for the first watcher and stops after the last watcher", () => {
    const source = atom(1);
    const originalWatch = source.watch;
    const stopSource = vi.fn<() => void>();
    vi.spyOn(source, "watch").mockImplementation((watcher) => {
      const stop = originalWatch(watcher);

      return () => {
        stopSource();
        stop();
      };
    });
    const double = computed(source, (value) => value * 2);

    const stopA = double.watch(vi.fn<Watcher<number>>());
    const stopB = double.watch(vi.fn<Watcher<number>>());

    expect(source.watch).toHaveBeenCalledOnce();

    stopA();
    expect(stopSource).not.toHaveBeenCalled();

    stopB();
    expect(stopSource).toHaveBeenCalledOnce();
  });

  it("treats computed stop as idempotent", () => {
    const source = atom(1);
    const originalWatch = source.watch;
    const stopSource = vi.fn<() => void>();
    vi.spyOn(source, "watch").mockImplementation((watcher) => {
      const stop = originalWatch(watcher);

      return () => {
        stopSource();
        stop();
      };
    });
    const double = computed(source, (value) => value * 2);

    const stop = double.watch(vi.fn<Watcher<number>>());
    stop();
    stop();

    expect(stopSource).toHaveBeenCalledOnce();
  });

  it("calls a multi-source watcher only once for the initial value", () => {
    const a = atom(1);
    const b = atom(2);
    const sum = computed([a, b] as const, (first, second) => first + second);
    const watcher = vi.fn<Watcher<number>>();

    sum.watch(watcher);

    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(3, undefined);
  });

  it("notifies once when the same source appears more than once", () => {
    const source = atom(1);
    const sum = computed([source, source] as const, (first, second) => first + second);
    const watcher = vi.fn<Watcher<number>>();
    sum.watch(watcher);
    watcher.mockClear();

    source.set(2);

    expect(sum.get()).toBe(4);
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(4, 2);
  });

  it("supports computed chains", () => {
    const count = atom(1);
    const double = computed(count, (value) => value * 2);
    const plusOne = computed(double, (value) => value + 1);
    const watcher = vi.fn<Watcher<number>>();

    plusOne.watch(watcher);
    watcher.mockClear();
    count.set(2);

    expect(plusOne.get()).toBe(5);
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(5, 3);
  });

  it("allows computed watchers to synchronously re-enter source updates", () => {
    const count = atom(1);
    const double = computed(count, (value) => value * 2);
    const calls: number[] = [];

    double.watch((value) => {
      calls.push(value);

      if (value === 4) {
        count.set(3);
      }
    });
    calls.length = 0;

    count.set(2);

    expect(double.get()).toBe(6);
    expect(calls).toEqual([4, 6]);
  });

  it("compares derived references with Object.is", () => {
    const source = atom(0);
    const stableObject = { value: "stable" };
    const derived = computed(source, (value) => (value < 2 ? stableObject : { value }));
    const watcher = vi.fn<Watcher<{ value: string } | { value: number }>>();
    derived.watch(watcher);
    watcher.mockClear();

    source.set(1);
    source.set(2);

    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith({ value: 2 }, stableObject);
  });

  it("propagates watcher errors after updating the current value", () => {
    const source = atom(1);
    const double = computed(source, (value) => value * 2);
    const laterWatcher = vi.fn<Watcher<number>>();

    double.watch((value) => {
      if (value === 4) {
        throw new Error("computed watch failed");
      }
    });
    double.watch(laterWatcher);
    laterWatcher.mockClear();

    expect(() => source.set(2)).toThrow("computed watch failed");
    expect(double.get()).toBe(4);
    expect(laterWatcher).not.toHaveBeenCalled();
  });

  it("propagates derive errors from creation, get, and watched source changes", () => {
    const invalidAtCreation = atom(0);
    expect(() =>
      computed(invalidAtCreation, () => {
        throw new Error("derive at creation");
      }),
    ).toThrow("derive at creation");

    const source = atom(1);
    const derived = computed(source, (value) => {
      if (value === 2) {
        throw new Error("derive on update");
      }

      return value * 2;
    });
    derived.watch(vi.fn<Watcher<number>>());

    expect(() => source.set(2)).toThrow("derive on update");
    expect(() => derived.get()).toThrow("derive on update");
  });
});

function createTransformPlugin<Name extends string>(
  id: Name,
  suffix: string,
  calls: string[],
): AtomCreatorPlugin<Name, Record<never, never>> {
  return {
    id,
    create(context) {
      calls.push(`${id}:create`);
      const state = context.next(`${String(context.initialValue)}${suffix}`);
      calls.push(`${id}:after-next`);

      return state;
    },
  };
}

function noop(): void {}

function oldFunction(): string {
  return "old";
}

function newFunction(): string {
  return "new";
}
