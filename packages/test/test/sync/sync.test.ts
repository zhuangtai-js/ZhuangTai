import { createAtom } from "@zhuangtai-js/core";
import { sync, type SyncChannel, type SyncCodec, type SyncMessageEvent } from "@zhuangtai-js/sync";
import { afterEach, describe, expect, it, vi } from "vitest";

type Listener = (event: SyncMessageEvent) => void;

// A tiny in-memory bus that mimics BroadcastChannel: a message posted on one
// channel is delivered to the "message" listeners of every OTHER channel that
// shares the same name (BroadcastChannel does not echo to the sender).
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

describe("sync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when sync options are omitted", () => {
    // Given
    const createState = createAtom().use(sync);

    // When
    const state = createState(1);
    state.set(2);

    // Then
    expect(state.get()).toBe(2);
  });

  it("broadcasts the value after set", () => {
    // Given
    const bus = new ChannelBus();
    const channel = bus.create("count");
    const createState = createAtom().use(sync);
    const state = createState(1, { sync: { key: "count", channel } });

    // When
    state.set(2);

    // Then
    expect(state.get()).toBe(2);
    expect(channel.postMessages).toEqual(["2"]);
  });

  it("broadcasts updater results", () => {
    // Given
    const bus = new ChannelBus();
    const channel = bus.create("count");
    const createState = createAtom().use(sync);
    const state = createState(1, { sync: { key: "count", channel } });

    // When
    state.set((value) => value + 1);

    // Then
    expect(channel.postMessages).toEqual(["2"]);
  });

  it("syncs a set from one context to another sharing the channel name", () => {
    // Given
    const bus = new ChannelBus();
    const createState = createAtom().use(sync);
    const a = createState(0, { sync: { key: "count", channel: bus.create("count") } });
    const b = createState(0, { sync: { key: "count", channel: bus.create("count") } });

    // When
    a.set(5);

    // Then
    expect(a.get()).toBe(5);
    expect(b.get()).toBe(5);
  });

  it("does not re-broadcast a value received from another context", () => {
    // Given
    const bus = new ChannelBus();
    const createState = createAtom().use(sync);
    const channelA = bus.create("count");
    const channelB = bus.create("count");
    const a = createState(0, { sync: { key: "count", channel: channelA } });
    const b = createState(0, { sync: { key: "count", channel: channelB } });

    // When
    a.set(7);

    // Then
    // a broadcast once; b applied the value but did NOT echo it back.
    expect(channelA.postMessages).toEqual(["7"]);
    expect(channelB.postMessages).toEqual([]);
    expect(b.get()).toBe(7);
  });

  it("does not broadcast Object.is no-op updates", () => {
    // Given
    const bus = new ChannelBus();
    const channel = bus.create("count");
    const createState = createAtom().use(sync);
    const state = createState(3, { sync: { key: "count", channel } });

    // When
    state.set(3);

    // Then
    expect(channel.postMessages).toEqual([]);
  });

  it("notifies local watchers on a received broadcast", () => {
    // Given
    const bus = new ChannelBus();
    const createState = createAtom().use(sync);
    const a = createState(0, { sync: { key: "count", channel: bus.create("count") } });
    const b = createState(0, { sync: { key: "count", channel: bus.create("count") } });
    const seen: number[] = [];
    b.watch((value) => {
      seen.push(value);
    });

    // When
    a.set(9);

    // Then
    // watch fires once synchronously on subscribe (0), then on the received update (9).
    expect(seen).toEqual([0, 9]);
  });

  it("uses a custom codec for both encode and decode", () => {
    // Given
    const bus = new ChannelBus();
    const createState = createAtom().use(sync);
    const codec: SyncCodec = {
      encode(value) {
        return `n:${String(value)}`;
      },
      decode<Value>(rawValue: string, _initialValue: Value) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SyncCodec.decode is intentionally generic so custom codecs can restore/migrate values.
        return Number(rawValue.slice(2)) as Value;
      },
    };
    const a = createState(0, { sync: { key: "count", channel: bus.create("count"), codec } });
    const b = createState(0, { sync: { key: "count", channel: bus.create("count"), codec } });

    // When
    a.set(4);

    // Then
    expect(b.get()).toBe(4);
  });

  it("degrades to a plain atom when BroadcastChannel is unavailable", () => {
    // Given
    vi.stubGlobal("BroadcastChannel", undefined);
    const createState = createAtom().use(sync);

    // When
    const state = createState(1, { sync: { key: "count" } });
    state.set(2);

    // Then
    expect(state.get()).toBe(2);
  });

  it("creates a BroadcastChannel named after the key when channel is omitted", () => {
    // Given
    const names: string[] = [];
    class FakeBroadcastChannel {
      constructor(public name: string) {
        names.push(name);
      }
      postMessage(): void {}
      addEventListener(): void {}
    }
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
    const createState = createAtom().use(sync);

    // When
    const state = createState(1, { sync: { key: "theme" } });
    state.set(2);

    // Then
    expect(names).toEqual(["theme"]);
    expect(state.get()).toBe(2);
  });
});
