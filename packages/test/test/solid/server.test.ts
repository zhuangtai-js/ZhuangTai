// @vitest-environment node
import type { ReadableAtom, StopWatch, Watcher } from "@zhuangtai-js/core";
import { renderToString, ssr } from "solid-js/web";
import { describe, expect, it } from "vitest";
import { createAtomValue } from "../../../solid/src/index.ts";

type ServerValue = {
  readonly label: string;
};

describe("Solid adapter server rendering", () => {
  it("uses standard renderToString without subscribing or leaking a watcher", () => {
    const objectValue: ServerValue = { label: "server value" };
    let watchCalls = 0;
    let activeWatchers = 0;
    const source: ReadableAtom<ServerValue> = {
      get: () => objectValue,
      watch: (watcher: Watcher<ServerValue>): StopWatch => {
        watchCalls += 1;
        activeWatchers += 1;
        watcher(objectValue, undefined);

        return () => {
          activeWatchers -= 1;
        };
      },
    };

    const html = renderToString(() => {
      const value = createAtomValue(source);
      return ssr(["<span>", "</span>"], value().label);
    });

    expect(html).toBe("<span>server value</span>");
    expect(watchCalls).toBe(0);
    expect(activeWatchers).toBe(0);
  });
});
