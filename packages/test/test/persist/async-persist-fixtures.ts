import { expect } from "vitest";

export { Deferred, expectNoUnhandled, rejectionOf } from "./async-migration-fixtures.js";

export function expectOperationError(error: unknown, operation: string, key: string): void {
  expect(error).toBeInstanceOf(Error);
  const message = error instanceof Error ? error.message : "";
  expect(message.toLowerCase()).toContain(operation);
  expect(message).toContain(key);
}
