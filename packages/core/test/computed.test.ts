import { describe, expect, it, vi } from "vitest";

import { atom, computed } from "../src/index.js";
import type { Watcher } from "../src/index.js";

describe("computed", () => {
  it("gets a value derived from one atom", () => {
    // Given
    const count = atom(2);
    const double = computed(count, (value) => value * 2);

    // When
    const value = double.get();

    // Then
    expect(value).toBe(4);
  });

  it("gets a fresh value after a source changes", () => {
    // Given
    const count = atom(2);
    const double = computed(count, (value) => value * 2);

    // When
    count.set(3);

    // Then
    expect(double.get()).toBe(6);
  });

  it("watches the current derived value immediately", () => {
    // Given
    const count = atom(2);
    const double = computed(count, (value) => value * 2);
    const watcher = vi.fn<Watcher<number>>();

    // When
    double.watch(watcher);

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(4, undefined);
  });

  it("watches derived changes with the previous derived value", () => {
    // Given
    const count = atom(2);
    const double = computed(count, (value) => value * 2);
    const watcher = vi.fn<Watcher<number>>();
    double.watch(watcher);
    watcher.mockClear();

    // When
    count.set(3);

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(6, 4);
  });

  it("does not notify when the derived value is unchanged", () => {
    // Given
    const count = atom(2);
    const isEven = computed(count, (value) => value % 2 === 0);
    const watcher = vi.fn<Watcher<boolean>>();
    isEven.watch(watcher);
    watcher.mockClear();

    // When
    count.set(4);

    // Then
    expect(watcher).not.toHaveBeenCalled();
  });

  it("gets a value derived from multiple atoms", () => {
    // Given
    const firstName = atom("Mou");
    const lastName = atom("Yase");
    const fullName = computed([firstName, lastName] as const, (first, last) => `${first} ${last}`);

    // When
    const value = fullName.get();

    // Then
    expect(value).toBe("Mou Yase");
  });

  it("watches changes from any source atom", () => {
    // Given
    const firstName = atom("Mou");
    const lastName = atom("Yase");
    const fullName = computed([firstName, lastName] as const, (first, last) => `${first} ${last}`);
    const watcher = vi.fn<Watcher<string>>();
    fullName.watch(watcher);
    watcher.mockClear();

    // When
    lastName.set("Yasegaki");

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith("Mou Yasegaki", "Mou Yase");
  });

  it("stops watching source atoms after stop is called", () => {
    // Given
    const count = atom(2);
    const double = computed(count, (value) => value * 2);
    const watcher = vi.fn<Watcher<number>>();
    const stop = double.watch(watcher);
    watcher.mockClear();

    // When
    stop();
    count.set(3);

    // Then
    expect(watcher).not.toHaveBeenCalled();
  });
});
