import {
  atom,
  computed,
  createAtom,
  type Atom,
  type AtomCreatorPlugin,
  type AtomCreatorPluginContext,
  type NextValue,
  type StopWatch,
  type Watcher,
} from "@zhuangtai-js/core";
import { describe, expect, it, vi } from "vitest";

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

  it("rejects setting the same atom from its immediate watch callback", () => {
    const state = atom(0);

    expect(() => {
      state.watch(() => {
        state.set(1);
      });
    }).toThrow("Cannot call set() on an atom while it is running watcher callbacks");
    expect(state.get()).toBe(0);
  });

  it("rejects setting the same atom while notifying watchers", () => {
    const state = atom(0);
    const calls: Array<readonly [number, number | undefined]> = [];

    state.watch((value, prevValue) => {
      calls.push([value, prevValue]);

      if (value === 1) {
        state.set(2);
      }
    });
    calls.length = 0;

    expect(() => state.set(1)).toThrow(
      "Cannot call set() on an atom while it is running watcher callbacks",
    );

    expect(state.get()).toBe(1);
    expect(calls).toEqual([[1, 0]]);

    state.set(3);
    expect(state.get()).toBe(3);
  });

  it("allows a watcher to set a different atom", () => {
    const source = atom(0);
    const target = atom(0);

    source.watch((value) => {
      if (value === 1) {
        target.set(2);
      }
    });

    source.set(1);

    expect(source.get()).toBe(1);
    expect(target.get()).toBe(2);
  });

  it("isolates watcher errors and still notifies later watchers", () => {
    const state = atom(0);
    const laterWatcher = vi.fn<Watcher<number>>();

    state.watch((value) => {
      if (value === 1) {
        throw new Error("watch failed");
      }
    });
    state.watch(laterWatcher);
    laterWatcher.mockClear();

    // The first watcher throws, but the later watcher is still notified before the
    // error is rethrown to the caller.
    expect(() => state.set(1)).toThrow("watch failed");
    expect(state.get()).toBe(1);
    expect(laterWatcher).toHaveBeenCalledOnce();
    expect(laterWatcher).toHaveBeenCalledWith(1, 0);

    laterWatcher.mockClear();
    state.set(2);
    expect(state.get()).toBe(2);
    expect(laterWatcher).toHaveBeenCalledOnce();
    expect(laterWatcher).toHaveBeenCalledWith(2, 1);
  });

  it("aggregates errors when multiple watchers throw and still notifies all of them", () => {
    const state = atom(0);
    const thirdWatcher = vi.fn<Watcher<number>>();
    const errorA = new Error("watcher a failed");
    const errorB = new Error("watcher b failed");

    state.watch((value) => {
      if (value === 1) {
        throw errorA;
      }
    });
    state.watch((value) => {
      if (value === 1) {
        throw errorB;
      }
    });
    state.watch(thirdWatcher);
    thirdWatcher.mockClear();

    let caught: unknown;
    try {
      state.set(1);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toEqual([errorA, errorB]);
    // Every watcher runs, including the one registered after the throwing watchers.
    expect(thirdWatcher).toHaveBeenCalledOnce();
    expect(thirdWatcher).toHaveBeenCalledWith(1, 0);
    expect(state.get()).toBe(1);
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

  it("removes a watcher whose initial callback throws", () => {
    const state = atom(0);
    const laterWatcher = vi.fn<Watcher<number>>();

    expect(() =>
      state.watch(() => {
        throw new Error("initial watch failed");
      }),
    ).toThrow("initial watch failed");

    // The throwing watcher must not remain subscribed.
    state.watch(laterWatcher);
    laterWatcher.mockClear();
    state.set(1);

    expect(laterWatcher).toHaveBeenCalledOnce();
    expect(laterWatcher).toHaveBeenCalledWith(1, 0);
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
    let firstCreateCalls = 0;
    let secondCreateCalls = 0;
    const first: AtomCreatorPlugin<"same", Record<never, never>> = {
      id: "same",
      create<Value>(context: AtomCreatorPluginContext<Value, Record<never, never>>) {
        firstCreateCalls += 1;
        return context.next(context.initialValue);
      },
    };
    const second: AtomCreatorPlugin<"same", Record<never, never>> = {
      id: "same",
      create<Value>(context: AtomCreatorPluginContext<Value, Record<never, never>>) {
        secondCreateCalls += 1;
        return context.next(context.initialValue);
      },
    };

    createAtom().use(first).use(second)(1);

    expect(firstCreateCalls).toBe(1);
    expect(secondCreateCalls).toBe(0);
  });

  it("allows plugins to wrap set/get/watch while preserving watcher stop semantics", () => {
    const wrapped: AtomCreatorPlugin<"wrapped", Record<never, never>> = {
      id: "wrapped",
      create<Value>(context: AtomCreatorPluginContext<Value, Record<never, never>>) {
        return wrapNumberAtom(
          context.next(toGenericValue<Value>(Number(context.initialValue) * 2)),
        );
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
    const double = computed(() => source.get() * 2);

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
    const double = computed(() => source.get() * 2);

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
    const double = computed(() => source.get() * 2);

    const stop = double.watch(vi.fn<Watcher<number>>());
    stop();
    stop();

    expect(stopSource).toHaveBeenCalledOnce();
  });

  it("calls a multi-source watcher only once for the initial value", () => {
    const a = atom(1);
    const b = atom(2);
    const sum = computed(() => a.get() + b.get());
    const watcher = vi.fn<Watcher<number>>();

    sum.watch(watcher);

    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(3, undefined);
  });

  it("notifies once when the same source appears more than once", () => {
    const source = atom(1);
    const sum = computed(() => source.get() + source.get());
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
    const double = computed(() => count.get() * 2);
    const plusOne = computed(() => double.get() + 1);
    const watcher = vi.fn<Watcher<number>>();

    plusOne.watch(watcher);
    watcher.mockClear();
    count.set(2);

    expect(plusOne.get()).toBe(5);
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(5, 3);
  });

  it("rejects setting a source atom from its computed watcher", () => {
    const count = atom(1);
    const double = computed(() => count.get() * 2);
    const calls: number[] = [];

    double.watch((value) => {
      calls.push(value);

      if (value === 4) {
        count.set(3);
      }
    });
    calls.length = 0;

    expect(() => count.set(2)).toThrow(
      "Cannot call set() on an atom while it is running watcher callbacks",
    );

    expect(count.get()).toBe(2);
    expect(double.get()).toBe(4);
    expect(calls).toEqual([4]);
  });

  it("compares derived references with Object.is", () => {
    const source = atom(0);
    const stableObject = { value: "stable" };
    const derived = computed(() => (source.get() < 2 ? stableObject : { value: source.get() }));
    const watcher = vi.fn<Watcher<{ value: string } | { value: number }>>();
    derived.watch(watcher);
    watcher.mockClear();

    source.set(1);
    source.set(2);

    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith({ value: 2 }, stableObject);
  });

  it("isolates computed watcher errors and still notifies later watchers", () => {
    const source = atom(1);
    const double = computed(() => source.get() * 2);
    const laterWatcher = vi.fn<Watcher<number>>();

    double.watch((value) => {
      if (value === 4) {
        throw new Error("computed watch failed");
      }
    });
    double.watch(laterWatcher);
    laterWatcher.mockClear();

    // The first computed watcher throws, but the later watcher is still notified
    // before the error is rethrown.
    expect(() => source.set(2)).toThrow("computed watch failed");
    expect(double.get()).toBe(4);
    expect(laterWatcher).toHaveBeenCalledOnce();
    expect(laterWatcher).toHaveBeenCalledWith(4, 2);
  });

  it("aggregates errors when multiple computed watchers throw", () => {
    const source = atom(1);
    const double = computed(() => source.get() * 2);
    const thirdWatcher = vi.fn<Watcher<number>>();
    const errorA = new Error("computed watcher a failed");
    const errorB = new Error("computed watcher b failed");

    double.watch((value) => {
      if (value === 4) {
        throw errorA;
      }
    });
    double.watch((value) => {
      if (value === 4) {
        throw errorB;
      }
    });
    double.watch(thirdWatcher);
    thirdWatcher.mockClear();

    let caught: unknown;
    try {
      source.set(2);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toEqual([errorA, errorB]);
    expect(thirdWatcher).toHaveBeenCalledOnce();
    expect(thirdWatcher).toHaveBeenCalledWith(4, 2);
    expect(double.get()).toBe(4);
  });

  it("propagates derive errors from creation, get, and watched source changes", () => {
    expect(() =>
      computed(() => {
        throw new Error("derive at creation");
      }),
    ).toThrow("derive at creation");

    const source = atom(1);
    const derived = computed(() => {
      if (source.get() === 2) {
        throw new Error("derive on update");
      }

      return source.get() * 2;
    });
    derived.watch(vi.fn<Watcher<number>>());

    expect(() => source.set(2)).toThrow("derive on update");
    expect(() => derived.get()).toThrow("derive on update");
  });

  it("removes a first watcher and stops watching sources when its initial callback throws", () => {
    const source = atom(1);
    const derived = computed(() => source.get() * 2);
    const stableWatcher = vi.fn<Watcher<number>>();

    expect(() =>
      derived.watch(() => {
        throw new Error("initial watch failed");
      }),
    ).toThrow("initial watch failed");

    // The failed watcher was removed and source subscriptions were rolled back,
    // so a later source change must not attempt to notify it.
    expect(() => source.set(2)).not.toThrow();

    // A fresh watcher can re-establish the subscription from a clean state.
    derived.watch(stableWatcher);
    stableWatcher.mockClear();
    source.set(3);

    expect(stableWatcher).toHaveBeenCalledOnce();
    expect(stableWatcher).toHaveBeenCalledWith(6, 4);
  });
});

function createTransformPlugin<Name extends string>(
  id: Name,
  suffix: string,
  calls: string[],
): AtomCreatorPlugin<Name, Record<never, never>> {
  return {
    id,
    create<Value>(context: AtomCreatorPluginContext<Value, Record<never, never>>) {
      calls.push(`${id}:create`);
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this test plugin intentionally transforms arbitrary values through a string representation.
      const state = context.next(`${String(context.initialValue)}${suffix}` as Value);
      calls.push(`${id}:after-next`);

      return state;
    },
  };
}

function noop(): void {}

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the return type carries the caller's generic atom value in numeric wrapper tests.
function toGenericValue<Value>(value: number): Value {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- runtime wrapper tests intentionally model a numeric plugin through the generic plugin API.
  return value as Value;
}

function wrapNumberAtom<Value>(state: Atom<Value>): Atom<Value> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this runtime behavior test intentionally wraps a generic atom as a numeric view.
  const numberState = state as unknown as Atom<number>;

  return {
    get: () => toGenericValue<Value>(numberState.get() + 1),
    set(nextValue: NextValue<Value>) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this runtime behavior test intentionally maps generic setter input to the numeric backing atom.
      const numericNextValue = nextValue as unknown as NextValue<number>;

      numberState.set((prevValue) => {
        const visiblePrevValue = prevValue + 1;
        return typeof numericNextValue === "function"
          ? numericNextValue(visiblePrevValue) - 1
          : numericNextValue - 1;
      });
    },
    watch(watcher: Watcher<Value>) {
      return numberState.watch((value, prevValue) =>
        watcher(
          toGenericValue<Value>(value + 1),
          prevValue === undefined ? undefined : toGenericValue<Value>(prevValue + 1),
        ),
      );
    },
  };
}
