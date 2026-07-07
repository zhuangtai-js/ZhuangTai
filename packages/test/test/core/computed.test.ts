import { atom, computed, type Watcher } from "@zhuangtai-js/core";
import { describe, expect, it, vi } from "vitest";

describe("computed", () => {
  it("gets a value derived from one atom", () => {
    // Given
    const count = atom(2);
    const double = computed(() => count.get() * 2);

    // When
    const value = double.get();

    // Then
    expect(value).toBe(4);
  });

  it("gets a fresh value after a source changes", () => {
    // Given
    const count = atom(2);
    const double = computed(() => count.get() * 2);

    // When
    count.set(3);

    // Then
    expect(double.get()).toBe(6);
  });

  it("watches the current derived value immediately", () => {
    // Given
    const count = atom(2);
    const double = computed(() => count.get() * 2);
    const watcher = vi.fn<Watcher<number>>();

    // When
    double.watch(watcher);

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(4, undefined);
  });

  it("watches a fresh derived value after an unwatched source changes", () => {
    // Given
    const count = atom(2);
    const double = computed(() => count.get() * 2);
    const watcher = vi.fn<Watcher<number>>();

    // When
    count.set(3);
    double.watch(watcher);

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(6, undefined);
  });

  it("watches derived changes with the previous derived value", () => {
    // Given
    const count = atom(2);
    const double = computed(() => count.get() * 2);
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
    const isEven = computed(() => count.get() % 2 === 0);
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
    const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);

    // When
    const value = fullName.get();

    // Then
    expect(value).toBe("Mou Yase");
  });

  it("watches changes from any source atom", () => {
    // Given
    const firstName = atom("Mou");
    const lastName = atom("Yase");
    const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);
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
    const double = computed(() => count.get() * 2);
    const watcher = vi.fn<Watcher<number>>();
    const stop = double.watch(watcher);
    watcher.mockClear();

    // When
    stop();
    count.set(3);

    // Then
    expect(watcher).not.toHaveBeenCalled();
  });

  it("supports a computed with no dependencies", () => {
    // Given
    const constant = computed(() => 42);
    const watcher = vi.fn<Watcher<number>>();

    // When
    constant.watch(watcher);

    // Then
    expect(constant.get()).toBe(42);
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(42, undefined);
  });

  it("registers a source read more than once as a single dependency", () => {
    // Given
    const source = atom(1);
    const watchSpy = vi.spyOn(source, "watch");
    const doubled = computed(() => source.get() + source.get());
    doubled.watch(vi.fn<Watcher<number>>());

    // Then
    expect(watchSpy).toHaveBeenCalledOnce();
    expect(doubled.get()).toBe(2);
  });

  it("tracks dynamic dependencies and re-points subscriptions when a branch flips", () => {
    // Given
    const flag = atom(true);
    const a = atom("a");
    const b = atom("b");
    const picked = computed(() => (flag.get() ? a.get() : b.get()));
    const watcher = vi.fn<Watcher<string>>();
    picked.watch(watcher);
    watcher.mockClear();

    // When: b is not a dependency yet, so changing it does nothing
    b.set("b2");
    expect(watcher).not.toHaveBeenCalled();

    // When: flip to the b branch
    flag.set(false);

    // Then: value updates to the current b, and b is now a dependency
    expect(watcher).toHaveBeenCalledWith("b2", "a");
    watcher.mockClear();
    b.set("b3");
    expect(watcher).toHaveBeenCalledWith("b3", "b2");

    // And: a was unsubscribed, so it no longer triggers notifications
    watcher.mockClear();
    a.set("a2");
    expect(watcher).not.toHaveBeenCalled();
  });

  it("unsubscribes a dropped branch even when the derived value is unchanged", () => {
    // Given: both branches derive the same value
    const flag = atom(true);
    const a = atom("same");
    const b = atom("same");
    const picked = computed(() => (flag.get() ? a.get() : b.get()));
    const watcher = vi.fn<Watcher<string>>();
    picked.watch(watcher);
    watcher.mockClear();

    // When: flip to the b branch; value is Object.is-equal, so no notification
    flag.set(false);
    expect(watcher).not.toHaveBeenCalled();

    // Then: a must have been unsubscribed despite no value change
    a.set("changed");
    expect(watcher).not.toHaveBeenCalled();

    // And: b is now the live dependency
    b.set("b-changed");
    expect(watcher).toHaveBeenCalledWith("b-changed", "same");
  });

  it("isolates nested computed dependencies from the outer computed", () => {
    // Given: inner floors, so some source changes do not change its value
    const source = atom(2);
    const inner = computed(() => Math.floor(source.get() / 2));
    const outer = computed(() => inner.get() + 1);
    const watcher = vi.fn<Watcher<number>>();
    outer.watch(watcher);
    watcher.mockClear();

    // When: source changes but inner value stays the same (2/2 and 3/2 both floor to 1)
    source.set(3);

    // Then: inner did not change, so outer is not notified
    expect(watcher).not.toHaveBeenCalled();
    expect(outer.get()).toBe(2);

    // When: source changes enough to move inner
    source.set(4);
    expect(watcher).toHaveBeenCalledWith(3, 2);
  });

  it("does not track reads that happen after an await escapes the derive", async () => {
    // Given
    const tracked = atom(1);
    const untracked = atom(10);
    const derived = computed(() => {
      const base = tracked.get();

      return Promise.resolve().then(() => base + untracked.get());
    });
    const watcher = vi.fn<Watcher<Promise<number>>>();
    derived.watch(watcher);
    watcher.mockClear();

    // When: the async-only read of untracked is not a dependency
    untracked.set(20);

    // Then
    expect(watcher).not.toHaveBeenCalled();

    // And: the synchronously-read atom is tracked
    tracked.set(2);
    expect(watcher).toHaveBeenCalledOnce();
  });

  it("throws when a computed reads itself", () => {
    // Given: the self-read is gated so creation succeeds, then is enabled
    const source = atom(1);
    let selfReadEnabled = false;
    let recursive: ReturnType<typeof computed<number>>;
    // oxlint-disable-next-line prefer-const -- self-reference is the point of the test
    recursive = computed(() => (selfReadEnabled ? source.get() + recursive.get() : source.get()));
    selfReadEnabled = true;

    // Then: reading it surfaces a clear cycle error rather than a stack overflow
    expect(() => recursive.get()).toThrow("Cannot read a computed while it is deriving itself");
  });
});
