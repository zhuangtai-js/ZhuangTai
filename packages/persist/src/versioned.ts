import { createNonErrorCause } from "./errors.js";
import { isPromiseLike } from "./storage.js";
import type { MaybePromise, PersistStorage } from "./types.js";

const PACKAGE_NAME = "@zhuangtai-js/persist";

export function assertPersistVersion(version: number, key: string): void {
  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new TypeError(
      `[${PACKAGE_NAME}] Persist version for key "${key}" must be a positive safe integer.`,
    );
  }
}

export function readVersioned(
  storage: PersistStorage,
  key: string,
  version: number,
): MaybePromise<string | null> {
  let readResult: MaybePromise<string | null>;
  try {
    readResult = storage.getItem(key);
  } catch (error) {
    const cause = error instanceof Error ? error : createNonErrorCause(error);
    throw createVersionedReadError(key, version, cause);
  }
  if (!isPromiseLike(readResult)) {
    return readResult;
  }
  return Promise.resolve(readResult).catch((error: unknown) => {
    throw createVersionedReadError(key, version, error);
  });
}

export function writeEncodedVersioned(
  storage: PersistStorage,
  key: string,
  version: number,
  encodedValue: string,
): MaybePromise<void> {
  let writeResult: MaybePromise<void>;
  try {
    writeResult = storage.setItem(key, encodedValue);
  } catch (error) {
    const cause = error instanceof Error ? error : createNonErrorCause(error);
    throw createVersionedWriteError(key, version, cause);
  }
  if (!isPromiseLike(writeResult)) {
    return writeResult;
  }
  return Promise.resolve(writeResult).catch((error: unknown) => {
    throw createVersionedWriteError(key, version, error);
  });
}

function createVersionedReadError(key: string, version: number, cause: unknown): Error {
  return new Error(
    `[${PACKAGE_NAME}] Failed to read the value for key "${key}" at version ${version}.`,
    { cause },
  );
}

function createVersionedWriteError(key: string, version: number, cause: unknown): Error {
  return new Error(
    `[${PACKAGE_NAME}] Failed to write the value for key "${key}" at version ${version}.`,
    { cause },
  );
}
