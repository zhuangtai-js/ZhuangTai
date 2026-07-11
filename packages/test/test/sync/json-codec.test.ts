import { createAtom } from "@zhuangtai-js/core";
import { sync, type SyncChannel, type SyncCodec, type SyncMessageEvent } from "@zhuangtai-js/sync";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("sync default JSON codec and remote isolation", () => {
  it("rejects non-finite numbers without committing or broadcasting", () => {
    const bus = new ChannelBus();
    const channel = bus.create("count");
    const createState = createAtom().use(sync);
    const state = createState(0, { sync: { key: "count", channel } });
    const watcher = vi.fn<(value: number, prevValue: number | undefined) => void>();
    state.watch(watcher);
    watcher.mockClear();

    expect(() => state.set(Number.NaN)).toThrow(/non-finite numbers/i);
    expect(state.get()).toBe(0);
    expect(channel.postMessages).toEqual([]);
    expect(watcher).not.toHaveBeenCalled();
  });

  it("ignores malformed remote payloads without changing state", () => {
    const bus = new ChannelBus();
    const channelA = bus.create("count");
    const channelB = bus.create("count");
    const createState = createAtom().use(sync);
    const a = createState(0, { sync: { key: "count", channel: channelA } });
    const b = createState(1, { sync: { key: "count", channel: channelB } });
    const watcher = vi.fn<(value: number, prevValue: number | undefined) => void>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    b.watch(watcher);
    watcher.mockClear();

    expect(() => {
      channelA.deliver("{not-json");
    }).not.toThrow();

    expect(a.get()).toBe(0);
    expect(b.get()).toBe(1);
    expect(watcher).not.toHaveBeenCalled();
    expect(channelB.postMessages).toEqual([]);
    expect(consoleError).toHaveBeenCalledOnce();
    expect(String(consoleError.mock.calls[0]?.[0])).toContain("Ignored a remote message");
  });

  it("ignores remote decode failures from a custom codec", () => {
    const bus = new ChannelBus();
    const createState = createAtom().use(sync);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const codec: SyncCodec = {
      encode(value) {
        return String(value);
      },
      decode() {
        throw new Error("decode failed");
      },
    };
    const a = createState(0, { sync: { key: "count", channel: bus.create("count"), codec } });
    const b = createState(2, { sync: { key: "count", channel: bus.create("count"), codec } });

    expect(() => a.set(3)).not.toThrow();
    expect(a.get()).toBe(3);
    expect(b.get()).toBe(2);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it("still applies well-formed remote payloads", () => {
    const bus = new ChannelBus();
    const createState = createAtom().use(sync);
    const a = createState(0, { sync: { key: "count", channel: bus.create("count") } });
    const b = createState(0, { sync: { key: "count", channel: bus.create("count") } });

    a.set(8);

    expect(b.get()).toBe(8);
  });
});
