import type {
  Atom,
  AtomCreatorPlugin,
  AtomCreatorPluginContext,
  NextValue,
} from "@zhuangtai-js/core";

const PACKAGE_NAME = "@zhuangtai-js/sync";

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
    //
    // Decode failures (malformed payload, custom codec errors) are isolated so
    // a bad message cannot surface as an uncaught event-handler exception or
    // corrupt local state. Watcher errors from a successful set still propagate.
    let nextValue: Value;

    try {
      nextValue = codec.decode(event.data, state.get());
    } catch (error) {
      reportIgnoredRemoteMessage(error);
      return;
    }

    state.set(nextValue);
  });

  function set(nextValue: NextValue<Value>): void {
    const prevValue = state.get();
    const value = isUpdater(nextValue) ? nextValue(prevValue) : nextValue;

    if (Object.is(value, prevValue)) {
      return;
    }

    // Encode before committing so non-serializable values fail closed: memory
    // stays unchanged and nothing is broadcast. After a successful encode,
    // commit locally (synchronously, matching core), then post the already
    // encoded payload. A concrete value is passed, so core never treats it as
    // an updater.
    const encoded = codec.encode(value);
    state.set(value);
    channel.postMessage(encoded);
  }

  return { get: state.get, set, watch: state.watch };
}

function reportIgnoredRemoteMessage(error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  // Intentional diagnostics for operators: remote decode failures must not throw
  // from the event handler, but they should still be visible in development consoles.
  // oxlint-disable-next-line eslint/no-console -- package-prefixed remote-decode diagnostics
  console.error(
    `[@zhuangtai-js/sync] Ignored a remote message that failed to decode: ${detail}`,
    error,
  );
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
    return encodeDefaultJson(value, PACKAGE_NAME);
  },
  decode(rawValue) {
    return JSON.parse(rawValue);
  },
};

function encodeDefaultJson(value: unknown, packageName: string): string {
  assertDefaultJsonEncodable(value, packageName);

  const encodedValue = JSON.stringify(value);

  if (typeof encodedValue !== "string") {
    throw new TypeError(
      `[${packageName}] The default JSON codec can only encode JSON-serializable values.`,
    );
  }

  return encodedValue;
}

function assertDefaultJsonEncodable(
  value: unknown,
  packageName: string,
  seen: Set<object> = new Set(),
): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError(
      `[${packageName}] The default JSON codec cannot encode non-finite numbers (NaN or ±Infinity). Use a custom codec if you need those values.`,
    );
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new TypeError(
        `[${packageName}] The default JSON codec cannot encode invalid Date values. Use a custom codec if you need those values.`,
      );
    }

    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      assertDefaultJsonEncodable(item, packageName, seen);
    }

    return;
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      continue;
    }

    assertDefaultJsonEncodable(Reflect.get(value, key), packageName, seen);
  }
}
