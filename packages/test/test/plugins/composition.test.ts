import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";
import { immer } from "@zhuangtai-js/immer";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { sync, type SyncChannel, type SyncMessageEvent } from "@zhuangtai-js/sync";
import { describe, expect, it } from "vitest";

type Listener = (event: SyncMessageEvent) => void;

class ChannelBus {
  private readonly channels = new Map<string, Set<TestChannel>>();

  create(name: string): TestChannel {
    const channel = new TestChannel(this, name);
    const group = this.channels.get(name) ?? new Set<TestChannel>();
    group.add(channel);
    this.channels.set(name, group);
    return channel;
  }

  publish(sender: TestChannel, name: string, message: string): void {
    const group = this.channels.get(name);

    if (group === undefined) {
      return;
    }

    for (const channel of group) {
      if (channel !== sender) {
        channel.deliver(message);
      }
    }
  }
}

class TestChannel implements SyncChannel {
  postMessages: string[] = [];
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly bus: ChannelBus,
    private readonly name: string,
  ) {}

  postMessage(message: string): void {
    this.postMessages.push(message);
    this.bus.publish(this, this.name, message);
  }

  addEventListener(_type: "message", listener: Listener): void {
    this.listeners.add(listener);
  }

  deliver(message: string): void {
    for (const listener of this.listeners) {
      listener({ data: message });
    }
  }
}

function createStorage(entries: readonly (readonly [string, string])[] = []): PersistStorage & {
  readonly values: Map<string, string>;
} {
  const values = new Map(entries);

  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

describe("plugin composition contracts", () => {
  it("recommended order use(persist).use(sync) writes remote updates through persist", () => {
    const bus = new ChannelBus();
    const storageA = createStorage();
    const storageB = createStorage();
    const createState = createAtom().use(persist).use(sync);
    const a = createState(0, {
      persist: { key: "count", storage: storageA },
      sync: { key: "count", channel: bus.create("count") },
    });
    const b = createState(0, {
      persist: { key: "count", storage: storageB },
      sync: { key: "count", channel: bus.create("count") },
    });

    a.set(5);

    expect(b.get()).toBe(5);
    expect(storageB.getItem("count")).toBe("5");
  });

  it("anti-pattern use(sync).use(persist) applies remote updates only in memory", () => {
    // Spec: remote sync writes the inner state captured when sync is created.
    // With persist outside sync, remote updates bypass persist and do not hit storage.
    const bus = new ChannelBus();
    const storageA = createStorage();
    const storageB = createStorage();
    const createState = createAtom().use(sync).use(persist);
    const a = createState(0, {
      persist: { key: "count", storage: storageA },
      sync: { key: "count", channel: bus.create("count") },
    });
    const b = createState(0, {
      persist: { key: "count", storage: storageB },
      sync: { key: "count", channel: bus.create("count") },
    });

    a.set(5);

    expect(b.get()).toBe(5);
    expect(storageB.getItem("count")).toBeNull();
  });

  it("recommended order use(freeze).use(immer) applies recipes and freezes the result", () => {
    const createState = createAtom().use(freeze).use(immer);
    const state = createState([{ done: false }], { freeze: { enabled: true } });

    state.set((draft) => {
      draft[0]!.done = true;
    });

    expect(state.get()).toEqual([{ done: true }]);
    expect(Object.isFrozen(state.get())).toBe(true);
    expect(Object.isFrozen(state.get()[0])).toBe(true);
  });

  it("anti-pattern use(immer).use(freeze) rejects draft recipes against frozen values", () => {
    // Spec: freeze is outermost, so a function is treated as a plain updater and
    // receives the already-frozen current value — not an Immer draft.
    // Public types follow outermost kind (default Atom), so the recipe is asserted
    // only for the intentional runtime anti-pattern under test.
    const createState = createAtom().use(immer).use(freeze);
    const state = createState([{ done: false }], { freeze: { enabled: true } });

    expect(() => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentional anti-pattern: force a recipe through the plain NextValue surface.
      state.set(mutateDoneFlag as (prev: { done: boolean }[]) => { done: boolean }[]);
    }).toThrow(TypeError);

    expect(state.get()).toEqual([{ done: false }]);
  });
});

function mutateDoneFlag(draft: { done: boolean }[]): void {
  draft[0]!.done = true;
}
