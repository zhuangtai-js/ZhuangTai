import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { atom, computed } from "@zhuangtai-js/core";
import {
  createAtomHook,
  createComputedHook,
  useAtom,
  useAtomValue,
  useSetAtom,
} from "@zhuangtai-js/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup();
});

describe("react hooks in a real browser", () => {
  it("renders and updates from a real click with useAtom", () => {
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
    expect(count.get()).toBe(1);
  });

  it("renders a computed value through a bound hook", () => {
    const count = atom(2);
    const useCount = createAtomHook(count);
    const useDouble = createComputedHook(computed(() => count.get() * 2));

    function Widget(): React.JSX.Element {
      const [value, setValue] = useCount();
      const double = useDouble();

      return (
        <button
          type="button"
          onClick={() => setValue(value + 1)}>
          {value}:{double}
        </button>
      );
    }

    render(<Widget />);

    const button = screen.getByRole("button");

    expect(button.textContent).toBe("2:4");

    fireEvent.click(button);

    expect(button.textContent).toBe("3:6");
  });

  it("does not re-render a setter-only component when the value changes", () => {
    const count = atom(0);
    let readerRenders = 0;
    let setterRenders = 0;

    function Reader(): React.JSX.Element {
      readerRenders += 1;
      const value = useAtomValue(count);

      return <span data-testid="reader">{value}</span>;
    }

    function Setter(): React.JSX.Element {
      setterRenders += 1;
      const setValue = useSetAtom(count);

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
        <Setter />
      </>,
    );

    expect(readerRenders).toBe(1);
    expect(setterRenders).toBe(1);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByTestId("reader").textContent).toBe("1");
    expect(readerRenders).toBe(2);
    expect(setterRenders).toBe(1);
  });
});
