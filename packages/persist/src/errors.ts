const PACKAGE_NAME = "@zhuangtai-js/persist";

export type PersistOperation = "hydrate" | "rehydrate" | "write" | "clear";

export class PersistOperationError extends Error {
  readonly name = "PersistOperationError";

  constructor(
    readonly operation: PersistOperation,
    readonly key: string,
    cause: unknown,
  ) {
    super(`[${PACKAGE_NAME}] Failed to ${operation} the persisted value for key "${key}".`, {
      cause,
    });
  }
}

export class PersistOnErrorCallbackError extends Error {
  readonly name = "PersistOnErrorCallbackError";

  constructor(
    readonly key: string,
    cause: unknown,
  ) {
    super(`[${PACKAGE_NAME}] The onError callback for key "${key}" threw.`, {
      cause,
    });
  }
}

export function createNonErrorCause(cause: unknown): Error {
  return new Error(`[${PACKAGE_NAME}] A persistence callback threw a non-Error value.`, {
    cause,
  });
}
