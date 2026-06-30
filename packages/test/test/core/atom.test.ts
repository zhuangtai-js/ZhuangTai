import { atom, type Watcher } from "@zhuangtai-js/core";
import { describe, expect, it, vi } from "vitest";

describe("atom", () => {
  it("returns the initial value", () => {
    // Given
    const count = atom(0);

    // When
    const value = count.get();

    // Then
    expect(value).toBe(0);
  });

  it("sets a direct value", () => {
    // Given
    const count = atom(0);

    // When
    count.set(1);

    // Then
    expect(count.get()).toBe(1);
  });

  it("sets a value from the previous value", () => {
    // Given
    const count = atom(1);

    // When
    count.set((value) => value + 1);

    // Then
    expect(count.get()).toBe(2);
  });

  it("watches the current value immediately", () => {
    // Given
    const count = atom(1);
    const watcher = vi.fn<Watcher<number>>();

    // When
    count.watch(watcher);

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(1, undefined);
  });

  it("watches changes with the previous value", () => {
    // Given
    const count = atom(1);
    const watcher = vi.fn<Watcher<number>>();
    count.watch(watcher);
    watcher.mockClear();

    // When
    count.set(2);

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(2, 1);
  });

  it("stops watching after stop is called", () => {
    // Given
    const count = atom(1);
    const watcher = vi.fn<Watcher<number>>();
    const stop = count.watch(watcher);
    watcher.mockClear();

    // When
    stop();
    count.set(2);

    // Then
    expect(watcher).not.toHaveBeenCalled();
  });

  it("treats stop as idempotent", () => {
    // Given
    const count = atom(1);
    const watcher = vi.fn<Watcher<number>>();
    const stop = count.watch(watcher);
    watcher.mockClear();

    // When
    stop();
    stop();
    count.set(2);

    // Then
    expect(watcher).not.toHaveBeenCalled();
  });

  it("does not notify when Object.is sees no change", () => {
    // Given
    const count = atom(Number.NaN);
    const watcher = vi.fn<Watcher<number>>();
    count.watch(watcher);
    watcher.mockClear();

    // When
    count.set(Number.NaN);

    // Then
    expect(watcher).not.toHaveBeenCalled();
  });

  it("notifies when Object.is sees a signed-zero change", () => {
    // Given
    const count = atom(0);
    const watcher = vi.fn<Watcher<number>>();
    count.watch(watcher);
    watcher.mockClear();

    // When
    count.set(-0);

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(-0, 0);
  });
});
