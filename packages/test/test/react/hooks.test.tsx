import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
// @vitest-environment jsdom
import { atom, computed } from "@zhuangtai-js/core";
import type { Atom } from "@zhuangtai-js/core";
import {
  createAtomHook,
  createComputedHook,
  useAtom,
  useAtomValue,
  useSetAtom,
} from "@zhuangtai-js/react";
import { act, StrictMode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  cleanup();
});

describe("useAtomValue", () => {
  it("returns the current value", () => {
    const count = atom(3);

    const { result } = renderHook(() => useAtomValue(count));

    expect(result.current).toBe(3);
  });

  it("re-renders when the atom changes", () => {
    const count = atom(0);

    const { result } = renderHook(() => useAtomValue(count));

    expect(result.current).toBe(0);

    act(() => {
      count.set(5);
    });

    expect(result.current).toBe(5);
  });

  it("works with a computed source", () => {
    const count = atom(2);
    const double = computed(() => count.get() * 2);

    const { result } = renderHook(() => useAtomValue(double));

    expect(result.current).toBe(4);

    act(() => {
      count.set(3);
    });

    expect(result.current).toBe(6);
  });

  it("stabilizes fresh object snapshots between computed notifications", () => {
    const count = atom(1);
    const freshObject = computed(() => ({ count: count.get() }));

    const { result } = renderHook(() => useAtomValue(freshObject), { wrapper: StrictMode });

    expect(result.current).toEqual({ count: 1 });

    act(() => {
      count.set(2);
    });

    expect(result.current).toEqual({ count: 2 });
  });

  it("does not re-render on a set that keeps the same value", () => {
    const count = atom(1);
    const renders = vi.fn<() => void>();

    renderHook(() => {
      renders();

      return useAtomValue(count);
    });

    expect(renders).toHaveBeenCalledTimes(1);

    act(() => {
      count.set(1);
    });

    expect(renders).toHaveBeenCalledTimes(1);
  });

  it("stops updating after unmount", () => {
    const count = atom(0);

    const { result, unmount } = renderHook(() => useAtomValue(count));

    expect(result.current).toBe(0);

    unmount();

    act(() => {
      count.set(9);
    });

    expect(result.current).toBe(0);
  });
});

describe("useSetAtom", () => {
  it("returns a setter that updates the atom", () => {
    const count = atom(0);

    const { result } = renderHook(() => useSetAtom(count));

    act(() => {
      result.current(7);
    });

    expect(count.get()).toBe(7);
  });

  it("supports updater functions", () => {
    const count = atom(10);

    const { result } = renderHook(() => useSetAtom(count));

    act(() => {
      result.current((value) => value + 5);
    });

    expect(count.get()).toBe(15);
  });

  it("keeps a stable setter identity across renders", () => {
    const count = atom(0);

    const { result, rerender } = renderHook(() => useSetAtom(count));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("does not re-render the component when the atom changes", () => {
    const count = atom(0);
    const renders = vi.fn<() => void>();

    renderHook(() => {
      renders();

      return useSetAtom(count);
    });

    expect(renders).toHaveBeenCalledTimes(1);

    act(() => {
      count.set(1);
    });

    expect(renders).toHaveBeenCalledTimes(1);
  });
});

describe("useAtom", () => {
  it("behaves like useState", () => {
    const count = atom(0);

    const { result } = renderHook(() => useAtom(count));

    expect(result.current[0]).toBe(0);

    act(() => {
      result.current[1](4);
    });

    expect(result.current[0]).toBe(4);
    expect(count.get()).toBe(4);
  });

  it("reflects external atom changes", () => {
    const count = atom(0);

    const { result } = renderHook(() => useAtom(count));

    act(() => {
      count.set(8);
    });

    expect(result.current[0]).toBe(8);
  });
});

describe("createAtomHook", () => {
  it("creates a bound hook returning [value, setter]", () => {
    const count = atom(1);
    const useCount = createAtomHook(count);

    const { result } = renderHook(() => useCount());

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((value) => value + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(count.get()).toBe(2);
  });
});

describe("createComputedHook", () => {
  it("creates a bound hook returning the value only", () => {
    const count = atom(2);
    const useDouble = createComputedHook(computed(() => count.get() * 2));

    const { result } = renderHook(() => useDouble());

    expect(result.current).toBe(4);

    act(() => {
      count.set(5);
    });

    expect(result.current).toBe(10);
  });
});

describe("rendered components", () => {
  it("renders and updates from a click", () => {
    const count = atom(0);

    function Counter(): React.JSX.Element {
      const [value, setValue] = useAtom(count);

      return (
        <button
          type="button"
          onClick={() => setValue((current) => current + 1)}>
          count: {value}
        </button>
      );
    }

    render(<Counter />);

    const button = screen.getByRole("button");

    expect(button.textContent).toBe("count: 0");

    fireEvent.click(button);

    expect(button.textContent).toBe("count: 1");
  });

  it("does not re-render a setter-only component when the value changes", () => {
    const count = atom(0);
    const readerRenders = vi.fn<() => void>();
    const setterRenders = vi.fn<() => void>();

    function Reader(): React.JSX.Element {
      readerRenders();
      const value = useAtomValue(count);

      return <span>{value}</span>;
    }

    function Setter({ target }: { readonly target: Atom<number> }): React.JSX.Element {
      setterRenders();
      const setValue = useSetAtom(target);

      return (
        <button
          type="button"
          onClick={() => setValue(1)}>
          set
        </button>
      );
    }

    render(
      <>
        <Reader />
        <Setter target={count} />
      </>,
    );

    expect(readerRenders).toHaveBeenCalledTimes(1);
    expect(setterRenders).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button"));

    expect(readerRenders).toHaveBeenCalledTimes(2);
    expect(setterRenders).toHaveBeenCalledTimes(1);
  });
});

describe("StrictMode", () => {
  it("renders and updates under StrictMode double rendering", () => {
    const count = atom(0);

    function Counter(): React.JSX.Element {
      const [value, setValue] = useAtom(count);

      return (
        <button
          type="button"
          onClick={() => setValue((current) => current + 1)}>
          count: {value}
        </button>
      );
    }

    render(
      <StrictMode>
        <Counter />
      </StrictMode>,
    );

    const button = screen.getByRole("button");

    expect(button.textContent).toBe("count: 0");

    // A click exercises the updater path; double-invoked effects must not
    // double-apply the update.
    fireEvent.click(button);

    expect(button.textContent).toBe("count: 1");
    expect(count.get()).toBe(1);

    // External updates still reach the component after StrictMode has torn
    // down and re-created the subscription once.
    act(() => {
      count.set(5);
    });

    expect(button.textContent).toBe("count: 5");
  });

  it("stops updating after unmount under StrictMode", () => {
    const count = atom(0);
    const values: number[] = [];

    function Reader(): React.JSX.Element {
      const value = useAtomValue(count);
      values.push(value);

      return <span>{value}</span>;
    }

    const { unmount } = render(
      <StrictMode>
        <Reader />
      </StrictMode>,
    );

    unmount();

    act(() => {
      count.set(9);
    });

    // No render observed the post-unmount value: the StrictMode re-created
    // subscription was cleaned up on unmount instead of leaking.
    expect(values).not.toContain(9);
  });
});
