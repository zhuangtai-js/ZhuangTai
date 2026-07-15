import { definePersistMigration } from "@zhuangtai-js/persist";
import { expect } from "vitest";

export class Deferred<Value> {
  readonly promise: Promise<Value>;
  private resolvePromise: ((value: Value) => void) | undefined;
  private rejectPromise: ((reason?: unknown) => void) | undefined;

  constructor() {
    this.promise = new Promise<Value>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
  }

  resolve(value: Value): void {
    this.resolvePromise?.(value);
  }

  reject(reason?: unknown): void {
    this.rejectPromise?.(reason);
  }
}

export const NUMBER_MIGRATION = definePersistMigration<number>((value) => {
  if (typeof value !== "number") {
    throw new TypeError("Expected a number migration value.");
  }

  return value + 1;
});

export function envelope(version: number, payload: string): string {
  return JSON.stringify({ __zhuangtai_persist__: true, version, payload });
}

export function expectErrorContext(
  error: unknown,
  key: string,
  version: number,
  cause?: Error,
): void {
  const messages: string[] = [];
  let current = error;
  let foundCause = cause === undefined;

  while (current instanceof Error) {
    messages.push(current.message);
    if (current === cause) {
      foundCause = true;
    }
    current = current.cause;
  }

  expect(messages.join("\n")).toContain("@zhuangtai-js/persist");
  expect(messages.join("\n")).toContain(`key "${key}"`);
  expect(messages.join("\n")).toContain(`version ${version}`);
  expect(foundCause).toBe(true);
}

export function rejectionOf(promise: Promise<void>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("Expected promise to reject.");
    },
    (error: unknown) => error,
  );
}

export async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    if (predicate()) {
      return;
    }
    await Promise.resolve();
  }

  throw new Error("Expected condition to become true.");
}

export async function expectNoUnhandled(run: () => Promise<void>): Promise<void> {
  const unhandled: unknown[] = [];
  function listener(reason: unknown): void {
    unhandled.push(reason);
  }
  process.on("unhandledRejection", listener);

  try {
    await run();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(unhandled).toEqual([]);
  } finally {
    process.off("unhandledRejection", listener);
  }
}
