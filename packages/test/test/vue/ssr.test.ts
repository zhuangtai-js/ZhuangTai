import { renderToString } from "@vue/server-renderer";
// @vitest-environment node
import type { ReadableAtom, Watcher } from "@zhuangtai-js/core";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { useAtomValue } from "../../../vue/src/index.ts";

type Value = {
  readonly label: string;
};

describe("Vue adapter SSR lifecycle", () => {
  it("renders from atom.get() without subscribing during SSR setup", async () => {
    const objectValue: Value = { label: "server value" };
    const watchers = new Set<Watcher<Value>>();
    let getCalls = 0;
    let watchCalls = 0;
    let stopCalls = 0;
    const source: ReadableAtom<Value> = {
      get: () => {
        getCalls += 1;
        return objectValue;
      },
      watch(watcher) {
        watchCalls += 1;
        watchers.add(watcher);
        watcher(objectValue, undefined);

        return () => {
          stopCalls += 1;
          watchers.delete(watcher);
        };
      },
    };

    const app = createSSRApp({
      setup() {
        const snapshot = useAtomValue(source);

        return () => h("span", snapshot.value.label);
      },
    });

    await expect(renderToString(app)).resolves.toBe("<span>server value</span>");
    expect(getCalls).toBe(1);
    expect(watchCalls).toBe(0);
    expect(stopCalls).toBe(0);
    expect(watchers.size).toBe(0);
  });
});
