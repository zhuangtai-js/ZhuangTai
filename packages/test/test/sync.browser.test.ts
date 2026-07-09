import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";
import { describe, expect, it, vi } from "vitest";

function uniqueKey(): string {
  return `sync-browser-${crypto.randomUUID()}`;
}

describe("sync through a real BroadcastChannel", () => {
  it("syncs two atoms in the same context", async () => {
    // Given: two synced atoms sharing a key, each on its own real channel.
    const key = uniqueKey();
    const createState = createAtom().use(sync);
    const source = createState(0, { sync: { key } });
    const mirror = createState(0, { sync: { key } });

    const mirrorValues: number[] = [];
    mirror.watch((value) => {
      mirrorValues.push(value);
    });

    // When
    source.set(1);

    // Then: the local commit is synchronous, the broadcast arrives on a task.
    expect(source.get()).toBe(1);
    expect(mirror.get()).toBe(0);

    await vi.waitFor(() => {
      expect(mirror.get()).toBe(1);
    });

    expect(mirrorValues).toEqual([0, 1]);
  });

  it("round-trips object values through the default JSON codec", async () => {
    // Given
    const key = uniqueKey();
    const createState = createAtom().use(sync);
    const source = createState({ count: 0 }, { sync: { key } });
    const mirror = createState({ count: 0 }, { sync: { key } });

    // When
    source.set({ count: 5 });

    // Then
    await vi.waitFor(() => {
      expect(mirror.get()).toEqual({ count: 5 });
    });
  });

  it("ignores non-string payloads broadcast on the same channel name", async () => {
    // Given: a foreign channel that shares the key with a synced atom.
    const key = uniqueKey();
    const createState = createAtom().use(sync);
    const state = createState(1, { sync: { key } });
    const foreign = new BroadcastChannel(key);

    // When: a non-string payload arrives first, then a valid one. Delivery is
    // ordered, so once the valid payload lands the earlier one was processed.
    foreign.postMessage({ not: "a string" });
    foreign.postMessage("2");

    // Then: the object payload is filtered out instead of corrupting state.
    await vi.waitFor(() => {
      expect(state.get()).toBe(2);
    });

    foreign.close();
  });
});

describe("sync across real browsing contexts", () => {
  it("exchanges updates with an iframe context end to end", async () => {
    // Given: an iframe running its own script in a separate same-origin
    // browsing context. It echoes the encoded "1" it receives by posting an
    // encoded "2" back on the same channel name.
    const key = uniqueKey();
    const iframe = document.createElement("iframe");

    iframe.srcdoc = `<script>
      const channel = new BroadcastChannel(${JSON.stringify(key)});

      channel.addEventListener("message", (event) => {
        // The default codec JSON-encodes values: the number 1 travels as "1".
        if (event.data === "1") {
          channel.postMessage("2");
        }
      });
    </script>`;

    const loaded = new Promise((resolve) => {
      iframe.addEventListener("load", resolve, { once: true });
    });

    document.body.append(iframe);
    await loaded;

    const createState = createAtom().use(sync);
    const state = createState(0, { sync: { key } });

    try {
      // When: the local update crosses into the iframe context, and the
      // iframe's reply crosses back into this one.
      state.set(1);

      // Then
      await vi.waitFor(() => {
        expect(state.get()).toBe(2);
      });
    } finally {
      iframe.remove();
    }
  });
});
