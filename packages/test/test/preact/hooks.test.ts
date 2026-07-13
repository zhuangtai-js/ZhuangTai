// @vitest-environment jsdom
import { atom, computed } from "@zhuangtai-js/core";
import { createElement, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createAtomHook,
  createComputedHook,
  useAtom,
  useAtomValue,
  useSetAtom,
} from "../../../preact/src/index.ts";

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(async () => {
  await act(() => render(null, container));
  container.remove();
});

describe("Preact adapter hooks", () => {
  it("updates writable and computed values", async () => {
    const count = atom(1);
    const double = computed(() => count.get() * 2);
    let setCount: ((value: number | ((current: number) => number)) => void) | undefined;

    function Counter() {
      const [value, setValue] = useAtom(count);
      const doubledValue = useAtomValue(double);
      setCount = setValue;

      return createElement("span", null, `${value}:${doubledValue}`);
    }

    await act(() => render(createElement(Counter, null), container));
    expect(container.textContent).toBe("1:2");

    await act(() => setCount?.((current) => current + 1));

    expect(container.textContent).toBe("2:4");
    expect(count.get()).toBe(2);
  });

  it("stabilizes fresh computed snapshots between notifications", async () => {
    const count = atom(1);
    const freshObject = computed(() => ({ count: count.get() }));

    function Reader() {
      return createElement("span", null, useAtomValue(freshObject).count);
    }

    await act(() => render(createElement(Reader, null), container));
    expect(container.textContent).toBe("1");

    await act(() => count.set(2));

    expect(container.textContent).toBe("2");
  });

  it("creates bound writable and computed hooks", async () => {
    const count = atom(2);
    const useCount = createAtomHook(count);
    const useDouble = createComputedHook(computed(() => count.get() * 2));
    let increment: (() => void) | undefined;

    function Counter() {
      const [value, setValue] = useCount();
      const doubledValue = useDouble();
      increment = () => setValue((current) => current + 1);

      return createElement("span", null, `${value}:${doubledValue}`);
    }

    await act(() => render(createElement(Counter, null), container));
    expect(container.textContent).toBe("2:4");

    await act(() => increment?.());

    expect(container.textContent).toBe("3:6");
  });

  it("replaces setters when the atom reference changes", async () => {
    const first = atom(0);
    const second = atom(10);
    let setValue: ((value: number) => void) | undefined;

    function Setter({ target }: { readonly target: typeof first }) {
      setValue = useSetAtom(target);

      return createElement("span", null, target.get());
    }

    await act(() => render(createElement(Setter, { target: first }), container));
    const firstSetter = setValue;

    await act(() => render(createElement(Setter, { target: second }), container));
    const secondSetter = setValue;

    expect(secondSetter).not.toBe(firstSetter);

    await act(() => secondSetter?.(20));

    expect(first.get()).toBe(0);
    expect(second.get()).toBe(20);
  });

  it("keeps setters stable and setter-only components unsubscribed", async () => {
    const count = atom(0);
    const setters: Array<(value: number | ((current: number) => number)) => void> = [];
    let setterRenders = 0;

    function Setter() {
      setterRenders += 1;
      const setValue = useSetAtom(count);
      setters.push(setValue);

      return createElement("button", { onClick: () => setValue(1) }, "set");
    }

    await act(() => render(createElement(Setter, null), container));
    expect(setterRenders).toBe(1);

    await act(() => count.set(1));
    expect(setterRenders).toBe(1);

    await act(() => render(createElement(Setter, null), container));

    expect(setterRenders).toBe(2);
    expect(setters[1]).toBe(setters[0]);
  });
});
