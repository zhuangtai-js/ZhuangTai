import type {
  Atom,
  AtomCreatorPlugin,
  AtomCreatorPluginContext,
  NextValue,
} from "@zhuangtai-js/core";

export type SyncCodec = {
  readonly encode: (value: unknown) => string;
  readonly decode: <Value>(rawValue: string, initialValue: Value) => Value;
};

export type SyncMessageEvent = {
  readonly data: string;
};

export type SyncChannel = {
  readonly postMessage: (message: string) => void;
  readonly addEventListener: (type: "message", listener: (event: SyncMessageEvent) => void) => void;
};

export type SyncOptions = {
  readonly key: string;
  readonly channel?: SyncChannel;
  readonly codec?: SyncCodec;
};

export const sync: AtomCreatorPlugin<"sync", SyncOptions> = {
  id: "sync",
  create: createSyncedAtom,
};

function createSyncedAtom<Value>(
  context: AtomCreatorPluginContext<Value, SyncOptions>,
): Atom<Value> {
  const options = context.options;

  if (options === undefined) {
    return context.next(context.initialValue);
  }

  const channel = resolveChannel(options.channel, options.key);
  const state = context.next(context.initialValue);

  if (channel === undefined) {
    // SSR or a runtime without BroadcastChannel: silently degrade to a plain
    // atom. No sync, no error.
    return state;
  }

  const codec = options.codec ?? jsonCodec;

  return syncAtom({ state, channel, codec });
}

type SyncAtomParams<Value> = {
  readonly state: Atom<Value>;
  readonly channel: SyncChannel;
  readonly codec: SyncCodec;
};

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

function syncAtom<Value>({ state, channel, codec }: SyncAtomParams<Value>): Atom<Value> {
  channel.addEventListener("message", (event) => {
    // A remote update: decode and write straight to the underlying state so we
    // never re-broadcast it. Re-broadcasting would echo the value back and
    // forth between contexts. A concrete value is passed, so core never treats
    // it as an updater.
    state.set(codec.decode(event.data, state.get()));
  });

  function set(nextValue: NextValue<Value>): void {
    const prevValue = state.get();
    const value = isUpdater(nextValue) ? nextValue(prevValue) : nextValue;

    if (Object.is(value, prevValue)) {
      return;
    }

    // Commit locally first (synchronously, matching core), then broadcast the
    // concrete value to other contexts. A concrete value is passed, so core
    // never treats it as an updater.
    state.set(value);
    channel.postMessage(codec.encode(value));
  }

  return { get: state.get, set, watch: state.watch };
}

function resolveChannel(channel: SyncChannel | undefined, key: string): SyncChannel | undefined {
  if (channel !== undefined) {
    return channel;
  }

  // BroadcastChannel is absent under SSR and in older runtimes; degrade to no
  // sync rather than throwing.
  let channelCtor: typeof BroadcastChannel | undefined;
  try {
    channelCtor = globalThis.BroadcastChannel;
  } catch {
    return undefined;
  }

  if (channelCtor === undefined) {
    return undefined;
  }

  const broadcast = new channelCtor(key);

  unrefChannel(broadcast);

  return toSyncChannel(broadcast);
}

function unrefChannel(broadcast: BroadcastChannel): void {
  // Node's BroadcastChannel (unlike the browser's) keeps the event loop
  // alive. unref, where available, lets the process exit naturally while sync
  // stays active for the lifetime of the process.
  if ("unref" in broadcast && typeof broadcast.unref === "function") {
    broadcast.unref();
  }
}

function toSyncChannel(broadcast: BroadcastChannel): SyncChannel {
  return {
    postMessage(message) {
      broadcast.postMessage(message);
    },
    addEventListener(type, listener) {
      broadcast.addEventListener(type, (event) => {
        // We only ever post strings; ignore anything else on this channel name
        // (e.g. foreign broadcasts) so decode never sees a non-string payload.
        if (typeof event.data === "string") {
          listener({ data: event.data });
        }
      });
    },
  };
}

const jsonCodec: SyncCodec = {
  encode(value) {
    const encodedValue = JSON.stringify(value);

    if (typeof encodedValue !== "string") {
      throw new TypeError("The default sync JSON codec can only encode JSON-serializable values.");
    }

    return encodedValue;
  },
  decode(rawValue) {
    return JSON.parse(rawValue);
  },
};
