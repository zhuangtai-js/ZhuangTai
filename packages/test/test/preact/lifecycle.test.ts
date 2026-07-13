// @vitest-environment jsdom
import { atom } from "@zhuangtai-js/core";
import type { ReadableAtom, Watcher } from "@zhuangtai-js/core";
import { useAtomValue } from "@zhuangtai-js/preact";
import { createElement, render } from "preact";
import { useLayoutEffect } from "preact/hooks";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

type TrackedReadable = {
  readonly source: ReadableAtom<number>;
  readonly activeWatchers: () => number;
  readonly set: (value: number) => void;
};

function createTrackedReadable(initialValue: number): TrackedReadable {
  let value = initialValue;
  const watchers = new Set<Watcher<number>>();

  return {
    source: {
      get: () => value,
      watch(watcher) {
        watchers.add(watcher);
        watcher(value, undefined);

        return () => watchers.delete(watcher);
      },
    },
    activeWatchers: () => watchers.size,
    set(nextValue) {
      const previousValue = value;
      value = nextValue;

      for (const watcher of watchers) {
        watcher(value, previousValue);
      }
    },
  };
}

function ReadableReader({ source }: { readonly source: ReadableAtom<number> }) {
  return createElement("span", null, useAtomValue(source));
}

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(async () => {
  await act(() => render(null, container));
  container.remove();
});

describe("Preact adapter subscription lifecycle", () => {
  it("suppresses the unchanged immediate watch callback", async () => {
    const tracked = createTrackedReadable(1);
    let renders = 0;

    function Reader() {
      renders += 1;

      return createElement("span", null, useAtomValue(tracked.source));
    }

    await act(() => render(createElement(Reader, null), container));

    expect(container.textContent).toBe("1");
    expect(renders).toBe(1);
    expect(tracked.activeWatchers()).toBe(1);
  });

  it("closes the render-to-subscribe gap", async () => {
    const count = atom(0);

    function Reader() {
      return createElement("span", null, useAtomValue(count));
    }

    function GapWriter() {
      useLayoutEffect(() => count.set(1), []);

      return null;
    }

    function App() {
      return createElement(
        "div",
        null,
        createElement(Reader, null),
        createElement(GapWriter, null),
      );
    }

    await act(() => render(createElement(App, null), container));

    expect(container.textContent).toBe("1");
  });

  it("cleans up and replaces atom subscriptions", async () => {
    const first = createTrackedReadable(1);
    const second = createTrackedReadable(2);

    await act(() => render(createElement(ReadableReader, { source: first.source }), container));
    expect(first.activeWatchers()).toBe(1);
    expect(second.activeWatchers()).toBe(0);

    await act(() => render(createElement(ReadableReader, { source: second.source }), container));

    expect(container.textContent).toBe("2");
    expect(first.activeWatchers()).toBe(0);
    expect(second.activeWatchers()).toBe(1);

    await act(() => render(null, container));

    expect(second.activeWatchers()).toBe(0);
  });

  it("uses Object.is semantics for NaN and signed zero snapshots", async () => {
    const value = atom<number>(Number.NaN);
    const snapshots: number[] = [];

    function Reader() {
      const snapshot = useAtomValue(value);
      snapshots.push(snapshot);

      return createElement("span", null, Object.is(snapshot, -0) ? "-0" : String(snapshot));
    }

    await act(() => render(createElement(Reader, null), container));
    expect(snapshots).toHaveLength(1);

    await act(() => value.set(Number.NaN));
    expect(snapshots).toHaveLength(1);

    await act(() => value.set(0));
    expect(container.textContent).toBe("0");

    await act(() => value.set(-0));
    expect(container.textContent).toBe("-0");
    expect(Object.is(snapshots.at(-1), -0)).toBe(true);
  });

  it("surfaces snapshot and subscription errors", async () => {
    const readError = new TypeError("read failed");
    const subscribeError = new TypeError("subscribe failed");
    const brokenRead: ReadableAtom<number> = {
      get() {
        throw readError;
      },
      watch() {
        return () => undefined;
      },
    };
    const brokenSubscribe: ReadableAtom<number> = {
      get: () => 1,
      watch() {
        throw subscribeError;
      },
    };

    function ReadFailure() {
      return createElement("span", null, useAtomValue(brokenRead));
    }

    function SubscribeFailure() {
      return createElement("span", null, useAtomValue(brokenSubscribe));
    }

    expect(() => render(createElement(ReadFailure, null), container)).toThrow(readError);
    expect(() => {
      void act(() => render(createElement(SubscribeFailure, null), container));
    }).toThrow(subscribeError);
  });
});
