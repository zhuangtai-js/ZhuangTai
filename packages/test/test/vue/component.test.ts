// @vitest-environment jsdom
import type { Atom, NextValue, Watcher } from "@zhuangtai-js/core";
import { describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import { useAtom } from "../../../vue/src/index.ts";

describe("Vue adapter component lifecycle", () => {
  it("renders updates and removes the subscription on unmount", async () => {
    let value = 1;
    const watchers = new Set<Watcher<number>>();
    const source: Atom<number> = {
      get: () => value,
      set(nextValue: NextValue<number>) {
        const previousValue = value;
        value = typeof nextValue === "function" ? nextValue(value) : nextValue;

        if (Object.is(value, previousValue)) {
          return;
        }

        for (const watcher of watchers) {
          watcher(value, previousValue);
        }
      },
      watch(watcher) {
        watchers.add(watcher);
        watcher(value, undefined);

        return () => watchers.delete(watcher);
      },
    };
    const container = document.createElement("div");
    const app = createApp({
      setup() {
        const [snapshot, setValue] = useAtom(source);

        return () =>
          h(
            "button",
            {
              onClick: () => setValue((currentValue) => currentValue + 1),
            },
            String(snapshot.value),
          );
      },
    });

    app.mount(container);

    expect(container.textContent).toBe("1");
    expect(watchers.size).toBe(1);

    const button = container.querySelector("button");
    if (button === null) {
      throw new Error("Expected the mounted Vue adapter test button.");
    }
    button.dispatchEvent(new MouseEvent("click"));
    await nextTick();

    expect(container.textContent).toBe("2");

    app.unmount();
    expect(watchers.size).toBe(0);

    source.set(3);
    await nextTick();
    expect(container.textContent).toBe("");
  });
});
